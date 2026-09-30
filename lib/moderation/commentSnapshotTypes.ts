import type { CommentPublic } from "@/lib/vox/types";

export type ModerationCommentSnapshot = CommentPublic & {
  voxId: string;
  deletedAt: string | null;
};
