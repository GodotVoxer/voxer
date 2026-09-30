import { spawn } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import ffmpegStatic from "ffmpeg-static";
import type { VideoContainer } from "@/lib/media/videoFormat";

export class StripVideoMetadataError extends Error {
  readonly code: "FFMPEG_MISSING" | "FFMPEG_FAILED";
  constructor(code: StripVideoMetadataError["code"], message?: string) {
    super(message ?? code);
    this.name = "StripVideoMetadataError";
    this.code = code;
  }
}

export const VIDEO_METADATA_STRIP_FAILED_ES =
  "No pudimos procesar este video. Probá con otro archivo MP4 o WebM.";

/** `FFMPEG_PATH` wins (e.g. in Docker); otherwise `ffmpeg-static`. */
export const ffmpegBinaryPath = (): string | null => {
  const fromEnv = process.env.FFMPEG_PATH?.trim();
  if (fromEnv) return fromEnv;
  return ffmpegStatic ?? null;
};

/** A pathological input must not hold the request until the platform timeout. */
const FFMPEG_TIMEOUT_MS = 60_000;

/** Boxes a valid MP4/MOV can start with (almost always `ftyp`; old QuickTime uses the rest). */
const ISO_BMFF_FIRST_BOXES = new Set(["ftyp", "moov", "mdat", "free", "skip", "wide", "pnot"]);
const EBML_MAGIC = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);

/** Byte check before ffmpeg: the type is client-declared, and a text file must not reach the demuxer. */
export const looksLikeVideoContainer = (buffer: Buffer, safeExt: VideoContainer): boolean => {
  if (safeExt === "webm") return buffer.subarray(0, 4).equals(EBML_MAGIC);
  if (buffer.length < 8) return false;
  return ISO_BMFF_FIRST_BOXES.has(buffer.subarray(4, 8).toString("latin1"));
};

export const buildStripVideoFfmpegArgs = (
  inputPath: string,
  outputPath: string,
  isWebm: boolean,
): string[] => {
  const base = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-nostdin",
    // Fixed demuxer and local files only: without it a `.mp4` that is really an HLS playlist makes
    // ffmpeg read other files on the server and publish them.
    "-protocol_whitelist",
    "file",
    "-f",
    isWebm ? "matroska" : "mov",
    "-i",
    inputPath,
    "-map_metadata",
    "-1",
    // `-map_metadata -1` only drops global metadata; stream metadata is copied separately.
    "-map_metadata:s",
    "-1",
    "-map_chapters",
    "-1",
    "-codec",
    "copy",
    "-y",
  ];
  if (!isWebm) {
    return [...base, "-movflags", "+faststart", outputPath];
  }
  return [...base, outputPath];
};

/**
 * Remuxes without re-encoding, dropping global, stream and chapter metadata (e.g. GPS). Fails
 * closed: without ffmpeg or on a failed remux it throws and the upload is refused.
 */
export const stripVideoMetadataBuffer = async (
  buffer: Buffer,
  safeExt: VideoContainer,
): Promise<Buffer> => {
  const bin = ffmpegBinaryPath();
  if (!bin) {
    throw new StripVideoMetadataError("FFMPEG_MISSING");
  }
  if (!looksLikeVideoContainer(buffer, safeExt)) {
    throw new StripVideoMetadataError("FFMPEG_FAILED", "el contenido no es MP4/MOV ni WebM");
  }
  const dir = await mkdtemp(path.join(tmpdir(), "vox-vid-meta-"));
  const inPath = path.join(dir, `in.${safeExt}`);
  const outPath = path.join(dir, `out.${safeExt}`);
  try {
    await writeFile(inPath, buffer);
    const args = buildStripVideoFfmpegArgs(inPath, outPath, safeExt === "webm");
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
          new StripVideoMetadataError(
            missing ? "FFMPEG_MISSING" : "FFMPEG_FAILED",
            err instanceof Error ? err.message : String(err),
          ),
        );
      });
      ps.on("close", (code, signal) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else if (signal === "SIGKILL") {
          reject(new StripVideoMetadataError("FFMPEG_FAILED", "ffmpeg superó el tiempo máximo"));
        } else {
          reject(
            new StripVideoMetadataError(
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
