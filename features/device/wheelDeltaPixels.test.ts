import { describe, expect, it } from "vitest";
import { wheelDeltaPixels } from "./wheelDeltaPixels";

describe("wheelDeltaPixels", () => {
  it("scales line events (deltaMode = 1, typically Firefox) to 40px per line", () => {
    expect(wheelDeltaPixels({ deltaY: 3, deltaMode: 1 }, 800)).toBe(120);
    expect(wheelDeltaPixels({ deltaY: -3, deltaMode: 1 }, 800)).toBe(-120);
    expect(wheelDeltaPixels({ deltaY: 1, deltaMode: 1 }, 800)).toBe(40);
  });

  it("scales page events (deltaMode = 2) by the viewport height", () => {
    expect(wheelDeltaPixels({ deltaY: 1, deltaMode: 2 }, 800)).toBe(800);
    expect(wheelDeltaPixels({ deltaY: -1, deltaMode: 2 }, 800)).toBe(-800);
  });

  it("normalizes physical wheel notches on macOS (Chrome/Safari) with a tiny deltaY but a wheelDelta of 120", () => {
    // One notch down in macOS Chrome: deltaY = 4, wheelDelta = -120
    expect(
      wheelDeltaPixels({ deltaY: 4, deltaMode: 0, wheelDelta: -120, wheelDeltaY: -120 }, 800),
    ).toBe(100);

    // One notch up in macOS Chrome: deltaY = -4, wheelDelta = 120
    expect(
      wheelDeltaPixels({ deltaY: -4, deltaMode: 0, wheelDelta: 120, wheelDeltaY: 120 }, 800),
    ).toBe(-100);

    // Two quick notches in macOS Chrome: wheelDelta = -240
    expect(
      wheelDeltaPixels({ deltaY: 8, deltaMode: 0, wheelDelta: -240, wheelDeltaY: -240 }, 800),
    ).toBe(200);
  });

  it("leaves trackpad events alone (continuous, fractional values)", () => {
    // Mac trackpad gesture: continuous deltaY, wheelDelta not a multiple of 120
    expect(
      wheelDeltaPixels({ deltaY: 5.25, deltaMode: 0, wheelDelta: -16, wheelDeltaY: -16 }, 800),
    ).toBe(5.25);

    expect(
      wheelDeltaPixels({ deltaY: -12.8, deltaMode: 0, wheelDelta: 38, wheelDeltaY: 38 }, 800),
    ).toBe(-12.8);
  });

  it("leaves already scaled deltaY values alone on Windows Chrome (deltaY >= 40)", () => {
    expect(
      wheelDeltaPixels({ deltaY: 100, deltaMode: 0, wheelDelta: -120, wheelDeltaY: -120 }, 800),
    ).toBe(100);

    expect(
      wheelDeltaPixels({ deltaY: -120, deltaMode: 0, wheelDelta: 120, wheelDeltaY: 120 }, 800),
    ).toBe(-120);
  });
});
