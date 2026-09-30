import { describe, expect, it } from "vitest";
import { normalizeHexColorInput } from "./hexColorInput";

describe("normalizeHexColorInput", () => {
  it.each([
    ["#ABCDEF", "#abcdef"],
    ["abcdef", "#abcdef"],
    ["#abc", "#aabbcc"],
    ["fa08", "#ffaa0088"],
    ["#12345680", "#12345680"],
    ["#123456FF", "#123456"],
    ["  #7C3AED  ", "#7c3aed"],
  ])("%s → %s", (raw, expected) => {
    expect(normalizeHexColorInput(raw)).toBe(expected);
  });

  it.each([
    "",
    "#",
    "#12",
    "#12345",
    "#1234567",
    "#123456789",
    "red",
    "#ggg",
    "rgb(0,0,0)",
    "#12 34 56",
    "url(x)",
  ])("rechaza %j", (raw) => {
    expect(normalizeHexColorInput(raw)).toBeNull();
  });
});
