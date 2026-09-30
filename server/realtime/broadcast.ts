import type { VoxListApiItem } from "@/server/vox/list";
import type { CommentPublicApi } from "@/server/comments/serialize";
import { realtimePushEnabled, socketBroadcastsEnabled } from "@/lib/realtime/mode";
import { isStrongSocketBroadcastSecret } from "@/server/realtime/socketBroadcastSecret";
import { FEED_HOME_ROOM } from "@/lib/realtime/rooms";

export type VoxDeletedReason = "moderation" | "retention";

/**
 * A broadcast that does not go out must never break the request, but failing silently makes the
 * transport impossible to diagnose. Logged as an error (never the secret): with a push-enabled
 * client build, no screen updates at all. `GET /api/moderation/realtime-health` reports the same.
 */
const warnBroadcast = (reason: string, extra?: Record<string, unknown>) => {
  console.error("[broadcast] event not delivered:", reason, extra ?? {});
};

/** Once per process: expected when the transport is deliberately off. */
let warnedDisabled = false;

const emitToRoom = async (room: string, event: string, data: unknown): Promise<void> => {
  if (!socketBroadcastsEnabled()) {
    if (!warnedDisabled) {
      warnedDisabled = true;
      warnBroadcast("REALTIME_BROADCAST_ENABLED is not 'true'", {
        received: JSON.stringify(process.env.REALTIME_BROADCAST_ENABLED ?? null),
        // Client (build time) and server (runtime) are configured separately: with push compiled in and
        // emission off, every client opens its socket and never receives anything.
        clientExpectsPush: realtimePushEnabled(),
      });
    }
    return;
  }
  const base = (process.env.SOCKET_SERVER_URL ?? "http://127.0.0.1:3001").replace(/\/$/, "");
  const secret = process.env.SOCKET_BROADCAST_SECRET?.trim();
  if (!secret) {
    warnBroadcast("SOCKET_BROADCAST_SECRET is missing");
    return;
  }
  if (process.env.NODE_ENV === "production" && !isStrongSocketBroadcastSecret(secret)) {
    warnBroadcast("SOCKET_BROADCAST_SECRET is shorter than the production minimum");
    return;
  }
  try {
    const res = await fetch(`${base}/internal/emit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ room, event, data }),
    });
    if (!res.ok) {
      // 401: the secret does not match the target's; 400: room or event outside the allow-list.
      warnBroadcast("the target rejected the emit", { status: res.status, room, event });
    }
  } catch (err) {
    warnBroadcast("could not reach the target", {
      base,
      room,
      event,
      err: err instanceof Error ? err.message : String(err),
    });
  }
};

export const emitToVoxRoom = async (voxId: string, event: string, data: unknown): Promise<void> => {
  return emitToRoom(`vox:${voxId}`, event, data);
};

export const emitToUserRoom = async (
  userId: string,
  event: string,
  data: unknown,
): Promise<void> => {
  return emitToRoom(`user:${userId}`, event, data);
};

/** Data-free ping to the account's tabs; each one refetches its theme over HTTP. */
export const broadcastUserThemeUpdated = async (userId: string): Promise<void> =>
  emitToUserRoom(userId, "user:theme-updated", {});

const emitToFeedHome = async (event: string, data: unknown): Promise<void> => {
  return emitToRoom(FEED_HOME_ROOM, event, data);
};

export const broadcastVoxDeleted = async (
  voxId: string,
  reason: VoxDeletedReason,
): Promise<void> => {
  const payload = { voxId, reason };
  await Promise.all([
    emitToVoxRoom(voxId, "vox:deleted", payload),
    emitToFeedHome("vox:deleted", payload),
  ]);
};

export const broadcastVoxBulkDeleted = async (
  voxIds: string[],
  reason: VoxDeletedReason,
): Promise<void> => {
  if (voxIds.length === 0) return;
  await Promise.all([
    ...voxIds.map((voxId) => emitToVoxRoom(voxId, "vox:deleted", { voxId, reason })),
    emitToFeedHome("vox:bulk-deleted", { voxIds, reason }),
  ]);
};

/** Pin or unpin: the vox room moves the pinned copy without reloading the thread. */
export const broadcastCommentPinned = async (
  voxId: string,
  commentId: string,
  pinnedAt: string | null,
): Promise<void> => {
  await emitToVoxRoom(voxId, "comment:pinned", { commentId, pinnedAt });
};

/** An admin edited their comment: the vox room replaces the row (anonymous payload). */
export const broadcastCommentUpdated = async (
  voxId: string,
  comment: CommentPublicApi,
): Promise<void> => {
  await emitToVoxRoom(voxId, "comment:updated", comment);
};

export const broadcastVoxActivity = async (voxId: string, replies: number): Promise<void> => {
  await emitToFeedHome("vox:activity", { voxId, replies });
};

export const broadcastVoxCreated = async (item: VoxListApiItem): Promise<void> => {
  await emitToFeedHome("vox:created", item);
};

export const broadcastVoxUpdated = async (
  voxId: string,
  patch: { category?: string; pinnedAt?: string | null },
): Promise<void> => {
  await Promise.all([
    emitToVoxRoom(voxId, "vox:updated", { voxId, ...patch }),
    emitToFeedHome("vox:updated", { voxId, ...patch }),
  ]);
};

/** Owner-admin edit of a vox. The description only goes to the vox room: the grid never shows it. */
export const broadcastVoxEdited = async (
  voxId: string,
  patch: { title: string; description: string },
): Promise<void> => {
  await Promise.all([
    emitToVoxRoom(voxId, "vox:updated", { voxId, ...patch }),
    emitToFeedHome("vox:updated", { voxId, title: patch.title }),
  ]);
};
