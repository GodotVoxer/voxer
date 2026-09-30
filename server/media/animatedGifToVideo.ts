import { spawn } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { ffmpegBinaryPath } from "@/server/media/stripVideoMetadata";

/**
 * Animated GIFs are stored as MP4. Re-encoding a GIF with libvips costs over an order of magnitude
 * more CPU than H.264 and usually yields a bigger file. The UI plays it muted and looped without
 * controls, so viewers still see a GIF. Fails closed like `stripVideoMetadataBuffer`: the original
 * GIF is never stored as a fallback.
 */
class AnimatedGifConvertError extends Error {
  readonly code: "FFMPEG_MISSING" | "FFMPEG_FAILED";
  constructor(code: AnimatedGifConvertError["code"], message?: string) {
    super(message ?? code);
    this.name = "AnimatedGifConvertError";
    this.code = code;
  }
}

const FFMPEG_TIMEOUT_MS = 60_000;

const GIF_MAGIC_87 = Buffer.from("GIF87a", "latin1");
const GIF_MAGIC_89 = Buffer.from("GIF89a", "latin1");

/** The type is client-declared; without this a text file reaches the demuxer. */
export const looksLikeGif = (buffer: Buffer): boolean => {
  if (buffer.length < 6) return false;
  const head = buffer.subarray(0, 6);
  return head.equals(GIF_MAGIC_87) || head.equals(GIF_MAGIC_89);
};

export const buildGifToMp4FfmpegArgs = (inputPath: string, outputPath: string): string[] => [
  "-hide_banner",
  "-loglevel",
  "error",
  "-nostdin",
  // Fixed demuxer and local files only: without it a `.mp4` that is really an HLS playlist makes
  // ffmpeg read other files on the server and publish them.
  "-protocol_whitelist",
  "file",
  "-f",
  "gif",
  "-i",
  inputPath,
  "-map_metadata",
  "-1",
  "-map_metadata:s",
  "-1",
  "-map_chapters",
  "-1",
  // Without an audio track, autoplay does not depend on any browser's sound policy.
  "-an",
  "-c:v",
  "libx264",
  "-preset",
  "veryfast",
  "-crf",
  "28",
  // H.264 yuv420p needs even dimensions, which many GIFs do not have.
  "-vf",
  "scale=trunc(iw/2)*2:trunc(ih/2)*2",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  "-y",
  outputPath,
];

export const animatedGifToMp4Buffer = async (buffer: Buffer): Promise<Buffer> => {
  const bin = ffmpegBinaryPath();
  if (!bin) throw new AnimatedGifConvertError("FFMPEG_MISSING");
  if (!looksLikeGif(buffer)) {
    throw new AnimatedGifConvertError("FFMPEG_FAILED", "el contenido no es un GIF");
  }
  const dir = await mkdtemp(path.join(tmpdir(), "vox-gif-mp4-"));
  const inPath = path.join(dir, "in.gif");
  const outPath = path.join(dir, "out.mp4");
  try {
    await writeFile(inPath, buffer);
    const args = buildGifToMp4FfmpegArgs(inPath, outPath);
    await new Promise<void>((resolve, reject) => {
      const ps = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
      const timer = setTimeout(() => ps.kill("SIGKILL"), FFMPEG_TIMEOUT_MS);
      let stderr = "";
      ps.stderr?.on("data", (c: Buffer) => {
        stderr += c.toString();
      });
      ps.on("error", (err) => {
        clearTimeout(timer);
        const missing = (err as NodeJS.ErrnoException).code === "ENOENT";
        reject(
          new AnimatedGifConvertError(
            missing ? "FFMPEG_MISSING" : "FFMPEG_FAILED",
            err instanceof Error ? err.message : String(err),
          ),
        );
      });
      ps.on("close", (code, signal) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else if (signal === "SIGKILL") {
          reject(new AnimatedGifConvertError("FFMPEG_FAILED", "ffmpeg superó el tiempo máximo"));
        } else {
          reject(
            new AnimatedGifConvertError(
              "FFMPEG_FAILED",
              stderr.trim().slice(0, 400) || `ffmpeg salió con código ${code ?? "?"}`,
            ),
          );
        }
      });
    });
    return await readFile(outPath);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
};
