const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const SITEVERIFY_TIMEOUT_MS = 5000;

type TurnstileEnv = Readonly<Record<string, string | undefined>>;

export type TurnstileVerification =
  | { ok: true }
  | { ok: false; reason: "missing_token" | "rejected" | "unavailable" };

type SiteverifyResponse = {
  success?: boolean;
  action?: string;
  "error-codes"?: string[];
};

/**
 * Not enforced without `TURNSTILE_SECRET_KEY` (development and demo). The client IP is never sent
 * as `remoteip`: it does not leave the server.
 */
export const verifyTurnstileToken = async (
  token: string | undefined,
  expectedAction: string,
  env: TurnstileEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<TurnstileVerification> => {
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return { ok: true };
  if (!token) return { ok: false, reason: "missing_token" };

  let body: SiteverifyResponse;
  try {
    const res = await fetchImpl(SITEVERIFY_URL, {
      method: "POST",
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error("[turnstile] siteverify answered", res.status);
      return { ok: false, reason: "unavailable" };
    }
    body = (await res.json()) as SiteverifyResponse;
  } catch (e) {
    console.error("[turnstile] siteverify failed:", e instanceof Error ? e.message : e);
    return { ok: false, reason: "unavailable" };
  }

  if (body.success !== true) {
    const codes = body["error-codes"] ?? [];
    if (codes.includes("invalid-input-secret") || codes.includes("missing-input-secret")) {
      console.error("[turnstile] invalid TURNSTILE_SECRET_KEY");
      return { ok: false, reason: "unavailable" };
    }
    return { ok: false, reason: "rejected" };
  }
  if (body.action !== expectedAction) return { ok: false, reason: "rejected" };
  return { ok: true };
};

export const turnstileFailureMessageEs = (
  reason: Exclude<TurnstileVerification, { ok: true }>["reason"],
): string =>
  reason === "unavailable"
    ? "No pudimos verificar que no seas un bot. Probá de nuevo en un momento."
    : "La verificación anti-bots falló o venció. Probá de nuevo.";
