import { beforeEach, describe, expect, it, vi } from "vitest";
import { accountThemePreferenceFromRow, setUserThemePreference } from "./preference";

const db = vi.hoisted(() => ({
  user: { update: vi.fn() },
  userTheme: { findFirst: vi.fn() },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: db }));

const savedAt = new Date("2026-09-14T12:00:00.000Z");
const themeRow = {
  id: "cltheme1",
  name: "Noche",
  base: "DARK" as const,
  overrides: { brand: "#7c3aed" },
  headerBackground: { kind: "none" },
  voxBackground: { kind: "none" },
  version: 2,
  updatedAt: savedAt,
  backgroundAsset: null,
};

describe("account theme preference", () => {
  beforeEach(() => {
    db.user.update.mockReset();
    db.userTheme.findFirst.mockReset();
  });

  it("maps the enum and the active theme to the public value", () => {
    expect(
      accountThemePreferenceFromRow({
        themeMode: "SYSTEM",
        themeUpdatedAt: null,
        activeCustomTheme: null,
      }),
    ).toEqual({ mode: "system", updatedAt: null, customTheme: null });
    expect(
      accountThemePreferenceFromRow({
        themeMode: "CUSTOM",
        themeUpdatedAt: savedAt,
        activeCustomTheme: themeRow,
      }),
    ).toMatchObject({ mode: "custom", customTheme: { id: "cltheme1", version: 2 } });
  });

  it("CUSTOM without a document falls back to dark", () => {
    expect(
      accountThemePreferenceFromRow({
        themeMode: "CUSTOM",
        themeUpdatedAt: savedAt,
        activeCustomTheme: null,
      }),
    ).toEqual({ mode: "dark", updatedAt: savedAt.toISOString(), customTheme: null });
  });

  it("stores a builtin mode and clears the active custom theme", async () => {
    db.user.update.mockResolvedValueOnce({
      themeMode: "LIGHT",
      themeUpdatedAt: savedAt,
      activeCustomTheme: null,
    });
    const result = await setUserThemePreference("user-1", { mode: "light" });
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: { themeMode: "LIGHT", activeCustomThemeId: null, themeUpdatedAt: expect.any(Date) },
      }),
    );
    expect(result).toEqual({ mode: "light", updatedAt: savedAt.toISOString(), customTheme: null });
  });

  it("does not activate someone else's custom theme", async () => {
    db.userTheme.findFirst.mockResolvedValueOnce(null);
    expect(
      await setUserThemePreference("user-2", { mode: "custom", themeId: "cltheme1" }),
    ).toBeNull();
    expect(db.userTheme.findFirst).toHaveBeenCalledWith({
      where: { id: "cltheme1", userId: "user-2" },
      select: { id: true },
    });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("activates an own custom theme", async () => {
    db.userTheme.findFirst.mockResolvedValueOnce({ id: "cltheme1" });
    db.user.update.mockResolvedValueOnce({
      themeMode: "CUSTOM",
      themeUpdatedAt: savedAt,
      activeCustomTheme: themeRow,
    });
    const result = await setUserThemePreference("user-1", { mode: "custom", themeId: "cltheme1" });
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ themeMode: "CUSTOM", activeCustomThemeId: "cltheme1" }),
      }),
    );
    expect(result?.customTheme?.id).toBe("cltheme1");
  });
});
