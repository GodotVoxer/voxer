import { describe, expect, it } from "vitest";
import { isBodyTooLarge } from "./themeWriteGuard";

const requestWith = (headers: Record<string, string>) =>
  ({ headers: new Headers(headers) }) as Request;

describe("isBodyTooLarge", () => {
  it("accepts declared bodies within the cap", () => {
    expect(isBodyTooLarge(requestWith({ "content-length": "512" }), 1024)).toBe(false);
    expect(isBodyTooLarge(requestWith({ "content-length": "1024" }), 1024)).toBe(false);
  });

  it("rejects larger declared bodies", () => {
    expect(isBodyTooLarge(requestWith({ "content-length": "1025" }), 1024)).toBe(true);
  });

  it.each<Record<string, string>>([
    {},
    { "content-length": "abc" },
    { "content-length": "-1" },
    { "content-length": "1e3" },
  ])("sin Content-Length válido no se lee el cuerpo: %j", (headers) => {
    expect(isBodyTooLarge(requestWith(headers), 1024)).toBe(true);
  });
});
