import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { voxBackgroundCss } from "./voxBackgroundCss";

const SAFE_OUTPUT_RE =
  /^(#[0-9a-f]{6}([0-9a-f]{2})?|(linear-gradient\(\d{1,3}deg|radial-gradient\(circle at center)(, #[0-9a-f]{6}([0-9a-f]{2})? \d{1,3}%){2,4}\))$/;

describe("voxBackgroundCss", () => {
  it("solid and valid gradients", () => {
    expect(voxBackgroundCss({ kind: "none" })).toBeNull();
    expect(voxBackgroundCss({ kind: "solid", color: "#112233" })).toBe("#112233");
    expect(
      voxBackgroundCss({
        kind: "gradient",
        type: "linear",
        angleDeg: 135,
        stops: [
          { color: "#000000", pos: 0 },
          { color: "#ffffff80", pos: 100 },
        ],
      }),
    ).toBe("linear-gradient(135deg, #000000 0%, #ffffff80 100%)");
    expect(
      voxBackgroundCss({
        kind: "gradient",
        type: "radial",
        angleDeg: 0,
        stops: [
          { color: "#000000", pos: 10 },
          { color: "#222222", pos: 10 },
        ],
      }),
    ).toBe("radial-gradient(circle at center, #000000 10%, #222222 10%)");
  });

  it.each([
    null,
    "red",
    { kind: "solid", color: "red" },
    { kind: "solid", color: "#fff" },
    { kind: "solid", color: "#FFFFFF" },
    { kind: "solid", color: "#000000;background:url(javascript:alert(1))" },
    { kind: "solid", color: "var(--fg)" },
    { kind: "image", url: "https://evil.example/x.png" },
    { kind: "gradient", type: "linear", angleDeg: 90, stops: [{ color: "#000000", pos: 0 }] },
    {
      kind: "gradient",
      type: "linear",
      angleDeg: 90,
      stops: [
        { color: "#000000", pos: 60 },
        { color: "#ffffff", pos: 10 },
      ],
    },
    {
      kind: "gradient",
      type: "linear",
      angleDeg: "90deg), url(x",
      stops: [
        { color: "#000000", pos: 0 },
        { color: "#ffffff", pos: 100 },
      ],
    },
    {
      kind: "gradient",
      type: "conic",
      angleDeg: 0,
      stops: [
        { color: "#000000", pos: 0 },
        { color: "#ffffff", pos: 100 },
      ],
    },
    {
      kind: "gradient",
      type: "linear",
      angleDeg: 1.5,
      stops: [
        { color: "#000000", pos: 0 },
        { color: "#ffffff", pos: 100 },
      ],
    },
  ])("rechaza %j", (input) => {
    expect(voxBackgroundCss(input)).toBeNull();
  });

  it("for any input the output is null or follows the allowed grammar", () => {
    const stop = fc.record({
      color: fc.oneof(fc.string(), fc.stringMatching(/^#[0-9a-f]{6}$/)),
      pos: fc.oneof(fc.integer({ min: -10, max: 110 }), fc.double(), fc.string()),
    });
    const candidate = fc.oneof(
      fc.anything(),
      fc.record({ kind: fc.constantFrom("solid", "gradient", "none"), color: fc.string() }),
      fc.record({
        kind: fc.constant("gradient"),
        type: fc.oneof(fc.constantFrom("linear", "radial"), fc.string()),
        angleDeg: fc.oneof(fc.integer({ min: -400, max: 400 }), fc.string()),
        stops: fc.array(stop, { maxLength: 6 }),
      }),
    );
    fc.assert(
      fc.property(candidate, (input) => {
        const css = voxBackgroundCss(input);
        return css === null || SAFE_OUTPUT_RE.test(css);
      }),
      { numRuns: 2000 },
    );
  });
});
