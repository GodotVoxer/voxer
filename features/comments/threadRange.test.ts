import { describe, expect, it } from "vitest";
import { rangeWithPinnedIndexes } from "@/features/comments/threadRange";

const range = { startIndex: 10, endIndex: 12, overscan: 0, count: 50 };

describe("rangeWithPinnedIndexes", () => {
  it("returns the usual range without pinned rows", () => {
    expect(rangeWithPinnedIndexes(range, [])).toEqual([10, 11, 12]);
  });

  it("adds the pinned row and keeps the range sorted", () => {
    expect(rangeWithPinnedIndexes(range, [2])).toEqual([2, 10, 11, 12]);
  });

  it("does not duplicate a row already in range", () => {
    expect(rangeWithPinnedIndexes(range, [11, 11])).toEqual([10, 11, 12]);
  });

  it("drops indexes outside the list", () => {
    expect(rangeWithPinnedIndexes(range, [-1, 50, 99, 1.5])).toEqual([10, 11, 12]);
  });

  it("accepts several pinned rows", () => {
    expect(rangeWithPinnedIndexes(range, [40, 3])).toEqual([3, 10, 11, 12, 40]);
  });
});
