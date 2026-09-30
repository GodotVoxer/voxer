import { describe, expect, it } from "vitest";
import { themePreferenceUpdateSchema } from "./themePreferenceSchema";

describe("themePreferenceUpdateSchema", () => {
  it.each(["dark", "light", "system"])("accepts %s", (mode) => {
    expect(themePreferenceUpdateSchema.parse({ mode })).toEqual({ mode });
  });

  it("accepts a custom theme with an id", () => {
    expect(themePreferenceUpdateSchema.parse({ mode: "custom", themeId: "clx9abc" })).toEqual({
      mode: "custom",
      themeId: "clx9abc",
    });
  });

  it.each([
    {},
    { mode: "DARK" },
    { mode: "sepia" },
    { mode: 1 },
    { mode: "light", extra: true },
    { mode: "light; background:url(x)" },
    { mode: "custom" },
    { mode: "custom", themeId: "" },
    { mode: "custom", themeId: "../otro" },
    { mode: "custom", themeId: "a".repeat(65) },
    { mode: "dark", themeId: "clx9abc" },
    null,
    "light",
  ])("rechaza %j", (body) => {
    expect(themePreferenceUpdateSchema.safeParse(body).success).toBe(false);
  });
});
