import { describe, expect, it } from "vitest";
import {
  newestSeenCommentAt,
  shouldMarkVoxNotificationsRead,
  voxNotificationsCaughtUp,
  type VoxReadAttempt,
} from "@/features/notifications/markVoxRead";

const SEEN = "2026-05-01T12:00:00.000Z";
const LATER = "2026-05-01T12:05:00.000Z";

const base = {
  hasSession: true,
  unreadNotifications: 3,
  voxId: "vox1",
  threadOnScreen: true,
  seenThrough: SEEN,
  requestInFlight: false,
  lastAttempt: null,
};

const attempt = (overrides: Partial<VoxReadAttempt> = {}): VoxReadAttempt => ({
  voxId: "vox1",
  unreadNotifications: 3,
  seenThrough: SEEN,
  remaining: 0,
  ...overrides,
});

describe("newestSeenCommentAt", () => {
  it("returns the latest createdAt whatever the order of the list", () => {
    expect(
      newestSeenCommentAt([
        { createdAt: SEEN },
        { createdAt: LATER },
        { createdAt: "2026-04-30T23:59:59.999Z" },
      ]),
    ).toBe(LATER);
  });

  it("returns null without comments", () => {
    expect(newestSeenCommentAt([])).toBeNull();
  });
});

describe("shouldMarkVoxNotificationsRead", () => {
  it("marks when there is a session and unread notifications", () => {
    expect(shouldMarkVoxNotificationsRead(base)).toBe(true);
  });

  it("does nothing without a session", () => {
    expect(shouldMarkVoxNotificationsRead({ ...base, hasSession: false })).toBe(false);
  });

  it("skips the request when nothing is unread", () => {
    expect(shouldMarkVoxNotificationsRead({ ...base, unreadNotifications: 0 })).toBe(false);
  });

  it("does not start a second request while one is in flight", () => {
    expect(shouldMarkVoxNotificationsRead({ ...base, requestInFlight: true })).toBe(false);
  });

  it("ignores an empty id", () => {
    expect(shouldMarkVoxNotificationsRead({ ...base, voxId: "" })).toBe(false);
  });

  it("waits until the thread is on screen", () => {
    expect(shouldMarkVoxNotificationsRead({ ...base, threadOnScreen: false })).toBe(false);
  });

  it("asks again when another live notification arrives", () => {
    expect(
      shouldMarkVoxNotificationsRead({
        ...base,
        unreadNotifications: 4,
        lastAttempt: attempt({ remaining: 1 }),
      }),
    ).toBe(true);
  });

  it("does not repeat a request that would get the same answer", () => {
    expect(
      shouldMarkVoxNotificationsRead({ ...base, lastAttempt: attempt({ remaining: 2 }) }),
    ).toBe(false);
  });

  it("asks again when pending comments are revealed and some notifications were left", () => {
    expect(
      shouldMarkVoxNotificationsRead({
        ...base,
        seenThrough: LATER,
        lastAttempt: attempt({ remaining: 2 }),
      }),
    ).toBe(true);
  });

  it("stays quiet on new comments when the vox has nothing left unread", () => {
    expect(
      shouldMarkVoxNotificationsRead({
        ...base,
        seenThrough: LATER,
        lastAttempt: attempt({ remaining: 0 }),
      }),
    ).toBe(false);
  });

  it("starts over on another vox", () => {
    expect(shouldMarkVoxNotificationsRead({ ...base, voxId: "vox2", lastAttempt: attempt() })).toBe(
      true,
    );
  });
});

describe("voxNotificationsCaughtUp", () => {
  it("is caught up with nothing unread", () => {
    expect(
      voxNotificationsCaughtUp({ unreadNotifications: 0, voxId: "vox1", lastAttempt: null }),
    ).toBe(true);
  });

  it("is not caught up until the server has answered for the current count", () => {
    const input = { unreadNotifications: 3, voxId: "vox1" };
    expect(voxNotificationsCaughtUp({ ...input, lastAttempt: null })).toBe(false);
    expect(
      voxNotificationsCaughtUp({ ...input, lastAttempt: attempt({ unreadNotifications: 2 }) }),
    ).toBe(false);
    expect(voxNotificationsCaughtUp({ ...input, lastAttempt: attempt({ voxId: "vox2" }) })).toBe(
      false,
    );
  });

  it("is not caught up while the vox keeps notifications of unseen comments", () => {
    expect(
      voxNotificationsCaughtUp({
        unreadNotifications: 3,
        voxId: "vox1",
        lastAttempt: attempt({ remaining: 1 }),
      }),
    ).toBe(false);
  });

  it("is caught up when the unread ones belong to other voxes", () => {
    expect(
      voxNotificationsCaughtUp({ unreadNotifications: 3, voxId: "vox1", lastAttempt: attempt() }),
    ).toBe(true);
  });
});
