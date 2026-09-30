import type { FcmFailure } from "@/server/push/fcmErrors";

/** Same categories as FCM so `send.ts` shares the cleanup; push services answer 404/410 for gone subscriptions. */
export const classifyWebPushFailure = (status: number): FcmFailure => {
  if (status === 404 || status === 410) return "unregistered";
  // VAPID signature rejected: our problem, not the browser's.
  if (status === 401 || status === 403) return "auth";
  if (status === 429 || status >= 500) return "retryable";
  return "unknown";
};
