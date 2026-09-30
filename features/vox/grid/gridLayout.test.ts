import { describe, expect, it } from "vitest";
import {
  getVoxGridTrackLayout,
  minCardWidthPxForTrack,
  VOX_GRID_GAP_PX,
  VOX_GRID_MD_MIN_TRACK_PX,
  VOX_GRID_MIN_CARD_PX_MD,
  VOX_GRID_MIN_CARD_PX_SM,
  VOX_GRID_MOBILE_MAX_TRACK_PX,
  VOX_GRID_RIGHT_RING_SAFE_PX,
  VOX_GRID_WIDE_MAX_MIN_CARD_PX,
  VOX_GRID_WIDE_TARGET_COLUMNS,
} from "./gridLayout";

describe("minCardWidthPxForTrack", () => {
  it("below mobile breakpoint uses half-track minus one gap", () => {
    expect(minCardWidthPxForTrack(400)).toBe(Math.floor((400 - VOX_GRID_GAP_PX) / 2));
  });

  it("at sm tier uses SM min card width", () => {
    expect(minCardWidthPxForTrack(VOX_GRID_MOBILE_MAX_TRACK_PX)).toBe(VOX_GRID_MIN_CARD_PX_SM);
    expect(minCardWidthPxForTrack(VOX_GRID_MD_MIN_TRACK_PX - 1)).toBe(VOX_GRID_MIN_CARD_PX_SM);
  });

  it("at md tier keeps floor MD min until scaled min exceeds it", () => {
    expect(minCardWidthPxForTrack(VOX_GRID_MD_MIN_TRACK_PX)).toBe(VOX_GRID_MIN_CARD_PX_MD);
    expect(minCardWidthPxForTrack(1300)).toBe(VOX_GRID_MIN_CARD_PX_MD);
    expect(minCardWidthPxForTrack(1400)).toBe(Math.floor(1400 / VOX_GRID_WIDE_TARGET_COLUMNS));
    expect(minCardWidthPxForTrack(2000)).toBe(Math.floor(2000 / VOX_GRID_WIDE_TARGET_COLUMNS));
    expect(minCardWidthPxForTrack(4000)).toBe(VOX_GRID_WIDE_MAX_MIN_CARD_PX);
  });
});

describe("getVoxGridTrackLayout", () => {
  it("matches VoxGrid formulas for a wide desktop track (six columns)", () => {
    const track = 1300;
    const distributeWidthPx = Math.max(0, track - VOX_GRID_RIGHT_RING_SAFE_PX);
    const minW = minCardWidthPxForTrack(track);
    const columns = Math.max(
      2,
      Math.floor((distributeWidthPx + VOX_GRID_GAP_PX) / (minW + VOX_GRID_GAP_PX)),
    );
    const totalGapPx = VOX_GRID_GAP_PX * Math.max(0, columns - 1);
    const columnWidth = Math.max(1, Math.floor((distributeWidthPx - totalGapPx) / columns));

    expect(getVoxGridTrackLayout(track)).toEqual({ columns, columnWidth });
  });

  it("uses two columns below the mobile track breakpoint", () => {
    expect(getVoxGridTrackLayout(400)).toEqual({
      columns: 2,
      columnWidth: Math.floor((400 - VOX_GRID_RIGHT_RING_SAFE_PX - VOX_GRID_GAP_PX) / 2),
    });
  });

  it("on very wide desktop prefers about six columns instead of eight at fixed 200px min", () => {
    expect(getVoxGridTrackLayout(1800).columns).toBe(6);
  });

  it("on ultrawide track allows more columns once min card hits the wide cap", () => {
    const narrow = getVoxGridTrackLayout(1800).columns;
    const ultra = getVoxGridTrackLayout(3200).columns;
    expect(ultra).toBeGreaterThan(narrow);
  });
});
