import { describe, expect, it } from "vitest";
import { countDuration, countNoun } from "./plural";

describe("countNoun", () => {
  it("uses the singular only for exactly one", () => {
    expect(countNoun(1, "voto", "votos")).toBe("1 voto");
    expect(countNoun(0, "voto", "votos")).toBe("0 votos");
    expect(countNoun(2, "voto", "votos")).toBe("2 votos");
  });

  it("names duration units", () => {
    expect(countDuration(1, "DAYS")).toBe("1 día");
    expect(countDuration(3, "HOURS")).toBe("3 horas");
  });
});
