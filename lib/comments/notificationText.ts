import { normalizeCommentBody } from "@/lib/comments/normalizeCommentBody";
import { COMMENT_REPLY_TOKEN_RE } from "@/lib/comments/replies";
import { truncateSingleLine } from "@/lib/format/truncate";

export type CommentTextSource = {
  body: string;
  imageUrl: string | null;
  videoUrl: string | null;
  animatedImage: boolean;
};

const REPLY_TOKEN_WITH_GAP_RE = new RegExp(`${COMMENT_REPLY_TOKEN_RE.source}[ \\t]*`, "g");
// Everything but the line break: a notification renders raw text, and JSON escapes these six bytes each.
const CONTROL_CHARS_RE = /[\u0000-\u0009\u000b-\u001f\u007f]/g;

const mediaLabel = (c: CommentTextSource): string | null => {
  if (c.videoUrl) return c.animatedImage ? "GIF" : "Video";
  return c.imageUrl ? "Imagen" : null;
};

/**
 * What a notification shows of a comment: its text without the `>>TAG` tokens, which mean nothing
 * outside the thread. Never empty, because a notification without a body is dropped by the clients.
 */
export const commentNotificationText = (c: CommentTextSource): string => {
  const text = normalizeCommentBody(
    c.body.replace(REPLY_TOKEN_WITH_GAP_RE, "").replace(CONTROL_CHARS_RE, " "),
  );
  return text || mediaLabel(c) || "Sin texto";
};

export const commentNotificationLine = (c: CommentTextSource, maxChars: number): string =>
  truncateSingleLine(commentNotificationText(c), maxChars);
