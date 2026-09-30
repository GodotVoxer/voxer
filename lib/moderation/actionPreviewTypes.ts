import type { MediaType } from "@/lib/vox/types";
import type { ModerationCommentSnapshot } from "@/lib/moderation/commentSnapshotTypes";

export type ModerationVoxSnapshot = {
  id: string;
  title: string;
  description: string;
  category: string;
  mediaType: MediaType;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  animatedImage: boolean;
  youtubeVideoId: string | null;
  createdAt: string;
};
export type ModerationPublicationPreview =
  | { kind: "vox"; id: string; vox: ModerationVoxSnapshot | null }
  | { kind: "comment"; id: string; comment: ModerationCommentSnapshot | null };
export type ModerationActionPreviewPage = {
  items: ModerationPublicationPreview[];
  nextOffset: number | null;
  total: number;
};
