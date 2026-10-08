import { beforeEach, expect, it, vi } from "vitest";
import { guardUploadRequest } from "./guard";
import { TEXT_ONLY_MODE_UPLOAD_MESSAGE_ES } from "@/lib/media/textOnlyMode";

const mocks = vi.hoisted(() => ({ textOnly: vi.fn(), postingBlock: vi.fn() }));
vi.mock("@/server/http/apiErrors", async (orig) => ({
  ...(await orig<typeof import("@/server/http/apiErrors")>()),
  isDbConfigured: () => true,
}));
vi.mock("@/server/auth/sessionCookie", () => ({ getSessionUserIdFromCookies: async () => "u1" }));
vi.mock("@/server/http/rateLimits", () => ({ withinRateLimit: async () => true }));
vi.mock("@/server/http/requestIp", () => ({ requestClientIp: () => "1.2.3.4" }));
vi.mock("@/server/moderation/postingEligibility", () => ({
  getPostingBlockForUser: mocks.postingBlock,
  postingBlockResponse: vi.fn(),
}));
vi.mock("@/server/moderation/textOnlyMode", () => ({ isTextOnlyModeActive: mocks.textOnly }));

const guard = () =>
  guardUploadRequest(new Request("http://localhost/api/upload", { method: "POST" }), {
    rateLimit: "upload-blob-token",
    requiresBucket: false,
  });

beforeEach(() => {
  mocks.postingBlock.mockResolvedValue(null);
});

it("rejects every upload while text-only mode is on, with a message that says why", async () => {
  mocks.textOnly.mockResolvedValue(true);
  const r = await guard();
  expect("error" in r).toBe(true);
  if (!("error" in r)) return;
  expect(r.error.status).toBe(403);
  expect(await r.error.json()).toEqual({ error: TEXT_ONLY_MODE_UPLOAD_MESSAGE_ES });
});

it("lets uploads through once the mode is off", async () => {
  mocks.textOnly.mockResolvedValue(false);
  expect(await guard()).toEqual({ userId: "u1", ip: "1.2.3.4" });
});
