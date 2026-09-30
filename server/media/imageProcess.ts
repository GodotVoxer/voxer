import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp, { type SharpOptions } from "sharp";
import { animatedGifToMp4Buffer } from "@/server/media/animatedGifToVideo";
import {
  UPLOAD_ANIMATION_MAX_FRAME_PIXELS,
  UPLOAD_ANIMATION_MAX_FRAMES,
  UPLOAD_ANIMATION_MAX_INPUT_PIXELS,
  UPLOAD_IMAGE_MAX_INPUT_PIXELS,
  UPLOAD_IMAGE_MAX_SIDE_PX,
  UPLOAD_IMAGE_REJECT_IF_SIDE_GT_PX,
  type ImageLimitReason,
} from "@/lib/media/uploadLimits";
import { isR2StorageFullyConfigured } from "@/server/storage/r2Env";
import { r2KeyForPublicUrl, r2PublicUrlForKey } from "@/lib/media/publicStorage";
import {
  R2_IMMUTABLE_CACHE_CONTROL,
  deleteR2ObjectByKey,
  putR2ObjectBuffer,
} from "@/server/storage/r2Storage";
import { videoContainerOf, videoMimeOf } from "@/lib/media/videoFormat";
const THUMB_MAX_WIDTH = 480;
const WEBP_QUALITY = 82;
export type SavedUpload = {
  mediaUrl: string;
  thumbnailUrl: string;
};
export class ImageDimensionLimitError extends Error {
  readonly reason: ImageLimitReason;
  constructor(reason: ImageLimitReason = "dimensions") {
    super("IMAGE_DIMENSION_LIMIT");
    this.name = "ImageDimensionLimitError";
    this.reason = reason;
  }
}
type SharpMetadata = Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;

/**
 * Checked on the header (`metadata()` does not decode) before any pixel memory is reserved.
 * `meta.height` is one frame's height: animations multiply by `pages`.
 */
const assertImageWithinDecodeLimits = (meta: SharpMetadata): void => {
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w > UPLOAD_IMAGE_REJECT_IF_SIDE_GT_PX || h > UPLOAD_IMAGE_REJECT_IF_SIDE_GT_PX) {
    throw new ImageDimensionLimitError("dimensions");
  }
  const frames = Math.max(1, meta.pages ?? 1);
  if (frames === 1) {
    if (w * h > UPLOAD_IMAGE_MAX_INPUT_PIXELS) throw new ImageDimensionLimitError("dimensions");
    return;
  }
  // The canvas is the dangerous part, and the only thing a user can shrink by cropping.
  if (w * h > UPLOAD_ANIMATION_MAX_FRAME_PIXELS) throw new ImageDimensionLimitError("dimensions");
  if (frames > UPLOAD_ANIMATION_MAX_FRAMES) throw new ImageDimensionLimitError("animation");
  if (w * h * frames > UPLOAD_ANIMATION_MAX_INPUT_PIXELS) {
    throw new ImageDimensionLimitError("animation");
  }
};

/**
 * Second barrier inside libvips in case the header lies. With `animated` libvips loads every frame
 * as one tall strip, so the limit must be the animation one.
 */
const decodeImage = (buffer: Buffer, opts: SharpOptions = {}) =>
  sharp(buffer, {
    limitInputPixels: opts.animated
      ? UPLOAD_ANIMATION_MAX_INPUT_PIXELS
      : UPLOAD_IMAGE_MAX_INPUT_PIXELS,
    ...opts,
  });

