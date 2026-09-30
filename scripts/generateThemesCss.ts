import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { GLOBALS_CSS_PATH, withGeneratedThemesCss } from "../lib/theme/themesCss";

const target = path.join(process.cwd(), GLOBALS_CSS_PATH);
writeFileSync(target, withGeneratedThemesCss(readFileSync(target, "utf8")));
console.log(`Theme tokens written to ${GLOBALS_CSS_PATH}`);
