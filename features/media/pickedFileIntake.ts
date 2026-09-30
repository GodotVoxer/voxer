import { readFileBytes } from "@/features/media/readFileBytes";
import { clientUploadSizeRejectionMessage } from "@/features/media/uploadClientGuard";
import { isAcceptedVoxUploadFile } from "@/features/media/uploadClientFiles";

export const UNSUPPORTED_UPLOAD_FORMAT_ES =
  "Formato no admitido. Usá JPG, PNG, WebP, GIF, MP4 o WebM.";

export type PickedFileIntake = { ok: true; file: File } | { ok: false; message: string };

/**
 * Validates format and size and, when possible, reads the file into memory. Reading is best-effort on
 * purpose: owning the bytes avoids re-reading a stale reference later, but some files cannot be read
 * whole in JavaScript yet still upload fine because `fetch` streams them from disk.
 */
export const intakePickedFile = async (file: File): Promise<PickedFileIntake> => {
  if (!isAcceptedVoxUploadFile(file)) {
    return { ok: false, message: UNSUPPORTED_UPLOAD_FORMAT_ES };
  }
  const sizeError = clientUploadSizeRejectionMessage(file);
  if (sizeError) return { ok: false, message: sizeError };

  try {
    const bytes = await readFileBytes(file);
    return {
      ok: true,
      file: new File([bytes], file.name, { type: file.type, lastModified: file.lastModified }),
    };
  } catch {
    return { ok: true, file };
  }
};
