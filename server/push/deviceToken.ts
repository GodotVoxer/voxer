/** Size of the `PushDevice.token` column; real FCM tokens are about 140 to 200 characters. */
export const FCM_TOKEN_MAX = 512;
export const FCM_TOKEN_MIN = 64;

/** Alphabet seen in FCM tokens: base64url plus the `:` and `.` of the instance part. */
const FCM_TOKEN_RE = /^[A-Za-z0-9_\-:.%]+$/;

export const isPlausibleFcmToken = (raw: string): boolean => {
  const t = raw.trim();
  if (t.length < FCM_TOKEN_MIN || t.length > FCM_TOKEN_MAX) return false;
  return FCM_TOKEN_RE.test(t);
};

export const normalizeFcmToken = (raw: string): string | null => {
  const t = raw.trim();
  return isPlausibleFcmToken(t) ? t : null;
};
