import type { NotificationType, ReportReason } from "@prisma/client";
import { commentNotificationText, type CommentTextSource } from "@/lib/comments/notificationText";
import { truncateSingleLine, truncateWithEllipsis } from "@/lib/format/truncate";
import { isSensitiveVoxCategory } from "@/lib/vox/sensitiveCategories";
import { reportReasonLabelEs } from "@/lib/moderation/reportReasonLabels";
import { buildVoxPanelDetailHref } from "@/lib/notifications/links";

export type VoxerPushKind = "comment" | "report";
type VoxerPushChannel = "comments" | "replies" | "reports";

/** Contract with the Android app, which ignores versions it does not understand. */
export type VoxerPushPayload = {
  v: "1";
  kind: VoxerPushKind;
  channel: VoxerPushChannel;
  title: string;
  /** One line: what a collapsed notification shows. */
  body: string;
  /** The longer text of an expanded notification; absent when `body` already says it all. */
  expandedBody?: string;
  /** Relative path: the app joins it with its own origin and checks the host before navigating. */
  path: string;
  /** Collapses several notifications of the same thread into one row. */
  collapseKey: string;
  thumbnailUrl?: string;
};

const TITLE_BY_TYPE: Record<NotificationType, string> = {
  REPLY_TO_COMMENT: "Te respondieron",
  COMMENT_ON_YOUR_VOX: "Comentaron tu vox",
  COMMENT_ON_FOLLOWED_VOX: "Comentaron un vox que seguís",
};

const TITLE_WITH_VOX_BY_TYPE: Record<NotificationType, (quotedVoxTitle: string) => string> = {
  REPLY_TO_COMMENT: (vox) => `Te respondieron en ${vox}`,
  COMMENT_ON_YOUR_VOX: (vox) => `Comentaron tu vox ${vox}`,
  COMMENT_ON_FOLLOWED_VOX: (vox) => `Nuevo comentario en ${vox}`,
};

const PUSH_VOX_TITLE_MAX = 60;
const PUSH_BODY_MAX = 140;
/**
 * FCM and Web Push cap a message near 4 KB. A UTF-16 unit takes at most 3 bytes in UTF-8, so this
 * leaves room for every other field whatever the alphabet.
 */
const PUSH_EXPANDED_BODY_MAX = 600;

const quoteVoxTitle = (voxTitle: string): string =>
  `«${truncateSingleLine(voxTitle, PUSH_VOX_TITLE_MAX)}»`;

/** `footer` survives the cut: it is the context of a text that may be long. */
const pushTexts = (
  line: string,
  full: string,
  footer = "",
): Pick<VoxerPushPayload, "body" | "expandedBody"> => {
  const body = truncateSingleLine(line, PUSH_BODY_MAX);
  const expandedBody = `${truncateWithEllipsis(full, PUSH_EXPANDED_BODY_MAX - footer.length)}${footer}`;
  return expandedBody === body ? { body } : { body, expandedBody };
};

const commentPushTexts = (comment: CommentTextSource, footer?: string) => {
  const text = commentNotificationText(comment);
  return pushTexts(text, text, footer);
};

export const buildCommentPushPayload = (input: {
  voxId: string;
  voxTitle: string;
  voxCategory: string;
  voxThumbnailUrl: string | null;
  commentPublicTag: string | null;
  comment: CommentTextSource;
  type: NotificationType;
}): VoxerPushPayload => {
  // Shown on the lock screen: sensitive categories hide which vox it is, title and thumbnail.
  const sensitive = isSensitiveVoxCategory(input.voxCategory);
  const anchorUpper = input.commentPublicTag ? input.commentPublicTag.toUpperCase() : null;
  const channel = input.type === "REPLY_TO_COMMENT" ? "replies" : "comments";
  return {
    v: "1",
    kind: "comment",
    channel,
    title: sensitive
      ? TITLE_BY_TYPE[input.type]
      : TITLE_WITH_VOX_BY_TYPE[input.type](quoteVoxTitle(input.voxTitle)),
    ...commentPushTexts(input.comment),
    path: buildVoxPanelDetailHref({ voxId: input.voxId, anchorUpper }),
    collapseKey: `${channel}:vox:${input.voxId}`,
    ...(sensitive || !input.voxThumbnailUrl ? {} : { thumbnailUrl: input.voxThumbnailUrl }),
  };
};

/**
 * Staff only, and in every category: the point is deciding from the notification whether the
 * report needs attention now. Text only; the reported media never travels.
 */
export const buildReportPushPayload = (input: {
  voxId: string;
  voxTitle: string;
  voxDescription: string;
  commentPublicTag: string | null;
  /** The reported comment; null when the report is on the vox itself. */
  comment: CommentTextSource | null;
  reason: ReportReason;
}): VoxerPushPayload => ({
  v: "1",
  kind: "report",
  channel: "reports",
  title: `${input.comment ? "Comentario" : "Vox"} denunciado — ${reportReasonLabelEs(input.reason)}`,
  ...(input.comment
    ? commentPushTexts(input.comment, `\n\nEn ${quoteVoxTitle(input.voxTitle)}`)
    : pushTexts(
        input.voxTitle,
        [input.voxTitle, input.voxDescription.trim()].filter(Boolean).join("\n\n"),
      )),
  path: buildVoxPanelDetailHref(
    {
      voxId: input.voxId,
      anchorUpper: input.commentPublicTag?.toUpperCase() ?? null,
    },
    { markModerationNotificationsRead: true },
  ),
  collapseKey: "reports",
});

export type FcmV1Message = {
  token: string;
  data: Record<string, string>;
  android: { priority: "HIGH"; ttl: string; collapse_key: string };
};

const TTL_SECONDS_BY_KIND: Record<VoxerPushKind, number> = {
  comment: 43200,
  report: 86400,
};

export const pushTtlSeconds = (kind: VoxerPushKind): number => TTL_SECONDS_BY_KIND[kind];

/** What the Android app reads, whichever transport carries it. FCM requires every value to be a string. */
const buildAndroidPushData = (p: VoxerPushPayload): Record<string, string> => ({
  v: p.v,
  kind: p.kind,
  channel: p.channel,
  title: p.title,
  body: p.body,
  ...(p.expandedBody ? { expandedBody: p.expandedBody } : {}),
  path: p.path,
  collapseKey: p.collapseKey,
  ...(p.thumbnailUrl ? { thumbnailUrl: p.thumbnailUrl } : {}),
});

/**
 * Data-only on purpose: without a `notification` key Android never draws the row itself and
 * `onMessageReceived` also runs in the background, so the app controls channel, grouping and text.
 */
export const buildFcmV1Message = (token: string, p: VoxerPushPayload): FcmV1Message => ({
  token,
  data: buildAndroidPushData(p),
  android: {
    priority: "HIGH",
    ttl: `${pushTtlSeconds(p.kind)}s`,
    collapse_key: p.collapseKey,
  },
});

/** The F-Droid app receives the FCM data map as JSON, encrypted like any Web Push message. */
export const buildUnifiedPushData = (p: VoxerPushPayload): string =>
  JSON.stringify(buildAndroidPushData(p));

/**
 * Read by `public/push-sw.js`; end-to-end encrypted (RFC 8291), the push service cannot read it.
 * A web notification has a single body, which the system cuts and expands on its own.
 */
export const buildWebPushData = (p: VoxerPushPayload): string =>
  JSON.stringify({
    v: p.v,
    kind: p.kind,
    title: p.title,
    body: p.expandedBody ?? p.body,
    path: p.path,
    tag: p.collapseKey,
    ...(p.thumbnailUrl ? { image: p.thumbnailUrl } : {}),
  });
