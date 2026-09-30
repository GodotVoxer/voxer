import type { AvatarVariant } from "@prisma/client";

/*
  Two independent draws:

  1) rareLottery in [0, 1)
     - WHITE: 0.1% [0, 0.001), any category and time.
     - BLACK: 1% [0.001, 0.011), only in Paranormal between 00:00 and 06:59 Argentina time.
     - Outside that category and time window the BLACK band falls through to step 2.

  2) palettePercentile in [0, 100)
     - MULTICOLOR_INVERTED: 0.3%  [0, 0.3)
     - MULTICOLOR:          3%    [0.3, 3.3)
     - PINK:                0.15% [3.3, 3.45)
     - BROWN:               0.4%  [3.45, 3.85)
     - BLUE / GREEN / RED / YELLOW: the remaining 96.15%, split evenly.
*/

const WHITE_EXCLUSIVE_MAX = 0.001;
const BLACK_CUMULATIVE_MAX = 0.011;

const PALETTE_MULTICOLOR_INVERTED_MAX = 0.3;
const PALETTE_MULTICOLOR_MAX = 3.3;
const PALETTE_PINK_MAX = 3.45;
const PALETTE_BROWN_MAX = 3.85;

const argentinaHour = (now: Date): number =>
  Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Argentina/Buenos_Aires",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );

export const canPickBlackAvatar = (category: string | undefined, now: Date): boolean => {
  const hour = argentinaHour(now);
  return category === "Paranormal" && hour >= 0 && hour < 7;
};

type PickAvatarVariantOptions = {
  category?: string;
  now?: Date;
  random?: () => number;
};

export const pickAvatarVariant = ({
  category,
  now = new Date(),
  random = Math.random,
}: PickAvatarVariantOptions = {}): AvatarVariant => {
  const rareLottery = random();
  if (rareLottery < WHITE_EXCLUSIVE_MAX) return "WHITE";
  if (canPickBlackAvatar(category, now) && rareLottery < BLACK_CUMULATIVE_MAX) return "BLACK";

  const palettePercentile = random() * 100;
  if (palettePercentile < PALETTE_MULTICOLOR_INVERTED_MAX) return "MULTICOLOR_INVERTED";
  if (palettePercentile < PALETTE_MULTICOLOR_MAX) return "MULTICOLOR";
  if (palettePercentile < PALETTE_PINK_MAX) return "PINK";
  if (palettePercentile < PALETTE_BROWN_MAX) return "BROWN";

  const base = ["BLUE", "GREEN", "RED", "YELLOW"] as const;
  return base[Math.floor(random() * base.length)];
};
