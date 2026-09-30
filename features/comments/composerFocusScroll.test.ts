import { describe, expect, it } from "vitest";
import { commentComposerFocusScrollDelta } from "@/features/comments/composerFocusScroll";

describe("commentComposerFocusScrollDelta", () => {
  it("does not move a composer that sits above the keyboard", () => {
    expect(
      commentComposerFocusScrollDelta({
        elementBottom: 224,
        viewportBottom: 700,
      }),
    ).toBe(0);
  });

  it("aligns the field's bottom edge right above the keyboard", () => {
    expect(
      commentComposerFocusScrollDelta({
        elementBottom: 620,
        viewportBottom: 600,
      }),
    ).toBe(30);
  });

  it("does not move a field that is fully visible", () => {
    expect(
      commentComposerFocusScrollDelta({
        elementBottom: 300,
        viewportBottom: 700,
      }),
    ).toBe(0);
  });
});
