import { describe, expect, it } from "vitest";
import {
  appendVoxDescriptionFeatureMarkerLines,
  parseVoxDescriptionFeatureMarkers,
} from "./descriptionFeatureMarkers";

describe("parseVoxDescriptionFeatureMarkers", () => {
  it("detects >>idunico without requiring line removal", () => {
    const r = parseVoxDescriptionFeatureMarkers("Hola\n>>idunico\nMundo");
    expect(r.threadUniqueIdsFromDescription).toBe(true);
    expect(r.countryFlagsFromDescription).toBe(false);
  });

  it("detects >>BANDERITAS case-insensitive", () => {
    const r = parseVoxDescriptionFeatureMarkers(">>Banderitas\ntexto");
    expect(r.countryFlagsFromDescription).toBe(true);
    expect(r.threadUniqueIdsFromDescription).toBe(false);
  });

  it("returns false when no markers", () => {
    const r = parseVoxDescriptionFeatureMarkers("solo texto");
    expect(r.threadUniqueIdsFromDescription).toBe(false);
    expect(r.countryFlagsFromDescription).toBe(false);
  });
});

describe("appendVoxDescriptionFeatureMarkerLines", () => {
  it("adds >>idunico when the flag is on and the line is missing", () => {
    expect(
      appendVoxDescriptionFeatureMarkerLines("Hola mundo", {
        threadUniqueIds: true,
        countryFlags: false,
      }),
    ).toBe("Hola mundo\n>>idunico");
  });

  it("adds both lines in order when missing", () => {
    expect(
      appendVoxDescriptionFeatureMarkerLines("Texto", {
        threadUniqueIds: true,
        countryFlags: true,
      }),
    ).toBe("Texto\n>>idunico\n>>banderitas");
  });

  it("does not duplicate a line the user already wrote", () => {
    const body = "x\n>>idunico\ny";
    expect(
      appendVoxDescriptionFeatureMarkerLines(body, {
        threadUniqueIds: true,
        countryFlags: true,
      }),
    ).toBe("x\n>>idunico\ny\n>>banderitas");
  });

  it("leaves the text alone when the flags are off", () => {
    expect(
      appendVoxDescriptionFeatureMarkerLines("solo\n", {
        threadUniqueIds: false,
        countryFlags: false,
      }),
    ).toBe("solo\n");
  });
});
