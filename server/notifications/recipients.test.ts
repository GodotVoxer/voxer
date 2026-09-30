import { describe, expect, it } from "vitest";
import { NotificationType } from "@prisma/client";
import { buildCommentNotificationRows } from "./recipients";
describe("buildCommentNotificationRows", () => {
  const base = {
    voxTitle: "Mi vox de prueba",
    voxThumbnailUrl: "/t.jpg",
    voxOwnerId: "owner1" as string | null,
    newCommentAuthorId: "author1",
    newCommentId: "c-new",
    replyTagsDistinct: [] as string[],
    parentByTagUpper: new Map(),
    followerUserIds: [] as string[],
  };
  it("notifies the vox owner when someone else comments", () => {
    const rows = buildCommentNotificationRows({
      ...base,
      voxOwnerId: "owner1",
      newCommentAuthorId: "author1",
      followerUserIds: ["owner1"],
    });
    expect(rows).toEqual([
      expect.objectContaining({
        userId: "owner1",
        type: NotificationType.COMMENT_ON_YOUR_VOX,
      }),
    ]);
  });
  it("does not notify an owner who unfollowed their vox", () => {
    const rows = buildCommentNotificationRows({
      ...base,
      voxOwnerId: "owner1",
      newCommentAuthorId: "author1",
      followerUserIds: ["f1"],
    });
    expect(rows).toEqual([
      expect.objectContaining({ userId: "f1", type: NotificationType.COMMENT_ON_FOLLOWED_VOX }),
    ]);
  });
  it("does not notify the owner of their own comment", () => {
    const rows = buildCommentNotificationRows({
      ...base,
      voxOwnerId: "owner1",
      newCommentAuthorId: "owner1",
      followerUserIds: ["owner1"],
    });
    expect(rows).toHaveLength(0);
  });
  it("prefers the reply (>>TAG) over the followed-vox notification for the same user", () => {
    const rows = buildCommentNotificationRows({
      ...base,
      voxOwnerId: "u-replied",
      newCommentAuthorId: "author1",
      replyTagsDistinct: ["ABCD1234"],
      parentByTagUpper: new Map([
        [
          "ABCD1234",
          {
            id: "parent-c",
            publicTag: "abcd1234",
            authorId: "u-replied",
            replyNotificationsMuted: false,
          },
        ],
      ]),
      followerUserIds: ["u-replied"],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.type).toBe(NotificationType.REPLY_TO_COMMENT);
    expect(rows[0]!.userId).toBe("u-replied");
    expect(rows[0]!.relatedCommentId).toBe("c-new");
  });
  it("notifies followers except the author and the owner", () => {
    const rows = buildCommentNotificationRows({
      ...base,
      voxOwnerId: "owner1",
      newCommentAuthorId: "author1",
      followerUserIds: ["f1", "owner1", "author1", "f2"],
    });
    const ids = new Set(rows.map((r) => r.userId));
    expect(ids.has("owner1")).toBe(true);
    expect(ids.has("f1")).toBe(true);
    expect(ids.has("f2")).toBe(true);
    expect(ids.has("author1")).toBe(false);
  });
  it("does not notify replies to a comment its author muted", () => {
    const rows = buildCommentNotificationRows({
      ...base,
      voxOwnerId: null,
      replyTagsDistinct: ["ABCD1234"],
      parentByTagUpper: new Map([
        [
          "ABCD1234",
          { id: "p", publicTag: "abcd1234", authorId: "u-muted", replyNotificationsMuted: true },
        ],
      ]),
    });
    expect(rows).toHaveLength(0);
  });
  it("still notifies when the same author has another quoted comment that is not muted", () => {
    const rows = buildCommentNotificationRows({
      ...base,
      voxOwnerId: null,
      replyTagsDistinct: ["AAAA1111", "BBBB2222"],
      parentByTagUpper: new Map([
        [
          "AAAA1111",
          { id: "p1", publicTag: "aaaa1111", authorId: "u1", replyNotificationsMuted: true },
        ],
        [
          "BBBB2222",
          { id: "p2", publicTag: "bbbb2222", authorId: "u1", replyNotificationsMuted: false },
        ],
      ]),
    });
    expect(rows).toEqual([
      expect.objectContaining({ userId: "u1", type: NotificationType.REPLY_TO_COMMENT }),
    ]);
  });
});
