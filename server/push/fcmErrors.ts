/** Why an FCM HTTP v1 send failed, which decides whether the token is dropped or retried. */
export type FcmFailure = "unregistered" | "invalid" | "auth" | "retryable" | "unknown";

/** `errorCode` inside the `error.details[]` entry whose `@type` is FcmError. */
const readFcmErrorCode = (body: unknown): string | null => {
  if (typeof body !== "object" || body === null) return null;
  const error = (body as { error?: unknown }).error;
  if (typeof error !== "object" || error === null) return null;
  const details = (error as { details?: unknown }).details;
  if (!Array.isArray(details)) return null;
  for (const d of details) {
    if (typeof d !== "object" || d === null) continue;
    const code = (d as { errorCode?: unknown }).errorCode;
    if (typeof code === "string" && code.length > 0) return code;
  }
  return null;
};

export const classifyFcmFailure = (status: number, body: unknown): FcmFailure => {
  const code = readFcmErrorCode(body);

  // The token no longer exists (app uninstalled, data cleared, token rotated).
  if (code === "UNREGISTERED" || status === 404) return "unregistered";
  // Not our token or malformed: retrying is pointless.
  if (code === "INVALID_ARGUMENT" || code === "SENDER_ID_MISMATCH") return "invalid";
  // Our credentials, not the device: tokens must not be deleted.
  if (code === "THIRD_PARTY_AUTH_ERROR" || status === 401 || status === 403) return "auth";
  if (code === "QUOTA_EXCEEDED" || code === "UNAVAILABLE" || code === "INTERNAL")
    return "retryable";
  if (status === 429 || status >= 500) return "retryable";
  return "unknown";
};

/** Tokens are deleted only when the device is at fault, never when we are. */
export const shouldDeleteToken = (failure: FcmFailure): boolean =>
  failure === "unregistered" || failure === "invalid";
