import { afterEach, describe, expect, it, vi } from "vitest";
import { publicOnlyLookup, sendUnifiedPushMessage } from "./unifiedPushClient";
import { buildCommentPushPayload } from "./payload";

const dnsResults = vi.hoisted(() => ({ addresses: [] as { address: string; family: number }[] }));
vi.mock("node:dns", () => ({
  lookup: (
    _host: string,
    _options: unknown,
    cb: (err: Error | null, addresses: { address: string; family: number }[]) => void,
  ) => cb(null, dnsResults.addresses),
}));

const lookup = (all: boolean) =>
  new Promise<{ err: Error | null; address: unknown }>((resolve) => {
    publicOnlyLookup("push.example.org", { all }, (err, address) => resolve({ err, address }));
  });

describe("publicOnlyLookup", () => {
  it("passes public addresses through, in both callback forms", async () => {
    dnsResults.addresses = [{ address: "93.184.216.34", family: 4 }];
    expect(await lookup(true)).toEqual({ err: null, address: dnsResults.addresses });
    expect(await lookup(false)).toEqual({ err: null, address: "93.184.216.34" });
  });

  it("fails when any resolved address is private, so DNS cannot point the server inward", async () => {
    dnsResults.addresses = [
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.5", family: 4 },
    ];
    expect((await lookup(true)).err).toBeInstanceOf(Error);
    dnsResults.addresses = [];
    expect((await lookup(false)).err).toBeInstanceOf(Error);
  });
});

describe("sendUnifiedPushMessage", () => {
  afterEach(() => vi.unstubAllEnvs());

  const payload = buildCommentPushPayload({
    voxId: "vox123",
    voxTitle: "Un vox",
    voxCategory: "General",
    voxThumbnailUrl: null,
    commentPublicTag: "ab12",
    comment: { body: "Un comentario", imageUrl: null, videoUrl: null, animatedImage: false },
    type: "REPLY_TO_COMMENT",
  });

  it("never contacts an endpoint outside the allowed ones", async () => {
    vi.stubEnv("WEB_PUSH_VAPID_SUBJECT", "mailto:admin@example.com");
    vi.stubEnv("NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY", "B".repeat(87));
    vi.stubEnv("WEB_PUSH_VAPID_PRIVATE_KEY", "p".repeat(43));
    const target = { endpoint: "https://169.254.169.254/latest", p256dh: "k", auth: "a" };
    expect(await sendUnifiedPushMessage(target, payload)).toEqual({
      ok: false,
      failure: "invalid",
    });
  });

  it("reports our own configuration, not the device, without VAPID keys", async () => {
    const target = { endpoint: "https://ntfy.sh/up1", p256dh: "k", auth: "a" };
    expect(await sendUnifiedPushMessage(target, payload)).toEqual({ ok: false, failure: "auth" });
  });
});
