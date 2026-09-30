import { describe, expect, it } from "vitest";
import { CUSTOM_THEME_OVERRIDE_KEYS } from "./customTheme";
import { CUSTOM_THEME_EDITOR_GROUPS, contrastTokenLabel } from "./customThemeLabels";
import { CONTRAST_PAIRS } from "./themeTokens";

describe("theme editor sections", () => {
  it("every editable color appears in exactly one section", () => {
    const listed = CUSTOM_THEME_EDITOR_GROUPS.flatMap((group) => group.keys);
    expect([...listed].sort()).toEqual([...CUSTOM_THEME_OVERRIDE_KEYS].sort());
    expect(new Set(listed).size).toBe(listed.length);
  });

  it("contrast warnings use readable names", () => {
    for (const { fg, bg } of CONTRAST_PAIRS) {
      expect(contrastTokenLabel(fg)).not.toBe(fg);
      expect(contrastTokenLabel(bg)).not.toBe(bg);
    }
  });
});
