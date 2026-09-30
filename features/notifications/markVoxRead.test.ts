import { describe, expect, it } from "vitest";
import { shouldMarkVoxNotificationsRead } from "@/features/notifications/markVoxRead";

const base = {
  hasSession: true,
  unreadNotifications: 3,
  voxId: "vox1",
  requestInFlight: false,
};

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

  it("marks the same vox again when another live notification arrives", () => {
    expect(shouldMarkVoxNotificationsRead({ ...base, unreadNotifications: 1 })).toBe(true);
    expect(shouldMarkVoxNotificationsRead({ ...base, unreadNotifications: 2 })).toBe(true);
  });

  it("ignores an empty id", () => {
    expect(shouldMarkVoxNotificationsRead({ ...base, voxId: "" })).toBe(false);
  });
});
