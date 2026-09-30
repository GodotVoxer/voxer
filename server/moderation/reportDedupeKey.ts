export const buildReportDedupeKey = (input: {
  voxId: string;
  commentId?: string | null;
}): string => (input.commentId ? `c:${input.commentId}` : `v:${input.voxId}`);