const buildImageThumbnailWebpBuffer = async (buffer: Buffer): Promise<Buffer> => {
  const meta = await sharp(buffer).metadata();
  assertImageWithinDecodeLimits(meta);
  const isGif = meta.format === "gif";
  const pipeline = isGif ? decodeImage(buffer, { animated: true, pages: 1 }) : decodeImage(buffer);
  return pipeline
    .rotate()
    .resize(THUMB_MAX_WIDTH, null, { withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
};

const uploadsDir = (...segments: string[]): string => {
  return path.join(process.cwd(), "public", "uploads", ...segments);
};
const ymdParts = (): { y: string; m: string; rel: string } => {
  const y = String(new Date().getUTCFullYear());
  const m = String(new Date().getUTCMonth() + 1).padStart(2, "0");
  return { y, m, rel: `/${y}/${m}` };
};
const normalizeImageExt = (originalExt: string): "jpg" | "png" | "webp" | "gif" => {
  const e = originalExt.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  if (e === "jpeg" || e === "jpg") return "jpg";
  if (e === "png") return "png";
  if (e === "webp") return "webp";
  if (e === "gif") return "gif";
  return "jpg";
};
export type PreparedImage = {
  fullBuffer: Buffer;
  thumbBuffer: Buffer;
  fileExt: "jpg" | "png" | "webp" | "gif" | "mp4";
  fullContentType: string;
  /**
   * The stored file is a video that behaves as an image: an animated GIF played looped, muted and
   * without controls. Clients need it to pick the player.
   */
  animatedImage: boolean;
};

/** Always re-encodes with Sharp, which drops EXIF/XMP: no GPS or device data is ever published. */
export const prepareImageBuffers = async (
  buffer: Buffer,
  originalExt: string,
): Promise<PreparedImage> => {
  let fileExt = normalizeImageExt(originalExt);
  const meta = await sharp(buffer).metadata();
  if (meta.format === "gif") {
    fileExt = "gif";
  }
  assertImageWithinDecodeLimits(meta);
  const resizeOpts = {
    fit: "inside" as const,
    withoutEnlargement: true,
  };
  let fullBuffer: Buffer;
  let fullContentType: string;
  if (fileExt === "png") {
    const resized = decodeImage(buffer)
      .rotate()
      .resize(UPLOAD_IMAGE_MAX_SIDE_PX, UPLOAD_IMAGE_MAX_SIDE_PX, resizeOpts);
    fullBuffer = await resized.png({ compressionLevel: 6 }).toBuffer();
    fullContentType = "image/png";
  } else if (fileExt === "webp") {
    const resized = decodeImage(buffer)
      .rotate()
      .resize(UPLOAD_IMAGE_MAX_SIDE_PX, UPLOAD_IMAGE_MAX_SIDE_PX, resizeOpts);
    fullBuffer = await resized.webp({ quality: WEBP_QUALITY }).toBuffer();
    fullContentType = "image/webp";
  } else if (fileExt === "gif") {
    const frames = Math.max(1, meta.pages ?? 1);
    const thumbBuffer = await buildImageThumbnailWebpBuffer(buffer);
    if (frames > 1) {
      // See `animatedGifToVideo.ts`. The thumbnail still comes from the first frame via Sharp.
      const mp4Buffer = await animatedGifToMp4Buffer(buffer);
      return {
        fullBuffer: mp4Buffer,
        thumbBuffer,
        fileExt: "mp4",
        fullContentType: "video/mp4",
        animatedImage: true,
      };
    }
    // A single-frame GIF is a still image: it gains nothing as a video.
    const gifBuffer = await decodeImage(buffer, { animated: true }).gif().toBuffer();
    return {
      fullBuffer: gifBuffer,
      thumbBuffer,
      fileExt,
      fullContentType: "image/gif",
      animatedImage: false,
    };
  } else {
    const resized = decodeImage(buffer)
      .rotate()
      .resize(UPLOAD_IMAGE_MAX_SIDE_PX, UPLOAD_IMAGE_MAX_SIDE_PX, resizeOpts);
    fullBuffer = await resized.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    fullContentType = "image/jpeg";
  }
  const thumbBuffer = await buildImageThumbnailWebpBuffer(fullBuffer);
  return { fullBuffer, thumbBuffer, fileExt, fullContentType, animatedImage: false };
};

const thumbPathnameBeside = (mainPathname: string): string => {
  const dot = mainPathname.lastIndexOf(".");
  return dot >= 0 ? `${mainPathname.slice(0, dot)}.thumb.webp` : `${mainPathname}.thumb.webp`;
};

const putImagePairToBlob = async (prepared: PreparedImage, id: string): Promise<SavedUpload> => {
  const { y, m } = ymdParts();
  const ext = prepared.fileExt === "jpg" ? "jpg" : prepared.fileExt;
  const mainPathname = `uploads/${y}/${m}/${id}.${ext}`;
  const thumbPathname = thumbPathnameBeside(mainPathname);
  await Promise.all([
    putR2ObjectBuffer({
      key: mainPathname,
      body: prepared.fullBuffer,
      contentType: prepared.fullContentType,
      cacheControl: R2_IMMUTABLE_CACHE_CONTROL,
    }),
    putR2ObjectBuffer({
      key: thumbPathname,
      body: prepared.thumbBuffer,
      contentType: "image/webp",
      cacheControl: R2_IMMUTABLE_CACHE_CONTROL,
    }),
  ]);
  return {
    mediaUrl: r2PublicUrlForKey(mainPathname),
    thumbnailUrl: r2PublicUrlForKey(thumbPathname),
  };
};
const putVideoToBlob = async (
  buffer: Buffer,
  safeExt: string,
  id: string,
): Promise<SavedUpload> => {
  const { y, m } = ymdParts();
  const pathname = `uploads/${y}/${m}/${id}.${safeExt}`;
  const contentType = videoMimeOf(videoContainerOf(safeExt));
  await putR2ObjectBuffer({
    key: pathname,
    body: buffer,
    contentType,
    cacheControl: R2_IMMUTABLE_CACHE_CONTROL,
  });
  return {
    mediaUrl: r2PublicUrlForKey(pathname),
    thumbnailUrl: "/video-thumb.svg",
  };
};
export const persistPreparedImagePair = async (prepared: PreparedImage): Promise<SavedUpload> => {
  const id = crypto.randomUUID();
  if (isR2StorageFullyConfigured()) {
    return putImagePairToBlob(prepared, id);
  }
  const { y, m, rel } = ymdParts();
  const dir = uploadsDir(y, m);
  await mkdir(dir, { recursive: true });
  const ext = prepared.fileExt === "jpg" ? "jpg" : prepared.fileExt;
  const fullName = `${id}.${ext}`;
  const fullDisk = path.join(dir, fullName);
  await writeFile(fullDisk, prepared.fullBuffer);
  const thumbName = `${id}.thumb.webp`;
  const thumbDisk = path.join(dir, thumbName);
  await writeFile(thumbDisk, prepared.thumbBuffer);
  return {
    mediaUrl: `/uploads${rel}/${fullName}`,
    thumbnailUrl: `/uploads${rel}/${thumbName}`,
  };
};

export const saveImageWithThumb = async (
  buffer: Buffer,
  originalExt: string,
): Promise<SavedUpload> => {
  const prepared = await prepareImageBuffers(buffer, originalExt);
  return persistPreparedImagePair(prepared);
};
/** A video poster is a single WebP: the frame comes from ffmpeg, so there are no user bytes to keep. */
export const saveVideoPosterWebp = async (framePng: Buffer): Promise<string> => {
  const webp = await buildImageThumbnailWebpBuffer(framePng);
  const id = crypto.randomUUID();
  const { y, m, rel } = ymdParts();
  const name = `${id}.poster.webp`;
  if (isR2StorageFullyConfigured()) {
    const key = `uploads/${y}/${m}/${name}`;
    await putR2ObjectBuffer({
      key,
      body: webp,
      contentType: "image/webp",
      cacheControl: R2_IMMUTABLE_CACHE_CONTROL,
    });
    return r2PublicUrlForKey(key);
  }
  const dir = uploadsDir(y, m);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), webp);
  return `/uploads${rel}/${name}`;
};

export const savePreparedStrippedVideo = async (
  stripped: Buffer,
  originalExt: string,
): Promise<SavedUpload> => {
  const id = crypto.randomUUID();
  const safeExt = originalExt.toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
  if (isR2StorageFullyConfigured()) {
    return putVideoToBlob(stripped, safeExt, id);
  }
  const { y, m, rel } = ymdParts();
  const dir = uploadsDir(y, m);
  await mkdir(dir, { recursive: true });
  const fullName = `${id}.${safeExt}`;
  const fullDisk = path.join(dir, fullName);
  await writeFile(fullDisk, stripped);
  return {
    mediaUrl: `/uploads${rel}/${fullName}`,
    thumbnailUrl: "/video-thumb.svg",
  };
};

/** Undoes an R2 save whose database record failed (best-effort; local URLs are ignored). */
export const discardSavedR2Upload = async (saved: SavedUpload): Promise<void> => {
  const keys = [saved.mediaUrl, saved.thumbnailUrl]
    .map(r2KeyForPublicUrl)
    .filter((k): k is string => k !== null);
  await Promise.allSettled(keys.map(deleteR2ObjectByKey));
};
