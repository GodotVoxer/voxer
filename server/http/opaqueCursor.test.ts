import { describe, expect, it } from "vitest";
import { decodeOpaqueCursor, encodeOpaqueCursor } from "./opaqueCursor";

describe("opaque cursors", () => {
  it("round-trips JSON behind a prefix", () => {
    const raw = encodeOpaqueCursor([1, "a"], "k1.");
    expect(raw.startsWith("k1.")).toBe(true);
    expect(decodeOpaqueCursor(raw, "k1.")).toEqual([1, "a"]);
  });

  it("rejects a missing prefix and malformed payloads", () => {
    expect(decodeOpaqueCursor(encodeOpaqueCursor([1]), "k1.")).toBeUndefined();
    expect(decodeOpaqueCursor("k1.%%%", "k1.")).toBeUndefined();
  });
});
