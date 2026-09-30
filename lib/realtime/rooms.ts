export const FEED_HOME_ROOM = "feed:home";
export const PRESENCE_GLOBAL_ROOM = "presence:global";

const ENTITY_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

export const isValidEntityId = (value: unknown): value is string =>
  typeof value === "string" && ENTITY_ID_RE.test(value);

export const INTERNAL_EMIT_EVENTS: ReadonlySet<string> = new Set([
  "comment:created",
  "comment:deleted",
  "comment:pinned",
  "comment:restored",
  "comment:updated",
  "moderation-notification:new",
  "notification:new",
  "poll:updated",
  "presence:update",
  "user:theme-updated",
  "vox:activity",
  "vox:bulk-deleted",
  "vox:created",
  "vox:deleted",
  "vox:moderation-bulk",
  "vox:restored",
  "vox:updated",
]);

export const isAllowedInternalEmitRoom = (room: unknown): room is string => {
  if (room === FEED_HOME_ROOM || room === PRESENCE_GLOBAL_ROOM) return true;
  if (typeof room !== "string") return false;
  const sep = room.indexOf(":");
  if (sep <= 0) return false;
  const prefix = room.slice(0, sep);
  return (prefix === "vox" || prefix === "user") && isValidEntityId(room.slice(sep + 1));
};
