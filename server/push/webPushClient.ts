import { createHash } from "node:crypto";
import { sendNotification, WebPushError } from "web-push";
import { PUSH_REQUEST_TIMEOUT_MS } from "@/server/push/constants";
import type { FcmFailure } from "@/server/push/fcmErrors";
import { buildWebPushData, pushTtlSeconds, type VoxerPushPayload } from "@/server/push/payload";
import { classifyWebPushFailure } from "@/server/push/webPushErrors";

export type WebPushTarget = { endpoint: string; p256dh: string; auth: string };

export type WebPushSendOutcome = { ok: true } | { ok: false; failure: FcmFailure };

type VapidDetails = { subject: string; publicKey: string; privateKey: string };

export const readVapidDetails = (): VapidDetails | null => {
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT?.trim();
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim();
  if (!subject || !publicKey || !privateKey) return null;
  return { subject, publicKey, privateKey };
};

/**
 * `Topic` lets the push service replace a pending message of the same vox while the device is off
 * (like FCM's `collapse_key`). It only takes up to 32 base64url characters, hence a hash of the key.
 */
export const topicFor = (collapseKey: string): string =>
  createHash("sha256").update(collapseKey).digest("base64url").slice(0, 32);

/** One message, one subscription. Never throws; `send.ts` does the fan-out. */
export const sendWebPushMessage = async (
  target: WebPushTarget,
  payload: VoxerPushPayload,
): Promise<WebPushSendOutcome> => {
  const vapidDetails = readVapidDetails();
  if (!vapidDetails) return { ok: false, failure: "auth" };
  try {
    await sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      buildWebPushData(payload),
      {
        vapidDetails,
        TTL: pushTtlSeconds(payload.kind),
        urgency: "high",
        topic: topicFor(payload.collapseKey),
        timeout: PUSH_REQUEST_TIMEOUT_MS,
      },
    );
    return { ok: true };
  } catch (e) {
    if (e instanceof WebPushError) {
      return { ok: false, failure: classifyWebPushFailure(e.statusCode) };
    }
    // Timeout or network failure: the subscription may be fine, so it is never deleted for this.
    return { ok: false, failure: "retryable" };
  }
};
