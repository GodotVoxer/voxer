import { describe, expect, it } from "vitest";
import { decodeMyCommentsCursor, encodeMyCommentsCursor } from "./myCommentsCursor";

describe("own comments history cursor", () => {
  it("round-trips", () => {
    const cursor = { createdAtMs: 1_764_000_000_000, id: "ckabc123" };
    expect(decodeMyCommentsCursor(encodeMyCommentsCursor(cursor))).toEqual(cursor);
  });

  it("rejects anything that is not its own cursor", () => {
    expect(decodeMyCommentsCursor("")).toBeNull();
    expect(decodeMyCommentsCursor("k1.abc")).toBeNull();
    expect(decodeMyCommentsCursor("mc1.no-es-base64url!!")).toBeNull();
    expect(
      decodeMyCommentsCursor("mc1." + Buffer.from("[1,2,3]", "utf8").toString("base64url")),
    ).toBeNull();
  });

  it("rejects fields of the wrong type", () => {
    const bad = (payload: unknown) =>
      "mc1." + Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    expect(decodeMyCommentsCursor(bad([1.5, "id"]))).toBeNull();
    expect(decodeMyCommentsCursor(bad([1, ""]))).toBeNull();
    expect(decodeMyCommentsCursor(bad(["1", "id"]))).toBeNull();
  });
});
