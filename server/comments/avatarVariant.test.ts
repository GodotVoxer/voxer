import type { AvatarVariant } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { canPickBlackAvatar, pickAvatarVariant } from "./avatarVariant";
const ALL: AvatarVariant[] = [
  "BLUE",
  "GREEN",
  "RED",
  "YELLOW",
  "PINK",
  "BROWN",
  "MULTICOLOR",
  "MULTICOLOR_INVERTED",
  "WHITE",
  "BLACK",
];
describe("pickAvatarVariant", () => {
  const atArgentinaHour = (hour: number): Date =>
    new Date(`2026-09-25T${String(hour + 3).padStart(2, "0")}:00:00.000Z`);
  const sequence = (...values: number[]) => {
    let index = 0;
    return () => values[index++] ?? 0;
  };

  it("always returns a valid variant", () => {
    for (let i = 0; i < 200; i++) {
      const v = pickAvatarVariant();
      expect(ALL).toContain(v);
    }
  });

  it("BLACK only appears in Paranormal between midnight and 7 a.m. Argentina time", () => {
    expect(canPickBlackAvatar("Paranormal", atArgentinaHour(0))).toBe(true);
    expect(canPickBlackAvatar("Paranormal", atArgentinaHour(6))).toBe(true);
    expect(canPickBlackAvatar("Paranormal", atArgentinaHour(7))).toBe(false);
    expect(canPickBlackAvatar("General", atArgentinaHour(3))).toBe(false);

    expect(
      pickAvatarVariant({
        category: "Paranormal",
        now: atArgentinaHour(3),
        random: sequence(0.005),
      }),
    ).toBe("BLACK");
    expect(
      pickAvatarVariant({
        category: "General",
        now: atArgentinaHour(3),
        random: sequence(0.005, 0.5, 0),
      }),
    ).toBe("BLUE");
  });

  it("keeps WHITE global and respects the palette bands", () => {
    expect(pickAvatarVariant({ random: sequence(0.0005) })).toBe("WHITE");
    expect(pickAvatarVariant({ random: sequence(0.5, 0.15 / 100) })).toBe("MULTICOLOR_INVERTED");
    expect(pickAvatarVariant({ random: sequence(0.5, 1 / 100) })).toBe("MULTICOLOR");
    expect(pickAvatarVariant({ random: sequence(0.5, 3.4 / 100) })).toBe("PINK");
    expect(pickAvatarVariant({ random: sequence(0.5, 3.6 / 100) })).toBe("BROWN");
  });

  it("spreads the base band evenly across the four colors", () => {
    expect(pickAvatarVariant({ random: sequence(0.5, 0.5, 0) })).toBe("BLUE");
    expect(pickAvatarVariant({ random: sequence(0.5, 0.5, 0.25) })).toBe("GREEN");
    expect(pickAvatarVariant({ random: sequence(0.5, 0.5, 0.5) })).toBe("RED");
    expect(pickAvatarVariant({ random: sequence(0.5, 0.5, 0.75) })).toBe("YELLOW");
  });
});
