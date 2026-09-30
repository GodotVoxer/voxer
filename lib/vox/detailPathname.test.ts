import { describe, expect, it } from "vitest";
import { voxIdFromDetailPathname } from "./detailPathname";

describe("voxIdFromDetailPathname", () => {
  it("returns the detail id", () => {
    expect(voxIdFromDetailPathname("/vox/abc123")).toBe("abc123");
    expect(voxIdFromDetailPathname("/vox/abc123/")).toBe("abc123");
  });

  it("ignores routes other than the detail", () => {
    expect(voxIdFromDetailPathname("/")).toBeNull();
    expect(voxIdFromDetailPathname("/vox")).toBeNull();
    expect(voxIdFromDetailPathname("/vox/abc123/extra")).toBeNull();
    expect(voxIdFromDetailPathname(null)).toBeNull();
  });

  it("survives malformed percent escapes", () => {
    expect(voxIdFromDetailPathname("/vox/%E0%A4%A")).toBe("%E0%A4%A");
  });
});
