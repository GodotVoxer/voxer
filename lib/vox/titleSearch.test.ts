import { describe, expect, it } from "vitest";
import { rankVoxRowsByFuzzyTitle, significantSearchTokens } from "./titleSearch";

describe("significantSearchTokens", () => {
  it("extracts tokens of length >= 2", () => {
    expect(significantSearchTokens("  Video   juegos  ")).toEqual(["video", "juegos"]);
  });
});

describe("rankVoxRowsByFuzzyTitle", () => {
  it("ranks related titles first and drops noise for the query", () => {
    const ranked = rankVoxRowsByFuzzyTitle(
      [
        { title: "Vox de prueba", id: "a" },
        { title: "Videojuegos: Resident Evil", id: "b" },
        { title: "Posteen sus escritorios", id: "c" },
      ],
      "video",
    );
    expect(ranked.map((r) => r.id)).toEqual(["b"]);
  });

  it("tolerates a moderate typo in the title", () => {
    const ranked = rankVoxRowsByFuzzyTitle([{ title: "Vidoejuegos indie", id: "x" }], "video");
    expect(ranked.some((r) => r.id === "x")).toBe(true);
  });
});
