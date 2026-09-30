import { describe, expect, it, vi, beforeEach } from "vitest";
import { AvatarVariant } from "@prisma/client";
import { editOwnCommentByAdmin } from "./adminEditOwnComment";

const {
  commentFindFirst,
  commentFindMany,
  update,
  moderationActionCreate,
  transaction,
  broadcast,
} = vi.hoisted(() => {
  const update = vi.fn();
  const moderationActionCreate = vi.fn();
  return {
    commentFindFirst: vi.fn(),
    commentFindMany: vi.fn(),
    update,
    moderationActionCreate,
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ comment: { update }, moderationAction: { create: moderationActionCreate } }),
    ),
    broadcast: vi.fn(async () => undefined),
  };
});

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $transaction: transaction,
    comment: { findFirst: commentFindFirst, findMany: commentFindMany },
  },
}));
vi.mock("@/server/realtime/broadcast", () => ({ broadcastCommentUpdated: broadcast }));

const EXISTING = {
  id: "c1",
  voxId: "v1",
  publicTag: "ABCDEFGH",
  authorId: "admin1",
  body: "Texto viejo",
  staffBadge: "ADMIN" as const,
  hideOpBadge: false,
  imageUrl: null,
  videoUrl: null,
  pollDisclosureOptionId: null,
  vox: { ownerId: "admin1", threadUniqueIdsEnabled: false },
};

const row = (patch: Record<string, unknown>) => ({
  ...EXISTING,
  displayName: "admin",
  videoPosterUrl: null,
  animatedImage: false,
  avatarVariant: AvatarVariant.BLUE,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  deletedAt: null,
  deletedByUserId: null,
  countryCode: null,
  threadTag: null,
  threadBadgeHue: null,
  clientIpHash: null,
  replyNotificationsMuted: false,
  pinnedAt: null,
  pollDisclosureOption: null,
  ...patch,
});

const INPUT = { body: "Texto viejo", showStaffIdentity: true, showOpIdentity: true };

describe("editOwnCommentByAdmin", () => {
  beforeEach(() => {
    commentFindFirst.mockReset();
    commentFindMany.mockReset();
    update.mockReset();
    moderationActionCreate.mockReset();
    broadcast.mockClear();
    moderationActionCreate.mockResolvedValue({ id: "act1" });
  });

  it("rejects a role other than ADMIN", async () => {
    const r = await editOwnCommentByAdmin("u1", "MOD", "c1", INPUT);
    expect(r).toEqual({ ok: false, kind: "not_admin" });
    expect(commentFindFirst).not.toHaveBeenCalled();
  });

  it("returns not_owner for someone else's comment", async () => {
    commentFindFirst.mockResolvedValue({ ...EXISTING, authorId: "otro" });
    const r = await editOwnCommentByAdmin("admin1", "ADMIN", "c1", INPUT);
    expect(r).toEqual({ ok: false, kind: "not_owner" });
    expect(update).not.toHaveBeenCalled();
  });

  it("returns unchanged when nothing changes", async () => {
    commentFindFirst.mockResolvedValue(EXISTING);
    const r = await editOwnCommentByAdmin("admin1", "ADMIN", "c1", INPUT);
    expect(r).toEqual({ ok: false, kind: "unchanged" });
  });

  it("returns empty when no text or other content is left", async () => {
    commentFindFirst.mockResolvedValue(EXISTING);
    const r = await editOwnCommentByAdmin("admin1", "ADMIN", "c1", { ...INPUT, body: "   " });
    expect(r).toEqual({ ok: false, kind: "empty" });
  });

  it("rejects a >>TAG that is not in the thread", async () => {
    commentFindFirst.mockResolvedValue(EXISTING);
    commentFindMany.mockResolvedValue([]);
    const r = await editOwnCommentByAdmin("admin1", "ADMIN", "c1", {
      ...INPUT,
      body: ">>ZZZZZZZZ hola",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe("bad_reply_tags");
  });

  it("hides the OP and staff badges, records the action and broadcasts without viewer identity", async () => {
    commentFindFirst.mockResolvedValue(EXISTING);
    update.mockResolvedValue(row({ body: "Nuevo", staffBadge: null, hideOpBadge: true }));
    const r = await editOwnCommentByAdmin("admin1", "ADMIN", "c1", {
      body: "Nuevo",
      showStaffIdentity: false,
      showOpIdentity: false,
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { body: "Nuevo", staffBadge: null, hideOpBadge: true } }),
    );
    expect(moderationActionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actionType: "EDIT_COMMENT",
        payload: expect.objectContaining({
          previousBody: "Texto viejo",
          previousStaffBadge: "ADMIN",
          previousHideOpBadge: false,
        }),
      }),
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.comment.isOp).toBe(false);
      expect(r.comment.staffBadge).toBeNull();
      expect(r.comment.isMine).toBe(true);
    }
    expect(broadcast).toHaveBeenCalledWith("v1", expect.objectContaining({ isMine: false }));
  });

  it("ignores the OP choice when the admin does not own the vox", async () => {
    commentFindFirst.mockResolvedValue({ ...EXISTING, vox: { ...EXISTING.vox, ownerId: "otro" } });
    update.mockResolvedValue(row({ staffBadge: null }));
    await editOwnCommentByAdmin("admin1", "ADMIN", "c1", {
      ...INPUT,
      showStaffIdentity: false,
      showOpIdentity: false,
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ hideOpBadge: false }) }),
    );
  });
});
