import { describe, expect, it, vi } from "vitest";
import { verifyTurnstileToken } from "./turnstile";

const env = { TURNSTILE_SECRET_KEY: "secret" };

const fetchReturning = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("verifyTurnstileToken", () => {
  it("requires no token and makes no call without a secret", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    expect(await verifyTurnstileToken(undefined, "register", {}, fetchImpl)).toEqual({ ok: true });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects a missing token without calling Cloudflare", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    expect(await verifyTurnstileToken(undefined, "register", env, fetchImpl)).toEqual({
      ok: false,
      reason: "missing_token",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("accepts a valid token for the expected action and never sends the IP", async () => {
    const fetchImpl = fetchReturning({ success: true, action: "register" });
    expect(await verifyTurnstileToken("tok", "register", env, fetchImpl)).toEqual({ ok: true });
    const init = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[1] as RequestInit;
    const sent = new URLSearchParams(init.body as URLSearchParams);
    expect(sent.get("response")).toBe("tok");
    expect(sent.has("remoteip")).toBe(false);
  });

  it("rejects a token issued for another action", async () => {
    const fetchImpl = fetchReturning({ success: true, action: "login" });
    expect(await verifyTurnstileToken("tok", "register", env, fetchImpl)).toEqual({
      ok: false,
      reason: "rejected",
    });
  });

  it("rejects an invalid or expired token", async () => {
    const fetchImpl = fetchReturning({ success: false, "error-codes": ["timeout-or-duplicate"] });
    expect(await verifyTurnstileToken("tok", "register", env, fetchImpl)).toEqual({
      ok: false,
      reason: "rejected",
    });
  });

  it("reports unavailable when the secret is wrong or Cloudflare is down", async () => {
    const badSecret = fetchReturning({ success: false, "error-codes": ["invalid-input-secret"] });
    expect(await verifyTurnstileToken("tok", "register", env, badSecret)).toMatchObject({
      reason: "unavailable",
    });
    const down = vi.fn(async () => {
      throw new Error("network");
    }) as unknown as typeof fetch;
    expect(await verifyTurnstileToken("tok", "register", env, down)).toMatchObject({
      reason: "unavailable",
    });
    expect(
      await verifyTurnstileToken("tok", "register", env, fetchReturning({}, 500)),
    ).toMatchObject({
      reason: "unavailable",
    });
  });
});
