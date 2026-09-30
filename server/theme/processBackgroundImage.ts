import sharp from "sharp";
import { sha256HexFromBuffer } from "@/server/media/sha256Hex";
import {
  THEME_BG_FULL_SIDE_PX,
  THEME_BG_INPUT_MAX_SIDE_PX,
  THEME_BG_INPUT_PIXELS_MAX,
  THEME_BG_OUTPUT_MAX_BYTES,
  THEME_BG_SMALL_SIDE_PX,
} from "@/lib/theme/themeBackgroundLimits";

export type ThemeBackgroundImageErrorCode =
  | "UNREADABLE"
  | "UNSUPPORTED_FORMAT"
  | "DIMENSIONS"
  | "OUTPUT_TOO_LARGE";

export class ThemeBackgroundImageError extends Error {
  readonly code: ThemeBackgroundImageErrorCode;
  constructor(code: ThemeBackgroundImageErrorCode) {
    super(code);
    this.name = "ThemeBackgroundImageError";
    this.code = code;
  }
}

export type ProcessedBackgroundImage = {
  full: Buffer;
  small: Buffer;
  width: number;
  height: number;
  /** Hash of the final WebP (per-user dedupe). */
  sha256Hex: string;
  /** Hash of the original bytes: the moderation block list may hold either. */
  sourceSha256Hex: string;
};

/** Detected from content, never from the client's MIME or extension. */
const ACCEPTED_FORMATS: ReadonlySet<string> = new Set(["jpeg", "png", "webp"]);

const open = (input: Buffer) =>
  sharp(input, { limitInputPixels: THEME_BG_INPUT_PIXELS_MAX, failOn: "error", animated: false });

const encodeWebp = (input: Buffer, maxSide: number, quality: number) =>
  open(input)
    .rotate()
    .toColorspace("srgb")
    .resize(maxSide, maxSide, { fit: "inside", withoutEnlargement: true })
    .webp({ quality })
    .toBuffer({ resolveWithObject: true });

/**
 * Fails closed: detects the format from the bytes, rejects excessive dimensions or pixels before
 * decoding, and re-encodes to sRGB WebP (Sharp drops EXIF/XMP/ICC and any appended bytes).
 */
export const processBackgroundImage = async (input: Buffer): Promise<ProcessedBackgroundImage> => {
  let metadata: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    // Header only (no pixel decode), uncapped so DIMENSIONS can be reported; the decode is capped.
    metadata = await sharp(input, { limitInputPixels: false, failOn: "error" }).metadata();
  } catch {
    throw new ThemeBackgroundImageError("UNREADABLE");
  }
  if (!metadata.format || !ACCEPTED_FORMATS.has(metadata.format)) {
    throw new ThemeBackgroundImageError("UNSUPPORTED_FORMAT");
  }
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (
    width < 1 ||
    height < 1 ||
    width > THEME_BG_INPUT_MAX_SIDE_PX ||
    height > THEME_BG_INPUT_MAX_SIDE_PX ||
    width * height > THEME_BG_INPUT_PIXELS_MAX
  ) {
    throw new ThemeBackgroundImageError("DIMENSIONS");
  }
  try {
    let full = await encodeWebp(input, THEME_BG_FULL_SIDE_PX, 80);
    if (full.data.length > THEME_BG_OUTPUT_MAX_BYTES) {
      full = await encodeWebp(input, THEME_BG_FULL_SIDE_PX, 64);
    }
    if (full.data.length > THEME_BG_OUTPUT_MAX_BYTES) {
      throw new ThemeBackgroundImageError("OUTPUT_TOO_LARGE");
    }
    const small = await encodeWebp(input, THEME_BG_SMALL_SIDE_PX, 76);
    return {
      full: full.data,
      small: small.data,
      width: full.info.width,
      height: full.info.height,
      sha256Hex: sha256HexFromBuffer(full.data),
      sourceSha256Hex: sha256HexFromBuffer(input),
    };
  } catch (error) {
    if (error instanceof ThemeBackgroundImageError) throw error;
    throw new ThemeBackgroundImageError("UNREADABLE");
  }
};
