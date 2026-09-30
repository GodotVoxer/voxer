import { HOSTING_MULTIPART_BODY_SAFE_MAX_BYTES } from "@/lib/media/uploadLimits";

export const HOSTING_MULTIPART_LIMIT_EXCEEDED_MESSAGE =
  "No pudimos subir este archivo. Probá con uno más liviano o reintentá más tarde.";

export const assertFitsHostingMultipartBodyLimit = (sizeBytes: number): void => {
  if (sizeBytes > HOSTING_MULTIPART_BODY_SAFE_MAX_BYTES) {
    throw new Error(HOSTING_MULTIPART_LIMIT_EXCEEDED_MESSAGE);
  }
};
