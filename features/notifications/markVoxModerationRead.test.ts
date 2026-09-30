import { describe, expect, it } from "vitest";
import { shouldMarkVoxModerationNotificationsRead } from "@/features/notifications/markVoxModerationRead";

const base = {
  cameFromReportPush: true,
  isStaff: true,
  unreadModerationNotifications: 1,
  voxId: "vox-1",
  alreadyAttempted: false,
};

describe("shouldMarkVoxModerationNotificationsRead", () => {
  it("marks a pending report when arriving from its push", () => {
    expect(shouldMarkVoxModerationNotificationsRead(base)).toBe(true);
  });

  it("does not mark on a regular visit or for non-staff users", () => {
    expect(shouldMarkVoxModerationNotificationsRead({ ...base, cameFromReportPush: false })).toBe(
      false,
    );
    expect(shouldMarkVoxModerationNotificationsRead({ ...base, isStaff: false })).toBe(false);
  });

  it("avoids useless or repeated requests", () => {
    expect(
      shouldMarkVoxModerationNotificationsRead({
        ...base,
        unreadModerationNotifications: 0,
      }),
    ).toBe(false);
    expect(shouldMarkVoxModerationNotificationsRead({ ...base, alreadyAttempted: true })).toBe(
      false,
    );
  });
});
