import { describe, expect, it } from "vitest";
import { chainedWheelDelta, type ScrollPaneMetrics } from "./scrollChain";

const pane = (scrollTop: number, scrollHeight: number, clientHeight = 800): ScrollPaneMetrics => ({
  scrollTop,
  scrollHeight,
  clientHeight,
});

describe("chainedWheelDelta", () => {
  it("lets its own column scroll while it has room", () => {
    expect(chainedWheelDelta(120, pane(0, 2000), pane(0, 5000))).toBeNull();
  });

  it("passes the rest to the other column at the bottom", () => {
    expect(chainedWheelDelta(120, pane(1200, 2000), pane(0, 5000))).toBe(120);
  });

  it("passes no more than the other column has left", () => {
    expect(chainedWheelDelta(500, pane(1200, 2000), pane(4100, 5000))).toBe(100);
  });

  it("does not stop the wheel when both columns are at the bottom", () => {
    expect(chainedWheelDelta(120, pane(1200, 2000), pane(4200, 5000))).toBeNull();
  });

  it("scrolling up first returns the other column to its top", () => {
    expect(chainedWheelDelta(-120, pane(1200, 2000), pane(300, 5000))).toBe(-120);
    expect(chainedWheelDelta(-500, pane(1200, 2000), pane(300, 5000))).toBe(-300);
  });

  it("with the other column at its top, the wheel belongs to its own column again", () => {
    expect(chainedWheelDelta(-120, pane(1200, 2000), pane(0, 5000))).toBeNull();
  });

  it("a column without its own scroll sends everything to the other", () => {
    expect(chainedWheelDelta(120, pane(0, 800), pane(0, 5000))).toBe(120);
  });
});
