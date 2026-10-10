import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvatarVariant } from "@prisma/client";
import { createCommentOnVox } from "./create";

const { tx, commentFindUnique, broadcastVoxActivity, afterTasks } = vi.hoisted(() => ({
  tx: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    comment: { create: vi.fn() },
    vox: { update: vi.fn() },
    voxHide: { upsert: vi.fn() },
    voxFollow: { findMany: vi.fn() },
    notification: { createMany: vi.fn() },
  },
  commentFindUnique: vi.fn(),
  broadcastVoxActivity: vi.fn(async () => undefined),
  afterTasks: [] as Promise<unknown>[],
}));

vi.mock("next/server", () => ({
  after: (task: () => Promise<unknown>) => {
    afterTasks.push(task());
  },
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $transaction: (fn: (client: typeof tx) => Promise<unknown>) => fn(tx),
    vox: {
      findFirst: vi.fn(async () => ({
        id: "v1",
        title: "Título",
        thumbnailUrl: null,
        category: "GENERAL",
        ownerId: "owner",
        threadUniqueIdsEnabled: false,
        countryFlagsEnabled: false,
        hasPoll: false,
        poll: null,
      })),
    },
    comment: { findUnique: commentFindUnique, findMany: vi.fn(async () => []) },
  },
}));
vi.mock("@/server/realtime/broadcast", () => ({
  broadcastVoxActivity,
  emitToUserRoom: vi.fn(async () => undefined),
  emitToVoxRoom: vi.fn(async () => undefined),
}));
vi.mock("@/server/comments/publicTag", () => ({
  createUniquePublicTag: vi.fn(async () => "ABCDEFGH"),
}));
vi.mock("@/server/vox/list", () => ({ countActiveCommentsForVox: vi.fn(async () => 5) }));
vi.mock("@/server/moderation/postingEligibility", () => ({
  getPostingBlockForUser: vi.fn(async () => null),
}));
vi.mock("@/server/http/clientIpHash", () => ({
  hashClientIpFromRawHeaderValue: () => "iphash",
}));
vi.mock("@/server/posting/clientIpCreateCooldown", () => ({
  assertCommentCreateClientIpCooldown: vi.fn(async () => undefined),
}));
vi.mock("@/server/push/send", () => ({ sendPushToUserIds: vi.fn(async () => undefined) }));

const row = (body: string) => ({
  id: "c1",
  voxId: "v1",
  publicTag: "ABCDEFGH",
  authorId: "u1",
  body,
  displayName: "anon",
  imageUrl: null,
  videoUrl: null,
  videoPosterUrl: null,
  animatedImage: false,
  avatarVariant: AvatarVariant.BLUE,
  staffBadge: null,
  hideOpBadge: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  deletedAt: null,
  deletedByUserId: null,
  countryCode: null,
  threadTag: null,
  threadBadgeHue: null,
  clientIpHash: "iphash",
  replyNotificationsMuted: false,
  pinnedAt: null,
  pollDisclosureOptionId: null,
  pollDisclosureOption: null,
});

const post = async (body: string) => {
  tx.comment.create.mockResolvedValue(row(body));
  commentFindUnique.mockResolvedValue(row(body));
  const result = await createCommentOnVox(
    "v1",
    { body },
    { userId: "u1", countryCode: null, clientIpRaw: "203.0.113.7" },
  );
  await Promise.all(afterTasks);
  return result;
};

describe("createCommentOnVox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    afterTasks.length = 0;
    tx.user.findUnique.mockResolvedValue({ username: "anon", lastCommentAt: null, role: "USER" });
    tx.voxFollow.findMany.mockResolvedValue([]);
  });

  it("bumps the vox and leaves it visible for a regular comment", async () => {
    const result = await post("Hola");
    expect(result.ok).toBe(true);
    expect(tx.vox.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { lastActivityAt: expect.any(Date) },
    });
    expect(tx.voxHide.upsert).not.toHaveBeenCalled();
    expect(broadcastVoxActivity).toHaveBeenCalledWith("v1", 5, { bump: true });
  });

  it("hides the vox for the author without bumping it when a line is >hide", async () => {
    const result = await post("malísimo\n>hide");
    expect(result.ok).toBe(true);
    expect(tx.voxHide.upsert).toHaveBeenCalledWith({
      where: { userId_voxId: { userId: "u1", voxId: "v1" } },
      create: { userId: "u1", voxId: "v1" },
      update: {},
    });
    expect(tx.vox.update).not.toHaveBeenCalled();
    expect(broadcastVoxActivity).toHaveBeenCalledWith("v1", 5, { bump: false });
  });
});
