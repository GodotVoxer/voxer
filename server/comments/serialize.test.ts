import { describe, expect, it } from "vitest";
import { AvatarVariant } from "@prisma/client";
import { toPublicComment } from "./serialize";

const base = {
  id: "c1",
  publicTag: "ABCDEFGH",
  voxId: "v1",
  body: "x",
  displayName: "u",
  imageUrl: null,
  videoUrl: null,
  videoPosterUrl: null,
  avatarVariant: AvatarVariant.BLUE,
  staffBadge: null,
  hideOpBadge: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  authorId: "a1",
  deletedAt: null,
  deletedByUserId: null,
  pollDisclosureOptionId: null,
  countryCode: null,
  clientIpHash: null,
  threadTag: "ABC",
  threadBadgeHue: 90,
  replyNotificationsMuted: true,
  pinnedAt: null,
  animatedImage: false,
};

describe("toPublicComment", () => {
  it("hides threadTag when the vox has no thread IDs", () => {
    const row = { ...base, pollDisclosureOption: null };
    const out = toPublicComment(row, false, { threadIdsEnabled: false });
    expect(out.threadTag).toBeNull();
    expect(out.isMine).toBe(false);
  });

  it("exposes threadTag when the vox has thread IDs and the row has one", () => {
    const row = { ...base, pollDisclosureOption: null };
    const out = toPublicComment(row, false, { threadIdsEnabled: true });
    expect(out.threadTag).toEqual({ text: "ABC", badgeHue: 90 });
  });

  it("sets isMine when the viewer is the author", () => {
    const row = { ...base, pollDisclosureOption: null };
    const out = toPublicComment(row, false, {
      threadIdsEnabled: false,
      viewerUserId: "a1",
    });
    expect(out.isMine).toBe(true);
  });
  it("exposes pinnedAt as ISO to every reader", () => {
    const pinnedAt = new Date("2026-02-03T04:05:06.000Z");
    expect(toPublicComment({ ...base, pollDisclosureOption: null }, false, {}).pinnedAt).toBeNull();
    expect(
      toPublicComment({ ...base, pinnedAt, pollDisclosureOption: null }, false, {}).pinnedAt,
    ).toBe("2026-02-03T04:05:06.000Z");
  });
  it("exposes the reply mute only to the author", () => {
    const row = { ...base, pollDisclosureOption: null };
    expect(toPublicComment(row, false, { viewerUserId: "a1" }).repliesMuted).toBe(true);
    expect(toPublicComment(row, false, { viewerUserId: "otro" }).repliesMuted).toBe(false);
    expect(toPublicComment(row, false, { viewerUserId: null }).repliesMuted).toBe(false);
  });
  it("does not mark as OP an owner who chose to hide it", () => {
    const row = { ...base, pollDisclosureOption: null };
    expect(toPublicComment(row, true, {}).isOp).toBe(true);
    expect(toPublicComment({ ...row, hideOpBadge: true }, true, {}).isOp).toBe(false);
    expect(toPublicComment({ ...row, hideOpBadge: true }, false, {}).isOp).toBe(false);
  });
});
