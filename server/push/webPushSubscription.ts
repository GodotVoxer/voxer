/** Same size as `PushDevice.token`, where the endpoint is stored. */
export const WEB_PUSH_ENDPOINT_MAX = 512;

/**
 * The server POSTs to whatever endpoint the browser sends; without this list a forged subscription
 * would turn every comment into a server request to an arbitrary host (SSRF).
 */
const PUSH_SERVICE_HOSTS: readonly string[] = [
  "fcm.googleapis.com",
  "android.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
];
const PUSH_SERVICE_HOST_SUFFIXES: readonly string[] = [".notify.windows.com", ".push.apple.com"];

/** p256dh: an uncompressed P-256 point (65 bytes, 87 chars); auth: 16 bytes, 22 chars. */
const P256DH_RE = /^[A-Za-z0-9_-]{87}$/;
const AUTH_RE = /^[A-Za-z0-9_-]{22}$/;

export type WebPushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

const stripPadding = (v: string): string => v.trim().replace(/=+$/, "");

export const isAllowedWebPushEndpoint = (raw: string): boolean => {
  const t = raw.trim();
  if (t.length === 0 || t.length > WEB_PUSH_ENDPOINT_MAX) return false;
  let url: URL;
  try {
    url = new URL(t);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  return (
    PUSH_SERVICE_HOSTS.includes(host) ||
    PUSH_SERVICE_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
  );
};

/**
 * Normalizes (no base64 padding) and validates; null when anything is off. Browser subscriptions
 * must point at a known push service; UnifiedPush ones pass their own endpoint check.
 */
export const normalizeWebPushSubscription = (
  input: WebPushSubscriptionInput,
  isAllowedEndpoint: (endpoint: string) => boolean = isAllowedWebPushEndpoint,
): WebPushSubscriptionInput | null => {
  const endpoint = input.endpoint.trim();
  const p256dh = stripPadding(input.p256dh);
  const auth = stripPadding(input.auth);
  if (!isAllowedEndpoint(endpoint)) return null;
  if (!P256DH_RE.test(p256dh) || !AUTH_RE.test(auth)) return null;
  return { endpoint, p256dh, auth };
};
