import { describe, expect, it, vi, beforeEach } from "vitest";
import { editOwnVoxByAdmin } from "./adminEditOwnVox";

const {
  voxFindFirst,
  update,
  moderationActionCreate,
  transaction,
  broadcastVoxEdited,
  invalidate,
} = vi.hoisted(() => {
  const voxFindFirst = vi.fn();
  const update = vi.fn();
  const moderationActionCreate = vi.fn();
  const transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      vox: { update },
      moderationAction: { create: moderationActionCreate },
    };
    return fn(tx);
  });
  return {
    voxFindFirst,
    update,
    moderationActionCreate,
    transaction,
    broadcastVoxEdited: vi.fn(async () => undefined),
    invalidate: vi.fn(),
  };
});

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $transaction: transaction,
    vox: { findFirst: voxFindFirst },
  },
}));
vi.mock("@/server/realtime/broadcast", () => ({ broadcastVoxEdited }));
vi.mock("@/server/vox/getVoxDetailCached", () => ({ invalidateVoxDetailCache: invalidate }));

const CURRENT = { id: "v1", ownerId: "admin1", title: "Viejo", description: "Texto viejo" };
const NEXT = { title: "Nuevo", description: "Texto nuevo" };

describe("editOwnVoxByAdmin", () => {
  beforeEach(() => {
    voxFindFirst.mockReset();
    update.mockReset();
    moderationActionCreate.mockReset();
    transaction.mockClear();
    broadcastVoxEdited.mockClear();
    invalidate.mockClear();
  });

  it("rejects a role other than ADMIN", async () => {
    const r = await editOwnVoxByAdmin("u1", "MOD", "v1", NEXT);
    expect(r).toEqual({ ok: false, kind: "not_admin" });
    expect(voxFindFirst).not.toHaveBeenCalled();
  });

  it("returns not_found without a live row", async () => {
    voxFindFirst.mockResolvedValueOnce(null);
    const r = await editOwnVoxByAdmin("admin1", "ADMIN", "v1", NEXT);
    expect(r).toEqual({ ok: false, kind: "not_found" });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("does not allow editing another user's vox", async () => {
    voxFindFirst.mockResolvedValueOnce({ ...CURRENT, ownerId: "otro" });
    const r = await editOwnVoxByAdmin("admin1", "ADMIN", "v1", NEXT);
    expect(r).toEqual({ ok: false, kind: "not_owner" });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("does not allow editing an ownerless vox", async () => {
    voxFindFirst.mockResolvedValueOnce({ ...CURRENT, ownerId: null });
    const r = await editOwnVoxByAdmin("admin1", "ADMIN", "v1", NEXT);
    expect(r).toEqual({ ok: false, kind: "not_owner" });
  });

  it("stops when the text did not change", async () => {
    voxFindFirst.mockResolvedValueOnce(CURRENT);
    const r = await editOwnVoxByAdmin("admin1", "ADMIN", "v1", {
      title: CURRENT.title,
      description: CURRENT.description,
    });
    expect(r).toEqual({ ok: false, kind: "unchanged" });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("saves, records the previous text and broadcasts", async () => {
    voxFindFirst.mockResolvedValueOnce(CURRENT);
    moderationActionCreate.mockResolvedValueOnce({ id: "act1" });
    const r = await editOwnVoxByAdmin("admin1", "ADMIN", "v1", NEXT);
    expect(r).toEqual({ ok: true, actionId: "act1", ...NEXT });
    expect(update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { title: "Nuevo", description: "Texto nuevo" },
    });
    expect(moderationActionCreate).toHaveBeenCalledWith({
      data: {
        actorUserId: "admin1",
        actionType: "EDIT_VOX",
        payload: {
          voxId: "v1",
          title: "Nuevo",
          previousTitle: "Viejo",
          previousDescription: "Texto viejo",
        },
      },
    });
    expect(invalidate).toHaveBeenCalledWith("v1");
    expect(broadcastVoxEdited).toHaveBeenCalledWith("v1", NEXT);
  });
});
