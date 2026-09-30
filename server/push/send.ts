import { PUSH_SEND_CONCURRENCY } from "@/server/push/constants";
import { shouldDeleteToken, type FcmFailure } from "@/server/push/fcmErrors";
import { buildFcmV1Message, type VoxerPushPayload } from "@/server/push/payload";
import { fcmPushEnabled, pushEnabled, webPushEnabled } from "@/server/push/pushMode";
import {
  bumpPushTokenFailures,
  deletePushTokens,
  listPushTargetsForUserIds,
  type PushTarget,
} from "@/server/push/devices";
import { getFirebaseAccessToken } from "@/server/push/googleAccessToken";
import { sendFcmMessage } from "@/server/push/fcmClient";
import { sendWebPushMessage } from "@/server/push/webPushClient";
import { sendUnifiedPushMessage } from "@/server/push/unifiedPushClient";

const chunked = <T>(items: readonly T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

type SendOutcome = { ok: true } | { ok: false; failure: FcmFailure };
type Sender = (target: PushTarget) => Promise<SendOutcome>;

/** Builds the sender for a platform; null when that transport is not configured. */
const buildSender = async (payload: VoxerPushPayload): Promise<Sender | null> => {
  const fcm = await (async () => {
    if (!fcmPushEnabled()) return null;
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    const accessToken = projectId ? await getFirebaseAccessToken() : null;
    return projectId && accessToken ? { projectId, accessToken } : null;
  })();
  const web = webPushEnabled();
  if (!fcm && !web) return null;

  return async (t) => {
    if (t.platform === "WEB" || t.platform === "UNIFIED_PUSH") {
      if (!web || !t.webP256dh || !t.webAuth) return { ok: true };
      const target = { endpoint: t.token, p256dh: t.webP256dh, auth: t.webAuth };
      return t.platform === "WEB"
        ? sendWebPushMessage(target, payload)
        : sendUnifiedPushMessage(target, payload);
    }
    if (!fcm) return { ok: true };
    return sendFcmMessage(fcm.accessToken, fcm.projectId, buildFcmV1Message(t.token, payload));
  };
};

/**
 * Fails silently and never throws: a push provider problem must not affect creating a comment or
 * a report. Always runs inside `after()`, never inside a database transaction. These requests leave
 * from the server, so push services do not belong in the CSP.
 */
export const sendPushToUserIds = async (
  userIds: readonly string[],
  payload: VoxerPushPayload,
): Promise<void> => {
  if (!pushEnabled()) return;
  if (userIds.length === 0) return;

  const send = await buildSender(payload).catch(() => null);
  if (!send) return;

  const targets = await listPushTargetsForUserIds(userIds);
  if (targets.length === 0) return;

  const dead: string[] = [];
  const flaky: string[] = [];

  for (const chunk of chunked(targets, PUSH_SEND_CONCURRENCY)) {
    const results = await Promise.allSettled(chunk.map((t) => send(t)));
    results.forEach((r, i) => {
      if (r.status !== "fulfilled" || r.value.ok) return;
      const token = chunk[i]?.token;
      if (!token) return;
      if (shouldDeleteToken(r.value.failure)) dead.push(token);
      else if (r.value.failure === "retryable") flaky.push(token);
    });
  }

  if (dead.length > 0) await deletePushTokens(dead).catch(() => {});
  if (flaky.length > 0) await bumpPushTokenFailures(flaky).catch(() => {});
};
