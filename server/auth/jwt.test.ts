import { afterEach, describe, expect, it } from "vitest";
import { verifySocketJoinToken } from "@/lib/realtime/socketToken";
import { getAuthSecretKey, signSessionJwt, signSocketJoinJwt, verifySessionJwt } from "./jwt";

const prev = process.env.AUTH_SECRET;
afterEach(() => {
  if (prev === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = prev;
});

describe("session and socket tokens", () => {
  it("signs and verifies a session", async () => {
    process.env.AUTH_SECRET = "a".repeat(32);
    const payload = await verifySessionJwt(await signSessionJwt("user-xyz", 3));
    expect(payload?.userId).toBe("user-xyz");
    expect(payload?.sessionVersion).toBe(3);
  });

  it("keeps socket and session tokens apart", async () => {
    process.env.AUTH_SECRET = "b".repeat(32);
    const socket = await signSocketJoinJwt("u1");
    expect(await verifySessionJwt(socket)).toBeNull();
    expect(await verifySocketJoinToken(socket, getAuthSecretKey())).toBe("u1");
    const session = await signSessionJwt("u1", 0);
    expect(await verifySocketJoinToken(session, getAuthSecretKey())).toBeNull();
  });

  it("rejects a socket token signed with another secret", async () => {
    process.env.AUTH_SECRET = "c".repeat(32);
    const socket = await signSocketJoinJwt("u1");
    expect(
      await verifySocketJoinToken(socket, new TextEncoder().encode("d".repeat(32))),
    ).toBeNull();
  });
});
