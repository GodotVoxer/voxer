import { importPKCS8, SignJWT } from "jose";
import { pushEnabled } from "@/server/push/pushMode";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
/** Margin so a token does not expire while the request is in flight. */
const EXPIRY_SKEW_MS = 60_000;

type CachedToken = { value: string; expiresAtMs: number };
let cached: CachedToken | null = null;

/**
 * OAuth2 `jwt-bearer` exchange with the service account, without `firebase-admin`: only
 * `messages:send` is needed and `jose` is already a dependency. Never throws: on failure it returns
 * null and sending becomes a no-op.
 */
export const getFirebaseAccessToken = async (): Promise<string | null> => {
  if (!pushEnabled()) return null;
  const now = Date.now();
  if (cached && cached.expiresAtMs - EXPIRY_SKEW_MS > now) return cached.value;

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!clientEmail || !rawKey) return null;
  // Hosting dashboards store the key with real or escaped newlines; unescape the latter.
  const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;

  try {
    const key = await importPKCS8(privateKey, "RS256");
    const assertion = await new SignJWT({ scope: FCM_SCOPE })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(clientEmail)
      .setSubject(clientEmail)
      .setAudience(TOKEN_URL)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(key);

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) return null;
    cached = {
      value: json.access_token,
      expiresAtMs: now + (json.expires_in ?? 3600) * 1000,
    };
    return cached.value;
  } catch {
    return null;
  }
};
