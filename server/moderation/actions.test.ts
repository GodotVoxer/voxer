import { describe, expect, it, vi, beforeEach } from "vitest";

import { staffBanUser } from "./ban";
import { undoModerationAction } from "./undo";

const mocks = vi.hoisted(() => ({
  mayModerate: vi.fn().mockResolvedValue(true),
  userFindUnique: vi.fn(),
  actionFindUnique: vi.fn(),
  commentFindMany: vi.fn(),
  transaction: vi.fn(),
  broadcastVoxActivity: vi.fn(),
  broadcastVoxCreated: vi.fn(),
  broadcastVoxUpdated: vi.fn(),
  emitToVoxRoom: vi.fn(),
  getVoxListItemById: vi.fn(),
  countActiveCommentsForVox: vi.fn(),
}));

vi.mock("@/server/moderation/protectedContent", () => ({
  hasProtectedAdminTargets: vi.fn().mockResolvedValue(false),
  mayModeratePublication: mocks.mayModerate,
  protectedAdminCommentsWhere: () => ({}),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    moderationAction: { findUnique: mocks.actionFindUnique },
    comment: { findMany: mocks.commentFindMany },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/server/realtime/broadcast", () => ({
  broadcastVoxActivity: mocks.broadcastVoxActivity,
  broadcastVoxBulkDeleted: vi.fn(),
  broadcastVoxCreated: mocks.broadcastVoxCreated,
  broadcastVoxDeleted: vi.fn(),
  broadcastVoxUpdated: mocks.broadcastVoxUpdated,
  emitToUserRoom: vi.fn(),
  emitToVoxRoom: mocks.emitToVoxRoom,
}));

vi.mock("@/server/vox/list", () => ({
  countActiveCommentsForVox: mocks.countActiveCommentsForVox,
  getVoxListItemById: mocks.getVoxListItemById,
}));

vi.mock("@/server/vox/getVoxDetailCached", () => ({
  invalidateVoxDetailCache: vi.fn(),
}));

