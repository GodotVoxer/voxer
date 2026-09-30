import { describe, expect, it, vi, beforeEach } from "vitest";
import { toggleVoxPinByAdmin } from "./adminPinVox";

const { findFirst, update, moderationActionCreate, transaction } = vi.hoisted(() => {
  const findFirst = vi.fn();
  const update = vi.fn();
  const moderationActionCreate = vi.fn();
  const transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      vox: { findFirst, update },
      moderationAction: { create: moderationActionCreate },
    };
    return fn(tx);
  });
  return { findFirst, update, moderationActionCreate, transaction };
});

vi.mock("@/server/moderation/protectedContent", () => ({
  mayModeratePublication: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $transaction: transaction,
  },
}));

describe("toggleVoxPinByAdmin", () => {
  beforeEach(() => {
    findFirst.mockReset();
    update.mockReset();
    moderationActionCreate.mockReset();
    transaction.mockReset();
  });

  it("rejects a role other than ADMIN", async () => {
    const r = await toggleVoxPinByAdmin("u1", "MOD", "v1");
    expect(r).toEqual({ ok: false, kind: "not_admin" });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("pins an unpinned vox and records the action", async () => {
    const pinned = new Date("2026-05-01T12:00:00.000Z");
    findFirst.mockResolvedValueOnce({
      id: "v1",
      createdAt: new Date(),
      pinnedAt: null,
      title: "Mi título",
    });
    update.mockResolvedValueOnce({ pinnedAt: pinned });
    moderationActionCreate.mockResolvedValueOnce({ id: "act1" });
    const r = await toggleVoxPinByAdmin("admin1", "ADMIN", "v1");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.pinnedAt).toBe(pinned.toISOString());
    }
    expect(update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { pinnedAt: expect.any(Date) },
      select: { pinnedAt: true },
    });
    expect(moderationActionCreate).toHaveBeenCalledWith({
      data: {
        actorUserId: "admin1",
        actionType: "PIN_VOX",
        payload: expect.objectContaining({
          voxId: "v1",
          title: "Mi título",
          snapshots: expect.any(Array),
        }),
      },
    });
  });

  it("unpins a pinned vox and records the action", async () => {
    const prev = new Date("2026-04-01T00:00:00.000Z");
    findFirst.mockResolvedValueOnce({
      id: "v1",
      createdAt: new Date(),
      pinnedAt: prev,
      title: "Otro",
    });
    update.mockResolvedValueOnce({ pinnedAt: null });
    moderationActionCreate.mockResolvedValueOnce({ id: "act2" });
    const r = await toggleVoxPinByAdmin("admin1", "ADMIN", "v1");
    expect(r).toEqual({ ok: true, pinnedAt: null });
    expect(moderationActionCreate).toHaveBeenCalledWith({
      data: {
        actorUserId: "admin1",
        actionType: "UNPIN_VOX",
        payload: expect.objectContaining({
          voxId: "v1",
          title: "Otro",
          snapshots: expect.any(Array),
        }),
      },
    });
  });

  it("returns not_found without a live row", async () => {
    findFirst.mockResolvedValueOnce(null);
    const r = await toggleVoxPinByAdmin("admin1", "ADMIN", "missing");
    expect(r).toEqual({ ok: false, kind: "not_found" });
    expect(update).not.toHaveBeenCalled();
    expect(moderationActionCreate).not.toHaveBeenCalled();
  });
});
