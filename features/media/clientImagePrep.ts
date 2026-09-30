import {
  CLIENT_IMAGE_SKIP_PROCESS_MAX_BYTES,
  CLIENT_IMAGE_UPLOAD_MAX_SIDE_PX,
} from "@/lib/media/uploadLimits";

/** Fit-inside scaling to a maximum side, never upscaling. */
export const scaleToFitMaxSide = (
  width: number,
  height: number,
  maxSide: number,
): { width: number; height: number } => {
  const m = Math.max(width, height);
  if (m <= maxSide) return { width, height };
  const r = maxSide / m;
  return {
    width: Math.max(1, Math.round(width * r)),
    height: Math.max(1, Math.round(height * r)),
  };
};

export const shouldSkipMimeForClientImagePrep = (mime: string): boolean => {
  const m = mime.toLowerCase();
  if (!m.startsWith("image/")) return true;
  if (m === "image/gif") return true;
  return false;
};

const canEncodeWebp = (canvas: HTMLCanvasElement): boolean => {
  try {
    const d = canvas.toDataURL("image/webp", 0.5);
    return d.startsWith("data:image/webp");
  } catch {
    return false;
  }
};

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> =>
  new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), type, quality);
  });

/** Shrinks pixels and weight in the browser before upload; animated GIFs and environments without canvas are untouched. */
export const prepareClientImageFileForUpload = async (file: File): Promise<File> => {
  const mime = file.type || "application/octet-stream";
  if (typeof document === "undefined" || typeof createImageBitmap === "undefined") {
    return file;
  }
  if (shouldSkipMimeForClientImagePrep(mime)) return file;

  let bmp: ImageBitmap | null = null;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const w0 = bmp.width;
    const h0 = bmp.height;
    const largeSides = Math.max(w0, h0) > CLIENT_IMAGE_UPLOAD_MAX_SIDE_PX;
    const largeFile = file.size > CLIENT_IMAGE_SKIP_PROCESS_MAX_BYTES;
    if (!largeSides && !largeFile) {
      bmp.close();
      return file;
    }

    const { width: w, height: h } = scaleToFitMaxSide(w0, h0, CLIENT_IMAGE_UPLOAD_MAX_SIDE_PX);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bmp.close();
      return file;
    }
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    bmp = null;

    const outMime = canEncodeWebp(canvas) ? "image/webp" : "image/jpeg";
    const quality = outMime === "image/webp" ? 0.82 : 0.88;
    const blob = await canvasToBlob(canvas, outMime, quality);
    if (!blob) return file;
    if (blob.size >= file.size) return file;

    const ext = outMime === "image/webp" ? "webp" : "jpg";
    const base = file.name.replace(/\.[^/.]+$/, "") || "upload";
    return new File([blob], `${base}.${ext}`, { type: outMime, lastModified: Date.now() });
  } catch {
    if (bmp) bmp.close();
    return file;
  }
};
