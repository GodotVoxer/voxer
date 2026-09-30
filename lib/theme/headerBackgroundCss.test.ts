import { describe, expect, it } from "vitest";
import { headerBackgroundCss } from "./headerBackgroundCss";

describe("headerBackgroundCss", () => {
  it("builds a gradient solely from validated colors and positions", () => {
    expect(
      headerBackgroundCss({
        kind: "gradient",
        type: "linear",
        angleDeg: 180,
        stops: [
          { color: "#5bcefa", pos: 0 },
          { color: "#f5a9b8", pos: 100 },
        ],
      }),
    ).toBe("linear-gradient(180deg, #5bcefa 0%, #f5a9b8 100%)");
  });

  it.each([
    { kind: "none" },
    { kind: "solid", color: "red" },
    { kind: "solid", color: "url(x)" },
    {
      kind: "gradient",
      type: "linear",
      angleDeg: 180,
      stops: [
        { color: "#ffffff", pos: 100 },
        { color: "#000000", pos: 0 },
      ],
    },
  ])("rechaza %j", (input) => {
    expect(headerBackgroundCss(input)).toBeNull();
  });
});
