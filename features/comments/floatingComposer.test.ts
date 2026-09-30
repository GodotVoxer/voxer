import { describe, expect, it } from "vitest";
import {
  isComposerSlotVisible,
  isRectOnScreen,
  transformCoveringRect,
} from "@/features/comments/floatingComposer";

const viewport = { top: 100, bottom: 900 };

describe("isComposerSlotVisible", () => {
  it("is visible when the slot is fully inside the viewport", () => {
    expect(isComposerSlotVisible({ top: 100, bottom: 400 }, viewport)).toBe(true);
  });

  it("is visible when at least half of the slot is on screen", () => {
    expect(isComposerSlotVisible({ top: -50, bottom: 250 }, viewport)).toBe(true);
  });

  it("is hidden when less than half of the slot is on screen", () => {
    expect(isComposerSlotVisible({ top: -100, bottom: 200 }, viewport)).toBe(false);
  });

  it("is hidden when the slot is scrolled out of view", () => {
    expect(isComposerSlotVisible({ top: -400, bottom: 0 }, viewport)).toBe(false);
  });

  it("is hidden when the slot has no height", () => {
    expect(isComposerSlotVisible({ top: 200, bottom: 200 }, viewport)).toBe(false);
  });
});

describe("transformCoveringRect", () => {
  it("moves the target's center onto the source and scales it to the source size", () => {
    expect(
      transformCoveringRect(
        { left: 900, top: 500, width: 100, height: 20 },
        { left: 100, top: 300, width: 400, height: 200 },
      ),
    ).toBe("translate(650px, 110px) scale(0.25, 0.1)");
  });

  it("is the identity for the same rect", () => {
    const rect = { left: 10, top: 20, width: 30, height: 40 };
    expect(transformCoveringRect(rect, rect)).toBe("translate(0px, 0px) scale(1, 1)");
  });
});

describe("isRectOnScreen", () => {
  const screen = { width: 1000, height: 800 };

  it("accepts a rect partially inside the viewport", () => {
    expect(isRectOnScreen({ left: -20, top: 790, width: 50, height: 30 }, screen)).toBe(true);
  });

  it("rejects a rect above or below the viewport", () => {
    expect(isRectOnScreen({ left: 10, top: -40, width: 50, height: 30 }, screen)).toBe(false);
    expect(isRectOnScreen({ left: 10, top: 800, width: 50, height: 30 }, screen)).toBe(false);
  });

  it("rejects an element that is not laid out", () => {
    expect(isRectOnScreen({ left: 0, top: 0, width: 0, height: 0 }, screen)).toBe(false);
  });
});
