import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { assertProductionThemeCss } from "../lib/theme/productionThemeCss";

const staticDir = path.resolve(".next/static");
const files = readdirSync(staticDir, { recursive: true, encoding: "utf8" }).filter((file) =>
  file.endsWith(".css"),
);
// Require one complete chunk: never add up tokens from old and new build files.
const themes = files
  .map((file) => ({ file, css: readFileSync(path.join(staticDir, file), "utf8") }))
  .filter(({ css }) => css.includes("--surface-sunken:"));
if (!themes.length) throw new Error("The build does not contain the theme CSS");
for (const { file, css } of themes) {
  assertProductionThemeCss(css);
  console.log(`Theme CSS verified: ${file}`);
}
