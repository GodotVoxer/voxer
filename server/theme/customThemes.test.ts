import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomThemeInput } from "@/lib/theme/customTheme";
import {
  createCustomTheme,
  customThemeDtoFromRow,
  deleteCustomTheme,
  listCustomThemes,
  updateCustomTheme,
} from "./customThemes";

const db = vi.hoisted(() => ({
  userTheme: {
    count: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  },
  userThemeAsset: { findFirst: vi.fn() },
  user: { findUnique: vi.fn(), update: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({ prisma: db }));
vi.mock("@/server/theme/themeAssetStorage", () => ({
  themeAssetPublicUrl: (key: string) => `https://media.voxer.pro/${key}`,
}));

const input: CustomThemeInput = {
  name: "Noche",
  base: "dark",
  overrides: { brand: "#7c3aed" },
  headerBackground: { kind: "none" },
  voxBackground: { kind: "solid", color: "#101010" },
};

const imageInput: CustomThemeInput = {
  ...input,
  voxBackground: { kind: "image", assetId: "classet1", fit: "cover", dimPct: 40 },
};

const row = (extra: Record<string, unknown> = {}) => ({
  id: "cltheme1",
  name: "Noche",
  base: "DARK",
  overrides: { brand: "#7c3aed" },
  headerBackground: { kind: "none" },
  voxBackground: { kind: "solid", color: "#101010" },
  version: 1,
  updatedAt: new Date("2026-09-14T12:00:00.000Z"),
  backgroundAsset: null,
  ...extra,
});

describe("custom themes (server)", () => {
  beforeEach(() => {
    for (const model of [db.userTheme, db.userThemeAsset, db.user]) {
      for (const fn of Object.values(model)) fn.mockReset();
    }
    db.$transaction.mockReset();
    db.$transaction.mockImplementation((fn: (tx: typeof db) => unknown) => fn(db));
  });

  it("rehydrates corrupt rows keeping only valid values", () => {
    const dto = customThemeDtoFromRow(
      row({
        base: "LIGHT",
        overrides: { brand: "#7c3aed", fg: "red", "--x": "#000000", shade: "#000000" },
        headerBackground: { kind: "solid", color: "url(x)" },
        voxBackground: { kind: "image", url: "https://evil.example" },
      }) as never,
    );
    expect(dto).toMatchObject({
      base: "light",
      overrides: { brand: "#7c3aed" },
      headerBackground: { kind: "none" },
      voxBackground: { kind: "none" },
      backgroundImage: null,
      updatedAt: "2026-09-14T12:00:00.000Z",
    });
  });

  it("takes image URLs from the relation, only when it matches the background id", () => {
    const asset = {
      id: "classet1",
      objectKey: "theme-bg/a.webp",
      objectKeySm: "theme-bg/a-sm.webp",
    };
    const withImage = customThemeDtoFromRow(
      row({ voxBackground: imageInput.voxBackground, backgroundAsset: asset }) as never,
    );
    expect(withImage.backgroundImage).toEqual({
      assetId: "classet1",
      url: "https://media.voxer.pro/theme-bg/a.webp",
      urlSm: "https://media.voxer.pro/theme-bg/a-sm.webp",
    });
    const mismatched = customThemeDtoFromRow(
      row({
        voxBackground: { ...imageInput.voxBackground, assetId: "otra" },
        backgroundAsset: asset,
      }) as never,
    );
    expect(mismatched.backgroundImage).toBeNull();
  });

  it("lists only the user's themes", async () => {
    db.userTheme.findMany.mockResolvedValueOnce([row()]);
    const themes = await listCustomThemes("user-1");
    expect(db.userTheme.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    );
    expect(themes).toHaveLength(1);
  });

  it("create honours the per-user maximum", async () => {
    db.userTheme.count.mockResolvedValueOnce(10);
    expect(await createCustomTheme("user-1", input)).toEqual({ ok: false, reason: "limit" });
    expect(db.userTheme.create).not.toHaveBeenCalled();

    db.userTheme.count.mockResolvedValueOnce(2);
    db.userTheme.create.mockResolvedValueOnce(row());
    const created = await createCustomTheme("user-1", input);
    expect(created.ok).toBe(true);
    expect(db.userTheme.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          base: "DARK",
          headerBackground: { kind: "none" },
          backgroundAssetId: null,
        }),
      }),
    );
  });

  it("an image background requires an image the user owns", async () => {
    db.userTheme.count.mockResolvedValue(0);
    db.userThemeAsset.findFirst.mockResolvedValueOnce(null);
    expect(await createCustomTheme("user-1", imageInput)).toEqual({
      ok: false,
      reason: "asset_not_found",
    });
    expect(db.userThemeAsset.findFirst).toHaveBeenCalledWith({
      where: { id: "classet1", userId: "user-1" },
      select: { id: true },
    });
    expect(db.userTheme.create).not.toHaveBeenCalled();

    db.userThemeAsset.findFirst.mockResolvedValueOnce({ id: "classet1" });
    db.userTheme.create.mockResolvedValueOnce(row());
    await createCustomTheme("user-1", imageInput);
    expect(db.userTheme.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ backgroundAssetId: "classet1" }) }),
    );
  });

  it("editing with someone else's image: asset_not_found on an own theme, not_found otherwise", async () => {
    db.userThemeAsset.findFirst.mockResolvedValue(null);
    db.userTheme.findFirst.mockResolvedValueOnce({ id: "cltheme1" });
    expect(await updateCustomTheme("user-1", "cltheme1", { ...imageInput, version: 1 })).toEqual({
      ok: false,
      reason: "asset_not_found",
    });
    db.userTheme.findFirst.mockResolvedValueOnce(null);
    expect(await updateCustomTheme("user-2", "cltheme1", { ...imageInput, version: 1 })).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(db.userTheme.updateMany).not.toHaveBeenCalled();
  });

  it("an outdated version is a conflict; another user's theme is not found", async () => {
    db.userTheme.updateMany.mockResolvedValueOnce({ count: 0 });
    db.userTheme.findFirst.mockResolvedValueOnce(row({ version: 4 }));
    expect(await updateCustomTheme("user-1", "cltheme1", { ...input, version: 3 })).toEqual({
      ok: false,
      reason: "conflict",
    });

    db.userTheme.updateMany.mockResolvedValueOnce({ count: 0 });
    db.userTheme.findFirst.mockResolvedValueOnce(null);
    expect(await updateCustomTheme("user-2", "cltheme1", { ...input, version: 1 })).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(db.userTheme.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { id: "cltheme1", userId: "user-2", version: 1 } }),
    );
  });

  it("editing with the current version increments it", async () => {
    db.userTheme.updateMany.mockResolvedValueOnce({ count: 1 });
    db.userTheme.findFirst.mockResolvedValueOnce(row({ version: 2 }));
    const result = await updateCustomTheme("user-1", "cltheme1", { ...input, version: 1 });
    expect(result).toMatchObject({ ok: true, theme: { version: 2 } });
    expect(db.userTheme.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ version: { increment: 1 } }) }),
    );
  });

  it("deleting the active theme returns the account to its base", async () => {
    db.userTheme.findFirst.mockResolvedValueOnce({ id: "cltheme1", base: "LIGHT" });
    db.user.findUnique.mockResolvedValueOnce({ activeCustomThemeId: "cltheme1" });
    expect(await deleteCustomTheme("user-1", "cltheme1")).toBe(true);
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { themeMode: "LIGHT", activeCustomThemeId: null, themeUpdatedAt: expect.any(Date) },
    });
    expect(db.userTheme.delete).toHaveBeenCalledWith({ where: { id: "cltheme1" } });
  });

  it("deleting someone else's theme does nothing", async () => {
    db.userTheme.findFirst.mockResolvedValueOnce(null);
    expect(await deleteCustomTheme("user-2", "cltheme1")).toBe(false);
    expect(db.userTheme.delete).not.toHaveBeenCalled();
  });
});
