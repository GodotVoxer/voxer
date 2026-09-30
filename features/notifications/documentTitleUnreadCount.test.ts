import { describe, expect, it } from "vitest";
import { stripUnreadCountFromTitle, titleWithUnreadCount } from "./documentTitleUnreadCount";

describe("titleWithUnreadCount", () => {
  it("prefixes the number of unread notifications", () => {
    expect(titleWithUnreadCount("Voxer | Un vox", 5)).toBe("(5) Voxer | Un vox");
  });

  it("leaves the title clean without notifications", () => {
    expect(titleWithUnreadCount("Voxer", 0)).toBe("Voxer");
    expect(titleWithUnreadCount("(3) Voxer", 0)).toBe("Voxer");
  });

  it("replaces the previous prefix instead of stacking it", () => {
    expect(titleWithUnreadCount("(3) Voxer | Un vox", 4)).toBe("(4) Voxer | Un vox");
    expect(titleWithUnreadCount(titleWithUnreadCount("Voxer", 2), 2)).toBe("(2) Voxer");
  });

  it("caps large numbers", () => {
    expect(titleWithUnreadCount("Voxer", 150)).toBe("(99+) Voxer");
    expect(titleWithUnreadCount("(99+) Voxer", 1)).toBe("(1) Voxer");
  });

  it("leaves a parenthesis that belongs to the title alone", () => {
    expect(stripUnreadCountFromTitle("Voxer | (2) cosas")).toBe("Voxer | (2) cosas");
  });
});
