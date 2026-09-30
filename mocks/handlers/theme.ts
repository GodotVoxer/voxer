import { http, HttpResponse } from "msw";
import {
  CUSTOM_THEMES_PER_USER_MAX,
  type CustomThemeDto,
  type ThemeAssetDto,
} from "@/lib/theme/customTheme";
import { THEME_BG_ASSETS_PER_USER_MAX } from "@/lib/theme/themeBackgroundLimits";
import { customThemeInputSchema, customThemeUpdateSchema } from "@/lib/theme/customThemeSchema";
import { themePreferenceUpdateSchema } from "@/lib/theme/themePreferenceSchema";
import {
  demoState,
  mockThemeAssetShares,
  mockThemeAssetQuota,
  mockBackgroundImageRef,
} from "@/mocks/handlers/shared";

export const themeHandlers = [
  http.put("/api/theme/preference", async ({ request }) => {
    const parsed = themePreferenceUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return HttpResponse.json({ error: "Preferencia de tema inválida" }, { status: 400 });
    }
    const selection = parsed.data;
    if (selection.mode === "custom") {
      const theme = demoState.customThemes.find((t) => t.id === selection.themeId);
      if (!theme) return HttpResponse.json({ error: "Tema no encontrado" }, { status: 404 });
      demoState.accountTheme = {
        mode: "custom",
        updatedAt: new Date().toISOString(),
        customTheme: theme,
      };
    } else {
      demoState.accountTheme = {
        mode: selection.mode,
        updatedAt: new Date().toISOString(),
        customTheme: null,
      };
    }
    return HttpResponse.json({ theme: demoState.accountTheme });
  }),
  http.get("/api/theme/themes", () => HttpResponse.json({ themes: demoState.customThemes })),
  http.post("/api/theme/themes", async ({ request }) => {
    const parsed = customThemeInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return HttpResponse.json({ error: "Tema inválido" }, { status: 400 });
    }
    if (demoState.customThemes.length >= CUSTOM_THEMES_PER_USER_MAX) {
      return HttpResponse.json(
        { error: `Llegaste al máximo de ${CUSTOM_THEMES_PER_USER_MAX} temas.` },
        { status: 409 },
      );
    }
    const theme: CustomThemeDto = {
      ...parsed.data,
      id: `msw${Date.now().toString(36)}${demoState.customThemes.length}`,
      version: 1,
      updatedAt: new Date().toISOString(),
      backgroundImage: mockBackgroundImageRef(parsed.data.voxBackground),
    };
    demoState.customThemes = [...demoState.customThemes, theme];
    return HttpResponse.json({ theme }, { status: 201 });
  }),
  http.patch("/api/theme/themes/:id", async ({ params, request }) => {
    const current = demoState.customThemes.find((t) => t.id === String(params.id));
    if (!current) return HttpResponse.json({ error: "Tema no encontrado" }, { status: 404 });
    const parsed = customThemeUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return HttpResponse.json({ error: "Tema inválido" }, { status: 400 });
    }
    if (parsed.data.version !== current.version) {
      return HttpResponse.json(
        { error: "El tema cambió en otro dispositivo. Recargalo antes de guardar." },
        { status: 409 },
      );
    }
    const { name, base, overrides, headerBackground, voxBackground } = parsed.data;
    const theme: CustomThemeDto = {
      ...current,
      name,
      base,
      overrides,
      headerBackground,
      voxBackground,
      backgroundImage: mockBackgroundImageRef(voxBackground),
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };
    demoState.customThemes = demoState.customThemes.map((t) => (t.id === theme.id ? theme : t));
    if (demoState.accountTheme.customTheme?.id === theme.id) {
      demoState.accountTheme = { ...demoState.accountTheme, customTheme: theme };
    }
    return HttpResponse.json({ theme });
  }),
  http.delete("/api/theme/themes/:id", ({ params }) => {
    const current = demoState.customThemes.find((t) => t.id === String(params.id));
    if (!current) return HttpResponse.json({ error: "Tema no encontrado" }, { status: 404 });
    demoState.customThemes = demoState.customThemes.filter((t) => t.id !== current.id);
    if (demoState.accountTheme.customTheme?.id === current.id) {
      demoState.accountTheme = {
        mode: current.base,
        updatedAt: new Date().toISOString(),
        customTheme: null,
      };
    }
    return HttpResponse.json({ ok: true });
  }),
  http.get("/api/theme/background-images", () =>
    HttpResponse.json({ assets: demoState.themeAssets, quota: mockThemeAssetQuota() }),
  ),
  http.post("/api/theme/background-images/import-shared", async ({ request }) => {
    const body = (await request.json().catch(() => null)) as { shareId?: unknown } | null;
    if (typeof body?.shareId !== "string") {
      return HttpResponse.json({ error: "Referencia de imagen inválida" }, { status: 400 });
    }
    const assetId = [...mockThemeAssetShares.entries()].find(
      ([, value]) => value === body.shareId,
    )?.[0];
    const asset = demoState.themeAssets.find((candidate) => candidate.id === assetId);
    if (!asset) {
      return HttpResponse.json({ error: "La imagen compartida ya no existe." }, { status: 404 });
    }
    return HttpResponse.json({ asset });
  }),
  http.post("/api/theme/background-images/:id/share", ({ params }) => {
    const id = String(params.id);
    if (!demoState.themeAssets.some((asset) => asset.id === id)) {
      return HttpResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
    }
    const shareId = mockThemeAssetShares.get(id) ?? crypto.randomUUID().replaceAll("-", "");
    mockThemeAssetShares.set(id, shareId);
    return HttpResponse.json({ shareId });
  }),
  http.post("/api/theme/background-images", async ({ request }) => {
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return HttpResponse.json({ error: "Falta la imagen" }, { status: 400 });
    }
    if (demoState.themeAssets.length >= THEME_BG_ASSETS_PER_USER_MAX) {
      return HttpResponse.json({ error: "Llegaste al máximo de imágenes." }, { status: 409 });
    }
    // The demo does not process images: the URL is well formed but missing (exercises the color fallback).
    const key = `theme-bg/${crypto.randomUUID()}`;
    const asset: ThemeAssetDto = {
      id: `mswasset${demoState.themeAssets.length + 1}${Date.now().toString(36)}`,
      url: `/uploads/${key}.webp`,
      urlSm: `/uploads/${key}-sm.webp`,
      width: 1280,
      height: 720,
      byteSize: file.size,
      createdAt: new Date().toISOString(),
    };
    demoState.themeAssets = [asset, ...demoState.themeAssets];
    return HttpResponse.json({ asset }, { status: 201 });
  }),
  http.delete("/api/theme/background-images/:id", ({ params }) => {
    const id = String(params.id);
    if (!demoState.themeAssets.some((a) => a.id === id)) {
      return HttpResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
    }
    demoState.themeAssets = demoState.themeAssets.filter((a) => a.id !== id);
    mockThemeAssetShares.delete(id);
    demoState.customThemes = demoState.customThemes.map((t) =>
      t.voxBackground.kind === "image" && t.voxBackground.assetId === id
        ? { ...t, voxBackground: { kind: "none" }, backgroundImage: null, version: t.version + 1 }
        : t,
    );
    return HttpResponse.json({ ok: true });
  }),
];
