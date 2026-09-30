import type { NotificationType, ReportReason } from "@prisma/client";
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
  body: string;
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

const PUSH_TITLE_MAX = 60;

const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

export const buildCommentPushPayload = (input: {
  voxId: string;
  voxTitle: string;
  voxCategory: string;
  voxThumbnailUrl: string | null;
  commentPublicTag: string | null;
  type: NotificationType;
}): VoxerPushPayload => {
  // Shown on the lock screen: sensitive categories hide the vox title, not only the thumbnail.
  const sensitive = isSensitiveVoxCategory(input.voxCategory);
  const anchorUpper = input.commentPublicTag ? input.commentPublicTag.toUpperCase() : null;
  const channel = input.type === "REPLY_TO_COMMENT" ? "replies" : "comments";
  return {
    v: "1",
    kind: "comment",
    channel,
    title: TITLE_BY_TYPE[input.type],
    body: sensitive
      ? "Abrí la app para verlo."
      : `En «${truncate(input.voxTitle, PUSH_TITLE_MAX)}»`,
    path: buildVoxPanelDetailHref({ voxId: input.voxId, anchorUpper }),
    collapseKey: `${channel}:vox:${input.voxId}`,
    ...(sensitive || !input.voxThumbnailUrl ? {} : { thumbnailUrl: input.voxThumbnailUrl }),
  };
};

export const buildReportPushPayload = (input: {
  voxId: string;
  commentPublicTag: string | null;
  reason: ReportReason;
  hasComment: boolean;
}): VoxerPushPayload => ({
  v: "1",
  kind: "report",
  channel: "reports",
  title: "Nueva denuncia",
  body: `${input.hasComment ? "Comentario" : "Vox"} denunciado — ${reportReasonLabelEs(input.reason)}`,
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

/** Read by `public/push-sw.js`; end-to-end encrypted (RFC 8291), the push service cannot read it. */
export const buildWebPushData = (p: VoxerPushPayload): string =>
  JSON.stringify({
    v: p.v,
    kind: p.kind,
    title: p.title,
    body: p.body,
    path: p.path,
    tag: p.collapseKey,
    ...(p.thumbnailUrl ? { image: p.thumbnailUrl } : {}),
  });