const makeTx = () => ({
  vox: { update: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
  comment: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
  userBan: { updateMany: vi.fn() },
  clientIpBan: { updateMany: vi.fn() },
  moderationAction: { update: vi.fn() },
});

const rolesById = (roles: Record<string, "USER" | "MOD" | "ADMIN">) => {
  mocks.userFindUnique.mockImplementation(async ({ where }: { where: { id: string } }) =>
    roles[where.id] ? { role: roles[where.id] } : null,
  );
};

describe("staffBanUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuses a self-ban without touching the database", async () => {
    const r = await staffBanUser("same-id", "same-id", "x", "HOURS", 1);
    expect(r).toEqual({ ok: false, kind: "cannot_ban_self" });
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("a MOD cannot ban an ADMIN", async () => {
    rolesById({ mod: "MOD", admin: "ADMIN" });
    const r = await staffBanUser("mod", "admin", "x", "HOURS", 1);
    expect(r).toEqual({ ok: false, kind: "forbidden_target" });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});

describe("undoModerationAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.countActiveCommentsForVox.mockResolvedValue(3);
  });

  it("a MOD cannot undo an ADMIN's action", async () => {
    rolesById({ mod: "MOD" });
    mocks.actionFindUnique.mockResolvedValueOnce({
      id: "a1",
      actionType: "DELETE_VOX",
      payload: { voxId: "v1" },
      undoneAt: null,
      actor: { role: "ADMIN" },
    });
    const r = await undoModerationAction("a1", "mod");
    expect(r).toEqual({ ok: false, kind: "forbidden_admin_action" });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("recategorize undo uses updateMany (the vox may be purged) and broadcasts the restored category", async () => {
    rolesById({ admin: "ADMIN" });
    mocks.actionFindUnique.mockResolvedValueOnce({
      id: "a2",
      actionType: "RECATEGORIZE_VOX",
      payload: { voxId: "v2", previousCategory: "General", newCategory: "NSFW" },
      undoneAt: null,
      actor: { role: "MOD" },
    });
    const tx = makeTx();
    mocks.transaction.mockImplementation(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));

    const r = await undoModerationAction("a2", "admin");

    expect(r).toEqual({ ok: true });
    expect(tx.vox.updateMany).toHaveBeenCalledWith({
      where: { id: "v2" },
      data: { category: "General" },
    });
    expect(tx.vox.update).not.toHaveBeenCalled();
    expect(mocks.broadcastVoxUpdated).toHaveBeenCalledWith("v2", { category: "General" });
  });

  it("restoring a vox announces it to the home feed again", async () => {
    rolesById({ mod: "MOD" });
    mocks.actionFindUnique.mockResolvedValueOnce({
      id: "a3",
      actionType: "DELETE_VOX",
      payload: { voxId: "v3" },
      undoneAt: null,
      actor: { role: "MOD" },
    });
    const tx = makeTx();
    mocks.transaction.mockImplementation(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));
    const item = { id: "v3", title: "t" };
    mocks.getVoxListItemById.mockResolvedValueOnce(item);

    await undoModerationAction("a3", "mod");

    expect(mocks.emitToVoxRoom).toHaveBeenCalledWith("v3", "vox:restored", { voxId: "v3" });
    expect(mocks.broadcastVoxCreated).toHaveBeenCalledWith(item);
  });

  it("restoring a comment updates the reply count in the feed", async () => {
    rolesById({ mod: "MOD" });
    mocks.actionFindUnique.mockResolvedValueOnce({
      id: "a4",
      actionType: "DELETE_COMMENT",
      payload: { voxId: "v4", commentId: "c4" },
      undoneAt: null,
      actor: { role: "MOD" },
    });
    const tx = makeTx();
    mocks.transaction.mockImplementation(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));

    await undoModerationAction("a4", "mod");

    expect(mocks.broadcastVoxActivity).toHaveBeenCalledWith("v4", 3);
  });

  it("the undo stands even when the realtime broadcast fails", async () => {
    rolesById({ mod: "MOD" });
    mocks.actionFindUnique.mockResolvedValueOnce({
      id: "a5",
      actionType: "DELETE_VOX",
      payload: { voxId: "v5" },
      undoneAt: null,
      actor: { role: "MOD" },
    });
    const tx = makeTx();
    mocks.transaction.mockImplementation(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));
    mocks.getVoxListItemById.mockRejectedValueOnce(new Error("db blip"));

    await expect(undoModerationAction("a5", "mod")).resolves.toEqual({ ok: true });
    expect(tx.moderationAction.update).toHaveBeenCalled();
  });
});

it("an ADMIN cannot ban another ADMIN", async () => {
  vi.clearAllMocks();
  rolesById({ a: "ADMIN", b: "ADMIN" });
  expect(await staffBanUser("a", "b", "x", "HOURS", 1)).toEqual({
    ok: false,
    kind: "forbidden_target",
  });
  expect(mocks.transaction).not.toHaveBeenCalled();
});

it("an ADMIN cannot undo another ADMIN's action", async () => {
  vi.clearAllMocks();
  rolesById({ a: "ADMIN" });
  mocks.actionFindUnique.mockResolvedValue({ actorUserId: "b", actor: { role: "ADMIN" } });
  expect(await undoModerationAction("act", "a")).toEqual({
    ok: false,
    kind: "forbidden_admin_action",
  });
  expect(mocks.transaction).not.toHaveBeenCalled();
});

it.each(["vox", "comment", "category"] as const)(
  "bloquea %s protegido antes de escribir",
  async (kind) => {
    vi.clearAllMocks();
    mocks.mayModerate.mockResolvedValueOnce(false);
    const { staffSoftDeleteVox, staffSoftDeleteComment } = await import("./softDelete");
    const { staffRecategorizeVox } = await import("./recategorize");
    const result =
      kind === "vox"
        ? await staffSoftDeleteVox("peer", "v")
        : kind === "comment"
          ? await staffSoftDeleteComment("peer", "c")
          : await staffRecategorizeVox("peer", "v", "General");
    expect(result).toEqual({ ok: false, kind: "forbidden_target" });
    expect(mocks.transaction).not.toHaveBeenCalled();
  },
);
