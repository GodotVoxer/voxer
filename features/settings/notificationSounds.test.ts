import { describe, expect, it } from "vitest";
import { STOCK_SOUNDS, stockSoundById } from "./notificationSounds";

describe("builtin notification sounds", () => {
  it("every sound has a unique id and a label", () => {
    const ids = STOCK_SOUNDS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const sound of STOCK_SOUNDS) {
      expect(sound.label.trim().length).toBeGreaterThan(0);
      expect(sound.tones.length).toBeGreaterThan(0);
    }
  });

  it("are short and moderately loud", () => {
    for (const sound of STOCK_SOUNDS) {
      const finMs = Math.max(...sound.tones.map((t) => t.startMs + t.durationMs));
      // An alert longer than half a second gets cut by the next comment.
      expect(finMs).toBeLessThanOrEqual(500);
      for (const tone of sound.tones) {
        // `exponentialRampToValueAtTime` does not accept 0: a zero frequency or peak is silent.
        expect(tone.fromHz).toBeGreaterThan(0);
        expect(tone.toHz).toBeGreaterThan(0);
        expect(tone.peak).toBeGreaterThan(0);
        expect(tone.peak).toBeLessThanOrEqual(0.3);
        expect(tone.durationMs).toBeGreaterThan(0);
      }
    }
  });

  it("resolve by id and an unknown id returns nothing", () => {
    expect(stockSoundById("chime")?.label).toBe("Campanita");
    expect(stockSoundById("silent")).toBeUndefined();
    expect(stockSoundById("custom")).toBeUndefined();
  });
});
