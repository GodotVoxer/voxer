import type { Prisma, ThemeBase } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { BuiltinThemeId } from "@/lib/theme/builtinThemes";
import {
  CUSTOM_THEME_OVERRIDE_KEYS,
  CUSTOM_THEMES_PER_USER_MAX,
  DEFAULT_HEADER_BACKGROUND,
  DEFAULT_VOX_BACKGROUND,
  HEX_COLOR_RE,
  type CustomThemeDto,
  type CustomThemeInput,
  type CustomThemeOverrideKey,
  type CustomThemeOverrides,
  type ThemeBackgroundImageRef,
  type VoxBackground,
} from "@/lib/theme/customTheme";
import { headerBackgroundSchema, voxBackgroundSchema } from "@/lib/theme/customThemeSchema";
import { themeAssetPublicUrl } from "@/server/theme/themeAssetStorage";

const BASE_TO_DB: Record<BuiltinThemeId, ThemeBase> = { dark: "DARK", light: "LIGHT" };
const DB_TO_BASE: Record<ThemeBase, BuiltinThemeId> = { DARK: "dark", LIGHT: "light" };
const OVERRIDE_KEY_SET: ReadonlySet<string> = new Set(CUSTOM_THEME_OVERRIDE_KEYS);

export const CUSTOM_THEME_SELECT = {
  id: true,
  name: true,
  base: true,
  overrides: true,
  headerBackground: true,
  voxBackground: true,
  version: true,
  updatedAt: true,
  backgroundAsset: { select: { id: true, objectKey: true, objectKeySm: true } },
} satisfies Prisma.UserThemeSelect;

type CustomThemeRow = Prisma.UserThemeGetPayload<{ select: typeof CUSTOM_THEME_SELECT }>;

/** A corrupt row must not break loading: keep only valid colors and reset the background. */
const salvageOverrides = (value: Prisma.JsonValue): CustomThemeOverrides => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const overrides: CustomThemeOverrides = {};
  for (const [key, color] of Object.entries(value)) {
    if (OVERRIDE_KEY_SET.has(key) && typeof color === "string" && HEX_COLOR_RE.test(color)) {
      overrides[key as CustomThemeOverrideKey] = color;
    }
  }
  return overrides;
};

/** URLs come only from the relation (server keys) and only when it matches the stored background id. */
const backgroundImageRef = (
  background: VoxBackground,
  asset: CustomThemeRow["backgroundAsset"],
): ThemeBackgroundImageRef | null => {
  if (background.kind !== "image" || !asset || asset.id !== background.assetId) return null;
  return {
    assetId: asset.id,
    url: themeAssetPublicUrl(asset.objectKey),
    urlSm: themeAssetPublicUrl(asset.objectKeySm),
  };
};

export const customThemeDtoFromRow = (row: CustomThemeRow): CustomThemeDto => {
  const parsed = voxBackgroundSchema.safeParse(row.voxBackground);
  const voxBackground = parsed.success ? parsed.data : DEFAULT_VOX_BACKGROUND;
  const parsedHeader = headerBackgroundSchema.safeParse(row.headerBackground);
  const headerBackground = parsedHeader.success ? parsedHeader.data : DEFAULT_HEADER_BACKGROUND;
  return {
    id: row.id,
    name: row.name,
    base: DB_TO_BASE[row.base],
    overrides: salvageOverrides(row.overrides),
    headerBackground,
    voxBackground,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
    backgroundImage: backgroundImageRef(voxBackground, row.backgroundAsset),
  };
};

const writableData = (input: CustomThemeInput, backgroundAssetId: string | null) => ({
  name: input.name,
  base: BASE_TO_DB[input.base],
  overrides: input.overrides as Prisma.InputJsonObject,
  headerBackground: input.headerBackground as Prisma.InputJsonObject,
  voxBackground: input.voxBackground as Prisma.InputJsonObject,
  backgroundAssetId,
});

type Db = Pick<typeof prisma, "userThemeAsset">;

/** `undefined` means the background asks for an image that is missing or not the user's. */
const resolveBackgroundAssetId = async (
  db: Db,
  userId: string,
  input: CustomThemeInput,
): Promise<string | null | undefined> => {
  if (input.voxBackground.kind !== "image") return null;
  const asset = await db.userThemeAsset.findFirst({
    where: { id: input.voxBackground.assetId, userId },
    select: { id: true },
  });
  return asset?.id;
};

export const listCustomThemes = async (userId: string): Promise<CustomThemeDto[]> => {
  const rows = await prisma.userTheme.findMany({
    where: { userId },
    select: CUSTOM_THEME_SELECT,
    orderBy: { createdAt: "asc" },
  });
  return rows.map(customThemeDtoFromRow);
};

export type CreateCustomThemeResult =
  | { ok: true; theme: CustomThemeDto }
  | { ok: false; reason: "limit" | "asset_not_found" };

export const createCustomTheme = async (
  userId: string,
  input: CustomThemeInput,
): Promise<CreateCustomThemeResult> =>
  prisma.$transaction(async (tx) => {
    const count = await tx.userTheme.count({ where: { userId } });
    if (count >= CUSTOM_THEMES_PER_USER_MAX) return { ok: false, reason: "limit" } as const;
    const backgroundAssetId = await resolveBackgroundAssetId(tx, userId, input);
    if (backgroundAssetId === undefined) return { ok: false, reason: "asset_not_found" } as const;
    const row = await tx.userTheme.create({
      data: { userId, ...writableData(input, backgroundAssetId) },
      select: CUSTOM_THEME_SELECT,
    });
    return { ok: true, theme: customThemeDtoFromRow(row) } as const;
  });

export type UpdateCustomThemeResult =
  | { ok: true; theme: CustomThemeDto }
  | { ok: false; reason: "not_found" | "conflict" | "asset_not_found" };

/** Optimistic concurrency: updates only when the version matches what the client read. */
export const updateCustomTheme = async (
  userId: string,
  themeId: string,
  input: CustomThemeInput & { version: number },
): Promise<UpdateCustomThemeResult> => {
  const backgroundAssetId = await resolveBackgroundAssetId(prisma, userId, input);
  if (backgroundAssetId === undefined) {
    const exists = await prisma.userTheme.findFirst({
      where: { id: themeId, userId },
      select: { id: true },
    });
    return { ok: false, reason: exists ? "asset_not_found" : "not_found" };
  }
  const result = await prisma.userTheme.updateMany({
    where: { id: themeId, userId, version: input.version },
    data: { ...writableData(input, backgroundAssetId), version: { increment: 1 } },
  });
  const row = await prisma.userTheme.findFirst({
    where: { id: themeId, userId },
    select: CUSTOM_THEME_SELECT,
  });
  if (!row) return { ok: false, reason: "not_found" };
  if (result.count === 0) return { ok: false, reason: "conflict" };
  return { ok: true, theme: customThemeDtoFromRow(row) };
};

/** Deleting the active theme moves the account back to that theme's base in the same transaction. */
export const deleteCustomTheme = async (userId: string, themeId: string): Promise<boolean> =>
  prisma.$transaction(async (tx) => {
    const theme = await tx.userTheme.findFirst({
      where: { id: themeId, userId },
      select: { id: true, base: true },
    });
    if (!theme) return false;
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { activeCustomThemeId: true },
    });
    if (user?.activeCustomThemeId === theme.id) {
      await tx.user.update({
        where: { id: userId },
        data: { themeMode: theme.base, activeCustomThemeId: null, themeUpdatedAt: new Date() },
      });
    }
    await tx.userTheme.delete({ where: { id: theme.id } });
    return true;
  });
