import { describe, expect, it } from "vitest";
import { decodeVoxListCursor, encodeVoxListCursor } from "./listCursor";

describe("voxListCursor", () => {
  it("round-trips with and without pinnedAt", () => {
    const pinned = {
      id: "clx1",
      pinnedAtMs: 1_700_000_000_000,
      lastActivityAtMs: 1_700_000_500_000,
    };
    const plain = { id: "clx2", pinnedAtMs: null, lastActivityAtMs: 1_700_000_900_000 };
    expect(decodeVoxListCursor(encodeVoxListCursor(pinned))).toEqual(pinned);
    expect(decodeVoxListCursor(encodeVoxListCursor(plain))).toEqual(plain);
  });

  it("rejects legacy bare ids, garbage and invalid structures", () => {
    expect(decodeVoxListCursor("clx1a2b3c4d5e6f7g8h9i0jkl")).toBeNull();
    expect(decodeVoxListCursor("k1.no-es-base64-json")).toBeNull();
    const bad = (value: unknown) =>
      `k1.${Buffer.from(JSON.stringify(value), "utf8").toString("base64url")}`;
    expect(decodeVoxListCursor(bad([null, "x", "id"]))).toBeNull();
    expect(decodeVoxListCursor(bad([1.5, 1, "id"]))).toBeNull();
    expect(decodeVoxListCursor(bad([null, 1, ""]))).toBeNull();
    expect(decodeVoxListCursor(bad({ id: "x" }))).toBeNull();
  });
});
