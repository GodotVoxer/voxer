import { spawn } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { ffmpegBinaryPath } from "@/server/media/stripVideoMetadata";

/** A pathological input must not hold the request until the platform timeout. */
const FFMPEG_TIMEOUT_MS = 30_000;

/** Same hardening as `stripVideoMetadata`: pinned demuxer, local files only. */
const demuxerArgs = (safeExt: string): string[] => [
  "-protocol_whitelist",
  "file",
  "-f",
  safeExt === "webm" ? "matroska" : "mov",
];

class ExtractVideoPosterFrameError extends Error {
  readonly code: "FFMPEG_MISSING" | "FFMPEG_FAILED" | "NO_FRAME";
  constructor(code: ExtractVideoPosterFrameError["code"], message?: string) {
    super(message ?? code);
    this.name = "ExtractVideoPosterFrameError";
    this.code = code;
  }
}

const runFfmpeg = (bin: string, args: string[]): Promise<void> =>
  new Promise((resolve, reject) => {
    const ps = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    const timer = setTimeout(() => ps.kill("SIGKILL"), FFMPEG_TIMEOUT_MS);
    let stderr = "";
    ps.stderr?.on("data", (c: Buffer) => {
      stderr += c.toString();
    });
    ps.on("error", (err) => {
      clearTimeout(timer);
      reject(
        new ExtractVideoPosterFrameError(
          "FFMPEG_FAILED",
          err instanceof Error ? err.message : String(err),
        ),
      );
    });
    ps.on("close", (code, signal) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else if (signal === "SIGKILL") {
        reject(new ExtractVideoPosterFrameError("FFMPEG_FAILED", "ffmpeg superó el tiempo máximo"));
      } else {
        reject(
          new ExtractVideoPosterFrameError(
            "FFMPEG_FAILED",
            stderr.trim().slice(0, 500) || `ffmpeg salió con código ${code ?? "?"}`,
          ),
        );
      }
    });
  });

const parseDurationSec = (stderr: string): number | null => {
  const m = stderr.match(/Duration:\s*(\d+):(\d\d):(\d\d(?:\.\d+)?)/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const sec = Number(m[3]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || !Number.isFinite(sec)) return null;
  return h * 3600 + min * 60 + sec;
};

const probeVideoDurationSeconds = async (inputPath: string, safeExt = "mp4"): Promise<number> => {
  const bin = ffmpegBinaryPath();
  if (!bin) {
    throw new ExtractVideoPosterFrameError("FFMPEG_MISSING");
  }
  return new Promise((resolve, reject) => {
    const ps = spawn(bin, ["-hide_banner", "-nostdin", ...demuxerArgs(safeExt), "-i", inputPath], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    const timer = setTimeout(() => settle(1), FFMPEG_TIMEOUT_MS);
    let stderr = "";
    let settled = false;
    const settle = (d: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ps.kill("SIGKILL");
      } catch {
        /* process already exited */
      }
      const out = Number.isFinite(d) && d > 0 ? d : 1;
      resolve(out);
    };
    ps.stderr?.on("data", (c: Buffer) => {
      stderr += c.toString();
      const d = parseDurationSec(stderr);
      if (d != null) settle(d);
    });
    ps.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(
        err instanceof Error ? err : new ExtractVideoPosterFrameError("FFMPEG_FAILED", String(err)),
      );
    });
    ps.on("close", () => {
      if (settled) return;
      const d = parseDurationSec(stderr);
      settle(d ?? 1);
    });
  });
};

/** PNG of a frame around 5% or 0.5 s into the video. */
export const extractVideoPosterPngBuffer = async (
  videoBuffer: Buffer,
  originalExt: string,
): Promise<Buffer> => {
  const bin = ffmpegBinaryPath();
  if (!bin) {
    throw new ExtractVideoPosterFrameError("FFMPEG_MISSING");
  }
  const safeExt = originalExt.toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
  const dir = await mkdtemp(path.join(tmpdir(), "vox-poster-"));
  const inPath = path.join(dir, `in.${safeExt}`);
  const outPng = path.join(dir, "frame.png");
  try {
    await writeFile(inPath, videoBuffer);
    const duration = await probeVideoDurationSeconds(inPath, safeExt);
    const seek = Math.min(0.5, Math.max(0.05, duration * 0.05));
    const seekSafe = Math.min(seek, Math.max(0, duration - 0.02));
    await runFfmpeg(bin, [
      "-hide_banner",
      "-loglevel",
      "error",
      "-nostdin",
      ...demuxerArgs(safeExt),
      "-ss",
      String(seekSafe),
      "-i",
      inPath,
      "-frames:v",
      "1",
      "-y",
      outPng,
    ]);
    const png = await readFile(outPng);
    if (png.byteLength < 32) {
      throw new ExtractVideoPosterFrameError("NO_FRAME");
    }
    return png;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
};
