import { describe, expect, it } from "vitest";
import { canMeasureVoxGridTrack } from "./trackGate";

describe("canMeasureVoxGridTrack", () => {
  it("is false while loading or on error", () => {
    expect(
      canMeasureVoxGridTrack({
        loadingInitial: true,
        error: null,
        itemCount: 3,
      }),
    ).toBe(false);
    expect(
      canMeasureVoxGridTrack({
        loadingInitial: false,
        error: "x",
        itemCount: 3,
      }),
    ).toBe(false);
  });

  it("is false without visible items", () => {
    expect(
      canMeasureVoxGridTrack({
        loadingInitial: false,
        error: null,
        itemCount: 0,
      }),
    ).toBe(false);
  });

  it("is true with data ready", () => {
    expect(
      canMeasureVoxGridTrack({
        loadingInitial: false,
        error: null,
        itemCount: 2,
      }),
    ).toBe(true);
  });
});
