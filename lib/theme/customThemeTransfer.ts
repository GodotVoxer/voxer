import {
  THEME_ASSET_SHARE_ID_RE,
  THEME_BACKGROUND_FITS,
  VOX_BACKGROUND_DIM_MAX,
  type CustomThemeInput,
  type ThemeBackgroundFit,
} from "@/lib/theme/customTheme";
import { customThemeInputSchema } from "@/lib/theme/customThemeSchema";

const CUSTOM_THEME_EXPORT_FORMAT = "voxer-theme";
const CUSTOM_THEME_EXPORT_VERSION = 1;
export const CUSTOM_THEME_IMPORT_MAX_BYTES = 16_000;

type SharedThemeImagePointer = {
  kind: "sharedImage";
  shareId: string;
  fit: ThemeBackgroundFit;
  dimPct: number;
};

type ExportVoxBackground =
  | Exclude<CustomThemeInput["voxBackground"], { kind: "image" }>
  | SharedThemeImagePointer;

const EXPORT_KEYS = new Set([
  "format",
  "version",
  "name",
  "base",
  "overrides",
  "headerBackground",
  "voxBackground",
]);

export type CustomThemeExportFile = {
  format: typeof CUSTOM_THEME_EXPORT_FORMAT;
  version: typeof CUSTOM_THEME_EXPORT_VERSION;
  name: string;
  base: CustomThemeInput["base"];
  overrides: CustomThemeInput["overrides"];
  headerBackground: CustomThemeInput["headerBackground"];
  voxBackground: ExportVoxBackground;
};

/** Images travel as an opaque server-made reference, never as a URL or internal assetId. */
const buildCustomThemeExport = (
  input: CustomThemeInput,
  imageShareId?: string | null,
): CustomThemeExportFile => ({
  format: CUSTOM_THEME_EXPORT_FORMAT,
  version: CUSTOM_THEME_EXPORT_VERSION,
  name: input.name,
  base: input.base,
  overrides: { ...input.overrides },
  headerBackground: input.headerBackground,
  voxBackground:
    input.voxBackground.kind === "image" &&
    imageShareId &&
    THEME_ASSET_SHARE_ID_RE.test(imageShareId)
      ? {
          kind: "sharedImage",
          shareId: imageShareId,
          fit: input.voxBackground.fit,
          dimPct: input.voxBackground.dimPct,
        }
      : input.voxBackground.kind === "image"
        ? { kind: "none" }
        : input.voxBackground,
});

export const serializeCustomThemeExport = (
  input: CustomThemeInput,
  imageShareId?: string | null,
): string => `${JSON.stringify(buildCustomThemeExport(input, imageShareId), null, 2)}\n`;

export const customThemeExportFileName = (name: string): string => {
  const slug = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return `voxer-tema-${slug || "personalizado"}.json`;
};

export type CustomThemeImportResult =
  | { ok: true; input: CustomThemeInput; sharedImage: SharedThemeImagePointer | null }
  | { ok: false; message: string };

const fail = (message: string): CustomThemeImportResult => ({ ok: false, message });

/**
 * Reads an exported file through the same strict schema as the API. The result only fills the
 * editor; the server validates again on save.
 */
export const parseCustomThemeImport = (text: string): CustomThemeImportResult => {
  if (new TextEncoder().encode(text).length > CUSTOM_THEME_IMPORT_MAX_BYTES) {
    return fail("El archivo es demasiado grande para ser un tema.");
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fail("El archivo no es un JSON válido.");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return fail("El archivo no es un tema de Voxer.");
  }
  const file = data as Record<string, unknown>;
  if (file.format !== CUSTOM_THEME_EXPORT_FORMAT) return fail("El archivo no es un tema de Voxer.");
  if (file.version !== CUSTOM_THEME_EXPORT_VERSION) {
    return fail("El tema es de una versión que esta página no reconoce.");
  }
  if (!Object.keys(file).every((key) => EXPORT_KEYS.has(key))) {
    return fail("El tema tiene campos desconocidos.");
  }
  let sharedImage: SharedThemeImagePointer | null = null;
  if (
    file.voxBackground &&
    typeof file.voxBackground === "object" &&
    !Array.isArray(file.voxBackground) &&
    (file.voxBackground as Record<string, unknown>).kind === "sharedImage"
  ) {
    const candidate = file.voxBackground as Record<string, unknown>;
    const keys = Object.keys(candidate);
    if (
      keys.length !== 4 ||
      !keys.every((key) => ["kind", "shareId", "fit", "dimPct"].includes(key)) ||
      typeof candidate.shareId !== "string" ||
      !THEME_ASSET_SHARE_ID_RE.test(candidate.shareId) ||
      typeof candidate.fit !== "string" ||
      !(THEME_BACKGROUND_FITS as readonly string[]).includes(candidate.fit) ||
      typeof candidate.dimPct !== "number" ||
      !Number.isInteger(candidate.dimPct) ||
      candidate.dimPct < 0 ||
      candidate.dimPct > VOX_BACKGROUND_DIM_MAX
    ) {
      return fail("La referencia de imagen del tema no es válida.");
    }
    sharedImage = candidate as SharedThemeImagePointer;
  }
  const parsed = customThemeInputSchema.safeParse({
    name: file.name,
    base: file.base,
    overrides: file.overrides,
    headerBackground: file.headerBackground,
    voxBackground: sharedImage ? { kind: "none" } : file.voxBackground,
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "El tema tiene datos inválidos.");
  }
  const input = parsed.data;
  return {
    ok: true,
    sharedImage,
    input:
      input.voxBackground.kind === "image" ? { ...input, voxBackground: { kind: "none" } } : input,
  };
};
