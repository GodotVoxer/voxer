import { describe, expect, it } from "vitest";
import { voxCardTitleLineClampFromHeights } from "./cardTitleLineClamp";

describe("voxCardTitleLineClampFromHeights", () => {
  it("returns floor(usable / lh) bounded by 2 and 99", () => {
    expect(voxCardTitleLineClampFromHeights(100, 22)).toBe(4);
    expect(voxCardTitleLineClampFromHeights(44, 22)).toBe(2);
    expect(voxCardTitleLineClampFromHeights(43, 22)).toBe(2);
  });

  it("never returns below 2", () => {
    expect(voxCardTitleLineClampFromHeights(0, 22)).toBe(2);
    expect(voxCardTitleLineClampFromHeights(10, 100)).toBe(2);
    expect(voxCardTitleLineClampFromHeights(-5, 20)).toBe(2);
  });

  it("caps at 99", () => {
    expect(voxCardTitleLineClampFromHeights(5000, 20)).toBe(99);
  });

  it("handles non-finite inputs", () => {
    expect(voxCardTitleLineClampFromHeights(Number.NaN, 20)).toBe(2);
    expect(voxCardTitleLineClampFromHeights(100, Number.NaN)).toBe(2);
  });
});
