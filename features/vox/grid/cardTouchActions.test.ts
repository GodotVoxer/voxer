import { describe, expect, it } from "vitest";
import {
  isSecondaryVoxCardLink,
  shouldPinVoxCardActions,
  VOX_CARD_NAV_DATA_ATTR,
} from "./cardTouchActions";

describe("shouldPinVoxCardActions", () => {
  it("returns true for touch and pen", () => {
    expect(shouldPinVoxCardActions("touch")).toBe(true);
    expect(shouldPinVoxCardActions("pen")).toBe(true);
  });

  it("returns false for mouse and empty types", () => {
    expect(shouldPinVoxCardActions("mouse")).toBe(false);
    expect(shouldPinVoxCardActions("")).toBe(false);
  });
});

describe("isSecondaryVoxCardLink", () => {
  const mockAnchor = (attrs: string[]) =>
    ({
      hasAttribute: (name: string) => attrs.includes(name),
    }) as Element;

  it("treats the main navigation link as primary", () => {
    const nav = mockAnchor(["href", VOX_CARD_NAV_DATA_ATTR]);
    expect(isSecondaryVoxCardLink(nav)).toBe(false);
  });

  it("treats category and other internal links as secondary", () => {
    const category = mockAnchor(["href"]);
    expect(isSecondaryVoxCardLink(category)).toBe(true);
  });
});
