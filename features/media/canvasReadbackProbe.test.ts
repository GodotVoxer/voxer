import { describe, expect, it } from "vitest";
import { expectedProbePixels, probePixelsAreFaithful } from "@/features/media/canvasReadbackProbe";

/** What Firefox's `GeneratePlaceholderCanvasData` returns: 32 random bytes repeated. */
const firefoxPlaceholder = (length: number, seed: number): Uint8ClampedArray => {
  const sample = Array.from({ length: 32 }, (_, i) => (seed * 97 + i * 53) % 256);
  return Uint8ClampedArray.from({ length }, (_, i) => sample[i % 32]);
};

describe("probePixelsAreFaithful", () => {
  it("accepts an exact readback", () => {
    expect(probePixelsAreFaithful(expectedProbePixels())).toBe(true);
  });

  it("accepts the low-bit noise of Firefox's canvas randomization", () => {
    const noisy = expectedProbePixels().map((v, i) =>
      i % 4 === 3 ? v : v ^ (i % 3 === 0 ? 2 : 1),
    );
    expect(probePixelsAreFaithful(noisy)).toBe(true);
  });

  it("rejects Firefox's random placeholder", () => {
    const length = expectedProbePixels().length;
    for (let seed = 0; seed < 50; seed++) {
      expect(probePixelsAreFaithful(firefoxPlaceholder(length, seed))).toBe(false);
    }
  });

  it("rejects an all-white placeholder", () => {
    expect(probePixelsAreFaithful(expectedProbePixels().fill(255))).toBe(false);
  });

  it("rejects a readback of the wrong size", () => {
    expect(probePixelsAreFaithful(expectedProbePixels().subarray(4))).toBe(false);
  });
});
