import {
  UPLOAD_MAX_IMAGE_BYTES,
  UPLOAD_MAX_VIDEO_BYTES,
  uploadMaxImageMb,
  uploadMaxVideoMb,
} from "@/lib/media/uploadLimits";
import { voxUploadExtensionLower } from "@/features/media/uploadClientFiles";

const fileLooksLikeVideo = (file: File): boolean => {
  const m = (file.type || "").toLowerCase();
  if (m.startsWith("video/")) return true;
  const e = voxUploadExtensionLower(file.name || "");
  return e === "mp4" || e === "webm";
};

const fileLooksLikeImage = (file: File): boolean => {
  const m = (file.type || "").toLowerCase();
  if (m.startsWith("image/")) return true;
  const e = voxUploadExtensionLower(file.name || "");
  return e === "jpg" || e === "jpeg" || e === "png" || e === "webp" || e === "gif";
};

/** Synchronous size check before calling `/api/upload`. */
export const clientUploadSizeRejectionMessage = (file: File): string | null => {
  if (fileLooksLikeVideo(file)) {
    if (file.size > UPLOAD_MAX_VIDEO_BYTES) {
      return `El video supera ${uploadMaxVideoMb()} MB. Elegí un archivo más chico.`;
    }
    return null;
  }
  if (fileLooksLikeImage(file)) {
    if (file.size > UPLOAD_MAX_IMAGE_BYTES) {
      return `La imagen supera ${uploadMaxImageMb()} MB. Elegí un archivo más chico.`;
    }
    return null;
  }
  return null;
};
