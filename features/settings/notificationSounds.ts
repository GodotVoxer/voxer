import type { NotificationSoundId } from "@/features/settings/store";
import { readCustomNotificationSound } from "./customNotificationSound";

/** Builtin sounds are synthesized with Web Audio: sub-second envelopes weigh zero bytes and need no requests. */
export type StockSoundId = "pop" | "chime" | "tick";

/** A tone with its frequency sweep and envelope, in milliseconds from the start. */
export type Tone = {
  startMs: number;
  durationMs: number;
  fromHz: number;
  toHz: number;
  /** Gain peak; above 0.3 a repeated alert gets tiring. */
  peak: number;
  type: OscillatorType;
};

export const STOCK_SOUNDS: readonly { id: StockSoundId; label: string; tones: readonly Tone[] }[] =
  [
    {
      id: "pop",
      label: "Pop",
      tones: [{ startMs: 0, durationMs: 120, fromHz: 520, toHz: 240, peak: 0.18, type: "sine" }],
    },
    {
      id: "chime",
      label: "Campanita",
      tones: [
        { startMs: 0, durationMs: 260, fromHz: 880, toHz: 880, peak: 0.14, type: "sine" },
        { startMs: 90, durationMs: 320, fromHz: 1318, toHz: 1318, peak: 0.12, type: "sine" },
      ],
    },
    {
      id: "tick",
      label: "Tic",
      tones: [
        { startMs: 0, durationMs: 45, fromHz: 1200, toHz: 900, peak: 0.16, type: "triangle" },
      ],
    },
  ];

export const stockSoundById = (id: string): (typeof STOCK_SOUNDS)[number] | undefined =>
  STOCK_SOUNDS.find((s) => s.id === id);

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  audioContext ??= new Ctor();
  return audioContext;
};

const playTones = (tones: readonly Tone[]): void => {
  const ctx = getAudioContext();
  if (!ctx) return;
  // Until the first user gesture the context stays suspended: resuming it is what makes the first alert play.
  void ctx.resume().catch(() => {});
  const now = ctx.currentTime;
  for (const tone of tones) {
    const start = now + tone.startMs / 1000;
    const end = start + tone.durationMs / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tone.type;
    osc.frequency.setValueAtTime(tone.fromHz, start);
    if (tone.toHz !== tone.fromHz) osc.frequency.exponentialRampToValueAtTime(tone.toHz, end);
    // Short attack and exponential release: a hard cut sounds like a click.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(tone.peak, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.02);
  }
};

let customObjectUrl: string | null = null;

/** After replacing or deleting the custom file, the cached URL points at the old bytes. */
export const invalidateCustomSoundCache = (): void => {
  if (customObjectUrl) URL.revokeObjectURL(customObjectUrl);
  customObjectUrl = null;
};

const playCustom = async (): Promise<void> => {
  if (!customObjectUrl) {
    const blob = await readCustomNotificationSound();
    if (!blob) return;
    customObjectUrl = URL.createObjectURL(blob);
  }
  const audio = new Audio(customObjectUrl);
  audio.volume = 0.7;
  await audio.play().catch(() => {});
};

/** Never throws: a silent alert must not break the screen that triggered it, and browsers block audio before interaction. */
export const playNotificationSound = (id: NotificationSoundId): void => {
  try {
    if (id === "silent") return;
    if (id === "custom") {
      void playCustom().catch(() => {});
      return;
    }
    const stock = stockSoundById(id);
    if (stock) playTones(stock.tones);
  } catch {
    // no sound
  }
};
