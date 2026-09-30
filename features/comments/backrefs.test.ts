import { describe, expect, it } from "vitest";
import { buildRepliesToIndex, buildTaggedByIndex } from "./backrefs";
describe("buildTaggedByIndex", () => {
  it("groups by quoted tag and keeps order", () => {
    const idx = buildTaggedByIndex([
      { publicTag: "AAAAAAAA", body: ">>BBBBBBBB hola", isOp: false },
      { publicTag: "CCCCCCCC", body: ">>BBBBBBBB otra", isOp: true },
    ]);
    expect(idx.get("BBBBBBBB")).toEqual([
      { taggerPublicTag: "AAAAAAAA", taggerIsOp: false },
      { taggerPublicTag: "CCCCCCCC", taggerIsOp: true },
    ]);
  });
  it("normalizes tags to uppercase", () => {
    const idx = buildTaggedByIndex([{ publicTag: "aa11bb22", body: ">>cc33dd44", isOp: false }]);
    expect(idx.get("CC33DD44")).toEqual([{ taggerPublicTag: "AA11BB22", taggerIsOp: false }]);
  });
  it("allows the same tagger several times", () => {
    const idx = buildTaggedByIndex([
      { publicTag: "XXYYZZ11", body: ">>A1B2C3D4\n>>A1B2C3D4", isOp: false },
    ]);
    expect(idx.get("A1B2C3D4")).toHaveLength(2);
  });
});
describe("buildRepliesToIndex", () => {
  it("groups unique comments by target and sorts by date", () => {
    const r = buildRepliesToIndex([
      {
        id: "a",
        publicTag: "11111111",
        body: ">>22222222",
        createdAt: "2024-01-02T00:00:00.000Z",
      },
      {
        id: "b",
        publicTag: "33333333",
        body: ">>22222222 hola",
        createdAt: "2024-01-03T00:00:00.000Z",
      },
      {
        id: "c",
        publicTag: "44444444",
        body: ">>22222222 >>22222222",
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    ]);
    const list = r.get("22222222")!;
    expect(list).toHaveLength(3);
    expect(list[0]!.id).toBe("b");
    expect(list[1]!.id).toBe("a");
    expect(list[2]!.id).toBe("c");
  });
});
