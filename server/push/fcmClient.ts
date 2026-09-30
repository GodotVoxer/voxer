import { PUSH_REQUEST_TIMEOUT_MS } from "@/server/push/constants";
import { classifyFcmFailure, type FcmFailure } from "@/server/push/fcmErrors";
import type { FcmV1Message } from "@/server/push/payload";

export type FcmSendOutcome = { ok: true } | { ok: false; failure: FcmFailure };

const endpointFor = (projectId: string): string =>
  `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

/** One message, one device: FCM HTTP v1 has no real multicast, `send.ts` does the fan-out. */
export const sendFcmMessage = async (
  accessToken: string,
  projectId: string,
  message: FcmV1Message,
): Promise<FcmSendOutcome> => {
  try {
    const res = await fetch(endpointFor(projectId), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
      signal: AbortSignal.timeout(PUSH_REQUEST_TIMEOUT_MS),
    });
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => null);
    return { ok: false, failure: classifyFcmFailure(res.status, body) };
  } catch {
    // Timeout or network failure: the token may be fine, so it is never deleted for this.
    return { ok: false, failure: "retryable" };
  }
};
