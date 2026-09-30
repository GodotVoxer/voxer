import { describe, expect, it } from "vitest";
import { escapeSqlLikePattern } from "./sqlLikeEscape";

describe("escapeSqlLikePattern", () => {
  it("escapes wildcards and backslash for ILIKE ESCAPE", () => {
    expect(escapeSqlLikePattern("100%")).toBe("100\\%");
    expect(escapeSqlLikePattern("a_b")).toBe("a\\_b");
    expect(escapeSqlLikePattern("x\\y")).toBe("x\\\\y");
  });
});
