import { describe, expect, it } from "vitest";
import {
  scaleToFitMaxSide,
  shouldSkipMimeForClientImagePrep,
} from "@/features/media/clientImagePrep";
import { CLIENT_IMAGE_UPLOAD_MAX_SIDE_PX } from "@/lib/media/uploadLimits";

describe("scaleToFitMaxSide", () => {
  it("does not upscale when it already fits", () => {
    expect(scaleToFitMaxSide(800, 600, 2048)).toEqual({ width: 800, height: 600 });
  });
  it("shrinks the longest side keeping the ratio", () => {
    expect(scaleToFitMaxSide(4000, 2000, 2000)).toEqual({ width: 2000, height: 1000 });
  });
  it("uses the product constant as the usual maximum", () => {
    const { width, height } = scaleToFitMaxSide(5000, 3000, CLIENT_IMAGE_UPLOAD_MAX_SIDE_PX);
    expect(Math.max(width, height)).toBe(CLIENT_IMAGE_UPLOAD_MAX_SIDE_PX);
    expect(width / height).toBeCloseTo(5000 / 3000, 2);
  });
});

describe("shouldSkipMimeForClientImagePrep", () => {
  it("skips GIFs and non-images", () => {
    expect(shouldSkipMimeForClientImagePrep("image/gif")).toBe(true);
    expect(shouldSkipMimeForClientImagePrep("video/mp4")).toBe(true);
    expect(shouldSkipMimeForClientImagePrep("")).toBe(true);
  });
  it("accepts jpeg, png and webp", () => {
    expect(shouldSkipMimeForClientImagePrep("image/jpeg")).toBe(false);
    expect(shouldSkipMimeForClientImagePrep("image/png")).toBe(false);
    expect(shouldSkipMimeForClientImagePrep("image/webp")).toBe(false);
  });
});
