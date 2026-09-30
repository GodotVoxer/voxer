import { describe, expect, it } from "vitest";
import { isGreentextLine } from "./greentext";

describe("isGreentextLine", () => {
  it("detects greentext with a single >", () => {
    expect(isGreentextLine(">hola")).toBe(true);
    expect(isGreentextLine(">")).toBe(true);
    expect(isGreentextLine(">>>implicando")).toBe(true);
  });

  it("detects >>banderitas and >>idunico (neither a link nor an 8-character >>TAG)", () => {
    expect(isGreentextLine(">>banderitas")).toBe(true);
    expect(isGreentextLine(">>idunico")).toBe(true);
    expect(isGreentextLine("  >>banderitas")).toBe(true);
  });

  it("excludes replies starting with an 8-character >>TAG", () => {
    expect(isGreentextLine(">>ABCDEF12")).toBe(false);
    expect(isGreentextLine(">>ABCDEF12 resto")).toBe(false);
    expect(isGreentextLine("  >>ABCDEF12 resto")).toBe(false);
  });

  it("excludes a line that is only a >host.tld link token", () => {
    expect(isGreentextLine(">google.com")).toBe(false);
    expect(isGreentextLine(">https://example.org/x")).toBe(false);
  });

  it("does not flag lines without a leading >", () => {
    expect(isGreentextLine("hola")).toBe(false);
    expect(isGreentextLine("")).toBe(false);
  });
});
