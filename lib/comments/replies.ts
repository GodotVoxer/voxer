import { COMMENT_REPLY_TAGS_MAX } from "@/lib/limits";
/** Group 1 is `>>` plus the tag (for `split` and rendering in `CommentBody`). */
export const COMMENT_REPLY_TOKEN_RE = /(>>[A-Z0-9]{8})/g;
const TAG_ONLY_RE = />>([A-Z0-9]{8})/g;
export const extractDistinctReplyTagsInOrder = (body: string): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  const re = new RegExp(TAG_ONLY_RE.source, "g");
  for (const m of body.matchAll(re)) {
    const t = m[1]!;
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
};
export type ReplyTagsError =
  | {
      kind: "too_many";
      max: number;
    }
  | {
      kind: "unknown_target";
      tag: string;
    };
/** Only the distinct `>>TAG` cap, for clients that do not have the full thread. */
export const validateCommentReplyTagCountOnly = (newBody: string): ReplyTagsError | null => {
  const tags = extractDistinctReplyTagsInOrder(newBody);
  if (tags.length > COMMENT_REPLY_TAGS_MAX) {
    return { kind: "too_many", max: COMMENT_REPLY_TAGS_MAX };
  }
  return null;
};
export const validateCommentReplyTags = (arg: {
  newBody: string;
  existingPublicTagsUpper: ReadonlySet<string>;
}): ReplyTagsError | null => {
  const tags = extractDistinctReplyTagsInOrder(arg.newBody);
  if (tags.length > COMMENT_REPLY_TAGS_MAX) {
    return { kind: "too_many", max: COMMENT_REPLY_TAGS_MAX };
  }
  for (const t of tags) {
    const u = t.toUpperCase();
    if (!arg.existingPublicTagsUpper.has(u)) {
      return { kind: "unknown_target", tag: t };
    }
  }
  return null;
};
export const replyTagsErrorMessageEs = (err: ReplyTagsError): string => {
  if (err.kind === "too_many") {
    return `Como máximo ${err.max} respuestas (>>TAG) por comentario.`;
  }
  return `El tag >>${err.tag} no corresponde a ningún comentario de este hilo.`;
};
export const isDraftOnlyReplyTags = (body: string): boolean => {
  return body.replace(COMMENT_REPLY_TOKEN_RE, "").replace(/\s/g, "").length === 0;
};
export const appendReplyTagToDraft = (
  body: string,
  tagUpper: string,
  maxDistinct: number = COMMENT_REPLY_TAGS_MAX,
): string => {
  const u = tagUpper.toUpperCase();
  const existing = extractDistinctReplyTagsInOrder(body).map((t) => t.toUpperCase());
  if (existing.includes(u)) return body;
  if (existing.length >= maxDistinct) return body;
  const token = `>>${u}`;
  if (body.trim().length === 0) {
    return `${token}\n`;
  }
  if (isDraftOnlyReplyTags(body)) {
    const core = body.replace(/\s+$/, "");
    const gap = core.length === 0 ? "" : core.endsWith("\n") ? "" : "\n";
    return `${core}${gap}${token}\n`;
  }
  const core = body.replace(/\s+$/, "");
  return `${core}\n${token}\n`;
};
