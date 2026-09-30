import type { MediaType } from "@/lib/vox/types";

export const mediaTypeForVoxFormPreview = (input: {
  isYoutube: boolean;
  isLocalVideo: boolean;
}): MediaType => {
  if (input.isYoutube) return "YOUTUBE";
  if (input.isLocalVideo) return "UPLOADED_VIDEO";
  return "IMAGE";
};
