import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GLOBALS_CSS_PATH, THEME_TOKENS_END_MARKER } from "@/lib/theme/themesCss";

const ROOT = path.resolve(__dirname, "../..");
const SCAN_DIRS = ["components", "app", "hooks", "lib"];

const PALETTE_CLASS_RE =
  /(?<![\w/[-])(?:bg|text|border(?:-[trblxyse])?|ring-offset|ring|from|via|to|fill|stroke|outline|divide|shadow|placeholder|decoration|caret|accent)-(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|[1-9]00|950))(?![\w-])/g;
const ARBITRARY_HEX_CLASS_RE =
  /(?<![\w-])(?:bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|caret|accent)-\[#[0-9a-fA-F]{3,8}\]/g;
/** Fixed colors in shadows or inline styles, e.g. `rgb(0 0 0/…)`; `hsl(${hue} …)` from data is allowed. */
const NUMERIC_COLOR_FN_RE = /(?:rgba?|hsla?|oklch)\(\s*\d/g;
const CSS_HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const abs = path.join(dir, name);
    if (statSync(abs).isDirectory()) return walk(abs);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts") ? [abs] : [];
  });

const matchesByLine = (rel: string, source: string, patterns: RegExp[]): string[] =>
  source
    .split("\n")
    .flatMap((line, i) =>
      patterns.flatMap((re) => Array.from(line.matchAll(re), (m) => `${rel}:${i + 1} ${m[0]}`)),
    );

describe("theme token usage", () => {
  it("product code uses no fixed colors: everything goes through editable tokens", () => {
    const hits = SCAN_DIRS.flatMap((dir) =>
      walk(path.join(ROOT, dir))
        .filter((abs) => !abs.includes(`${path.sep}lib${path.sep}theme${path.sep}`))
        .flatMap((abs) => {
          const rel = path.relative(ROOT, abs).split(path.sep).join("/");
          return matchesByLine(rel, readFileSync(abs, "utf8"), [
            PALETTE_CLASS_RE,
            ARBITRARY_HEX_CLASS_RE,
            NUMERIC_COLOR_FN_RE,
          ]);
        }),
    );
    expect(hits).toEqual([]);
  });

  it("the hand-written CSS in globals.css (outside the generated block) fixes no colors", () => {
    const css = readFileSync(path.join(ROOT, GLOBALS_CSS_PATH), "utf8");
    const handWritten = css
      .slice(css.indexOf(THEME_TOKENS_END_MARKER))
      .replace(/^\s*--chart-\d:.*$/gm, "");
    expect(matchesByLine(GLOBALS_CSS_PATH, handWritten, [NUMERIC_COLOR_FN_RE, CSS_HEX_RE])).toEqual(
      [],
    );
  });
});
