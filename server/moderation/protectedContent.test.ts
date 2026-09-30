import { beforeEach, expect, it, vi } from "vitest";
import { mayModeratePublication, hasProtectedAdminTargets } from "./protectedContent";
const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  vox: { findUnique: vi.fn(), findFirst: vi.fn() },
  comment: { findUnique: vi.fn(), findFirst: vi.fn() },
}));
vi.mock("@/server/db/prisma", () => ({ prisma: db }));

beforeEach(() => {
  vi.resetAllMocks();
  db.user.findUnique.mockResolvedValue({ role: "ADMIN" });
  db.vox.findUnique.mockResolvedValue({ owner: { id: "owner", role: "ADMIN" } });
  db.comment.findUnique.mockResolvedValue({ author: { id: "owner", role: "ADMIN" } });
});

it.each(["vox", "comment"] as const)(
  "another admin cannot moderate an admin's %s",
  async (kind) => {
    expect(await mayModeratePublication("peer", { kind, id: "content" })).toBe(false);
  },
);
it.each(["vox", "comment"] as const)(
  "el admin conserva control sobre su propio %s",
  async (kind) => {
    expect(await mayModeratePublication("owner", { kind, id: "content" })).toBe(true);
  },
);
it("a moderator cannot act on an admin", async () => {
  db.user.findUnique.mockResolvedValue({ role: "MOD" });
  expect(await mayModeratePublication("mod", { kind: "vox", id: "content" })).toBe(false);
});
it("a moderator may delete a regular user's vox even if an admin commented on it", async () => {
  db.user.findUnique.mockResolvedValue({ role: "MOD" });
  db.vox.findUnique.mockResolvedValue({ owner: { id: "user", role: "USER" } });
  expect(await mayModeratePublication("mod", { kind: "vox", id: "v" })).toBe(true);
});

it("a moderator cannot delete an admin's comment", async () => {
  db.user.findUnique.mockResolvedValue({ role: "MOD" });
  db.comment.findUnique.mockResolvedValue({ author: { id: "admin", role: "ADMIN" } });
  expect(await mayModeratePublication("mod", { kind: "comment", id: "c" })).toBe(false);
});

it("a moderator may delete a regular user's comment", async () => {
  db.user.findUnique.mockResolvedValue({ role: "MOD" });
  db.comment.findUnique.mockResolvedValue({ author: { id: "user", role: "USER" } });
  expect(await mayModeratePublication("mod", { kind: "comment", id: "c" })).toBe(true);
});
it("a session without a staff role cannot moderate", async () => {
  db.user.findUnique.mockResolvedValue({ role: "USER" });
  expect(await mayModeratePublication("owner", { kind: "comment", id: "c" })).toBe(false);
});

it("checks every target of a bulk undo with bounded queries", async () => {
  const ids = Array.from({ length: 100 }, (_, i) => "v" + i);
  db.vox.findFirst.mockResolvedValue({ id: "v99" });
  expect(await hasProtectedAdminTargets("viewer", ids, ["comment"])).toBe(true);
  expect(db.vox.findFirst).toHaveBeenCalledOnce();
  expect(db.comment.findFirst).toHaveBeenCalledOnce();
  expect(db.vox.findFirst).toHaveBeenCalledWith({
    where: { id: { in: ids }, owner: { role: "ADMIN", id: { not: "viewer" } } },
    select: { id: true },
  });
});
it("does not query content when the action has no publication targets", async () => {
  expect(await hasProtectedAdminTargets("viewer", [], [])).toBe(false);
  expect(db.vox.findFirst).not.toHaveBeenCalled();
  expect(db.comment.findFirst).not.toHaveBeenCalled();
});
