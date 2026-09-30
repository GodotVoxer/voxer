import { expect, it, vi } from "vitest";
import { getPostingBlockForUser } from "./postingEligibility";
const mocks = vi.hoisted(() => ({ user: vi.fn(), ban: vi.fn(), ipBan: vi.fn() }));
vi.mock("@/server/db/prisma", () => ({ prisma: { user: { findUnique: mocks.user } } }));
vi.mock("@/server/moderation/activeBan", () => ({ getActiveBanForUser: mocks.ban }));
vi.mock("@/server/moderation/activeClientIpBan", () => ({
  getActiveClientIpBanForHash: mocks.ipBan,
}));
it("an admin is never blocked by an old ban or a shared network", async () => {
  mocks.user.mockResolvedValue({ role: "ADMIN" });
  expect(await getPostingBlockForUser("admin", "127.0.0.1")).toBeNull();
  expect(mocks.ban).not.toHaveBeenCalled();
  expect(mocks.ipBan).not.toHaveBeenCalled();
});
it("keeps the ban for every other account", async () => {
  mocks.user.mockResolvedValue({ role: "USER" });
  mocks.ban.mockResolvedValue({ id: "ban" });
  expect(await getPostingBlockForUser("user", "127.0.0.1")).toEqual({
    kind: "user_ban",
    ban: { id: "ban" },
  });
});
