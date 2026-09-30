import { describe, expect, it } from "vitest";
import {
  SIDEBAR_BRAND_LOGO_HEIGHT_PX,
  SIDEBAR_BRAND_LOGO_OBJECT_POSITION,
  SIDEBAR_BRAND_LOGO_SAFE_OBJECT_POSITION,
} from "./sidebarBrandLogoCrop";

describe("sidebarBrandLogoCrop", () => {
  it("defines a sensible crop for the banner", () => {
    expect(SIDEBAR_BRAND_LOGO_OBJECT_POSITION).toMatch(/^\d+%\s+\d+%$/);
    expect(SIDEBAR_BRAND_LOGO_HEIGHT_PX).toBeGreaterThan(48);
    expect(SIDEBAR_BRAND_LOGO_HEIGHT_PX).toBeLessThan(200);
  });

  it("moves the logo down exactly the top inset (the Y fraction and the rest add up to 1)", () => {
    const [, x, y] = SIDEBAR_BRAND_LOGO_OBJECT_POSITION.match(/^(\d+)%\s+(\d+)%$/) ?? [];
    const safe = SIDEBAR_BRAND_LOGO_SAFE_OBJECT_POSITION.match(
      /^(\d+)% calc\((\d+)% \+ env\(safe-area-inset-top, 0px\) \* ([\d.]+)\)$/,
    );
    expect(safe?.[1]).toBe(x);
    expect(safe?.[2]).toBe(y);
    expect(Number(y) / 100 + Number(safe?.[3])).toBeCloseTo(1);
  });
});
