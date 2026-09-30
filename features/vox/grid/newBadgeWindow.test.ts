import { describe, expect, it } from "vitest";
import {
  isCreatedAtWithinNewBadgeWindow,
  VOX_NEW_BADGE_WINDOW_MS,
} from "@/features/vox/grid/newBadgeWindow";

describe("isCreatedAtWithinNewBadgeWindow", () => {
  it("returns true just inside the window", () => {
    const now = 1_700_000_000_000;
    const created = new Date(now - VOX_NEW_BADGE_WINDOW_MS + 1000).toISOString();
    expect(isCreatedAtWithinNewBadgeWindow(created, now)).toBe(true);
  });

  it("returns false at the window boundary", () => {
    const now = 1_700_000_000_000;
    const created = new Date(now - VOX_NEW_BADGE_WINDOW_MS).toISOString();
    expect(isCreatedAtWithinNewBadgeWindow(created, now)).toBe(false);
  });

  it("returns false for invalid dates", () => {
    expect(isCreatedAtWithinNewBadgeWindow("not-a-date", 1)).toBe(false);
  });

  it("returns false when created is in the future", () => {
    const now = 1_700_000_000_000;
    const created = new Date(now + 60_000).toISOString();
    expect(isCreatedAtWithinNewBadgeWindow(created, now)).toBe(false);
  });
});
