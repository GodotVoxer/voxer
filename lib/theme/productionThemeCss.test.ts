import { describe, expect, it } from "vitest";
import { assertProductionThemeCss } from "./productionThemeCss";
import { buildThemesCss, THEME_CSS_REVISION } from "./themesCss";

const utilities =
  ["pill-category", "pill-replies", "pill-poll", "media-chip"]
    .map((token) => `.bg-${token}{background-color:var(--${token})}`)
    .join("") + ".text-on-media{color:var(--on-media)}";
const css = () => buildThemesCss() + utilities;

describe("production theme CSS", () => {
  it("accepts both complete themes and their utilities", () => {
    expect(() => assertProductionThemeCss(css())).not.toThrow();
  });
  it("rejects older CSS without the new pill colors", () => {
    expect(() => assertProductionThemeCss(css().replace(/--pill-replies:.*?;/g, ""))).toThrow(
      "falta --pill-replies",
    );
  });
  it("checks the light theme even when the dark one is complete", () => {
    const start = css().indexOf('[data-theme="light"]');
    const broken =
      css().slice(0, start) +
      css()
        .slice(start)
        .replace(/--media-chip:.*?;/, "");
    expect(() => assertProductionThemeCss(broken)).toThrow("light: falta --media-chip");
  });
  it("rejects a stale build even with the same keys", () => {
    expect(() => assertProductionThemeCss(css().replaceAll(THEME_CSS_REVISION, "old"))).toThrow(
      "revisión de CSS ausente o desactualizada",
    );
  });
  it("does not mistake @theme mappings for compiled utilities", () => {
    expect(() => assertProductionThemeCss(buildThemesCss())).toThrow(
      "falta utilidad .bg-pill-category",
    );
  });
});
