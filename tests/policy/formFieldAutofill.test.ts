import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const SCAN_DIRS = ["components", "app"];
const FIELD_TAGS = new Set(["input", "textarea", "Input"]);
/** Input types nothing is typed into, which autofill leaves alone. */
const UNTYPED_INPUT_TYPES = new Set([
  "checkbox",
  "radio",
  "file",
  "range",
  "color",
  "hidden",
  "button",
  "submit",
]);

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const abs = path.join(dir, name);
    if (statSync(abs).isDirectory()) return walk(abs);
    return name.endsWith(".tsx") ? [abs] : [];
  });

const literalAttribute = (attributes: ts.JsxAttributes, name: string): string | null => {
  for (const attr of attributes.properties) {
    if (!ts.isJsxAttribute(attr) || attr.name.getText() !== name) continue;
    return attr.initializer && ts.isStringLiteral(attr.initializer) ? attr.initializer.text : null;
  }
  return null;
};

const CREDENTIAL_AUTOCOMPLETE = new Set(["username", "current-password", "new-password"]);
const CREDENTIAL_WORD_RE = /user\s?name|usuario|contraseña|password|login/i;

const autofillHits = (rel: string, source: string): string[] => {
  const file = ts.createSourceFile(rel, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const hits: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = node.tagName.getText();
      const attrs = node.attributes;
      const names = attrs.properties.map((p) => (ts.isJsxAttribute(p) ? p.name.getText() : null));
      // A spread means a wrapper: its callers are the ones checked.
      const isWrapper = names.includes(null);
      const type = literalAttribute(attrs, "type");
      const typedInto = tag === "textarea" || type === null || !UNTYPED_INPUT_TYPES.has(type);
      if (FIELD_TAGS.has(tag) && typedInto && !isWrapper) {
        const { line } = file.getLineAndCharacterOfPosition(node.getStart());
        const where = `${rel}:${line + 1} <${tag}>`;
        if (!names.includes("autoComplete")) hits.push(`${where} has no autoComplete`);
        const isCredential = CREDENTIAL_AUTOCOMPLETE.has(
          literalAttribute(attrs, "autoComplete") ?? "",
        );
        const placeholder = literalAttribute(attrs, "placeholder") ?? "";
        if (!isCredential && CREDENTIAL_WORD_RE.test(placeholder)) {
          hits.push(`${where} placeholder reads as a credential: "${placeholder}"`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return hits;
};

describe("form field autofill", () => {
  // A field with no hint is guessed from its label and neighbours: Chrome and Android autofill have
  // taken comment and vox fields for a login or sign-up form and offered saved passwords.
  //
  // The Android app's autofill ignores `autoComplete`: it reads the placeholder, and one that names a
  // credential makes it offer passwords on every field of that form.
  it("every field the user types into declares autoComplete and no credential placeholder", () => {
    const hits = SCAN_DIRS.flatMap((dir) =>
      walk(path.join(ROOT, dir)).flatMap((abs) =>
        autofillHits(path.relative(ROOT, abs).split(path.sep).join("/"), readFileSync(abs, "utf8")),
      ),
    );
    expect(hits).toEqual([]);
  });
});
