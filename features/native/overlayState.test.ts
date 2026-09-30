import { describe, expect, it } from "vitest";
import { countOpenOverlays, hasOpenOverlay } from "@/features/native/overlayState";

/** Minimal DOM: only `querySelectorAll` is needed, so no jsdom. */
const fakeRoot = (matches: number): ParentNode =>
  ({
    querySelectorAll: (selector: string) => {
      expect(selector).toContain('[role="dialog"]');
      expect(selector).toContain('[data-state="open"]');
      return { length: matches } as unknown as NodeListOf<Element>;
    },
  }) as unknown as ParentNode;

describe("countOpenOverlays", () => {
  it("counts open layers", () => {
    expect(countOpenOverlays(fakeRoot(0))).toBe(0);
    expect(countOpenOverlays(fakeRoot(2))).toBe(2);
  });

  it("hasOpenOverlay reflects the count", () => {
    expect(hasOpenOverlay(fakeRoot(0))).toBe(false);
    expect(hasOpenOverlay(fakeRoot(1))).toBe(true);
  });
});
