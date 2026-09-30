import { describe, expect, it } from "vitest";
import { groupCommentPushRecipients } from "@/server/push/recipients";

const OPTS = { max: 200 };

describe("groupCommentPushRecipients", () => {
  it("groups by type so each group gets its own title", () => {
    const groups = groupCommentPushRecipients(
      [
        { userId: "a", type: "REPLY_TO_COMMENT" },
        { userId: "b", type: "REPLY_TO_COMMENT" },
        { userId: "c", type: "COMMENT_ON_YOUR_VOX" },
      ],
      OPTS,
    );
    expect(groups).toEqual([
      { type: "REPLY_TO_COMMENT", userIds: ["a", "b"] },
      { type: "COMMENT_ON_YOUR_VOX", userIds: ["c"] },
    ]);
  });

  it("includes the vox followers", () => {
    const rows = [
      { userId: "a", type: "REPLY_TO_COMMENT" as const },
      { userId: "b", type: "COMMENT_ON_FOLLOWED_VOX" as const },
    ];
    expect(groupCommentPushRecipients(rows, OPTS)).toEqual([
      { type: "REPLY_TO_COMMENT", userIds: ["a"] },
      { type: "COMMENT_ON_FOLLOWED_VOX", userIds: ["b"] },
    ]);
  });

  it("never sends two pushes to the same user and keeps the highest priority", () => {
    const groups = groupCommentPushRecipients(
      [
        { userId: "a", type: "COMMENT_ON_YOUR_VOX" },
        { userId: "a", type: "REPLY_TO_COMMENT" },
      ],
      OPTS,
    );
    expect(groups).toEqual([{ type: "REPLY_TO_COMMENT", userIds: ["a"] }]);
  });

  it("keeps the most targeted recipients when capping", () => {
    const groups = groupCommentPushRecipients(
      [
        { userId: "seguidor", type: "COMMENT_ON_FOLLOWED_VOX" },
        { userId: "duenio", type: "COMMENT_ON_YOUR_VOX" },
        { userId: "respondido", type: "REPLY_TO_COMMENT" },
      ],
      { max: 2 },
    );
    expect(groups).toEqual([
      { type: "REPLY_TO_COMMENT", userIds: ["respondido"] },
      { type: "COMMENT_ON_YOUR_VOX", userIds: ["duenio"] },
    ]);
  });

  it("returns an empty list without recipients", () => {
    expect(groupCommentPushRecipients([], OPTS)).toEqual([]);
    expect(groupCommentPushRecipients([], { ...OPTS, max: 0 })).toEqual([]);
  });
});
