import type { Prisma, ThemeMode } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { AccountThemePreference } from "@/lib/theme/themeAccountSync";
import type { ThemePreference, ThemeSelection } from "@/lib/theme/themePreference";
import { CUSTOM_THEME_SELECT, customThemeDtoFromRow } from "@/server/theme/customThemes";

const MODE_TO_PREFERENCE: Record<ThemeMode, ThemePreference> = {
  DARK: "dark",
  LIGHT: "light",
  SYSTEM: "system",
  CUSTOM: "custom",
};

const PREFERENCE_TO_MODE: Record<ThemePreference, ThemeMode> = {
  dark: "DARK",
  light: "LIGHT",
  system: "SYSTEM",
  custom: "CUSTOM",
};

export const ACCOUNT_THEME_SELECT = {
  themeMode: true,
  themeUpdatedAt: true,
  activeCustomTheme: { select: CUSTOM_THEME_SELECT },
} satisfies Prisma.UserSelect;

type AccountThemeRow = Prisma.UserGetPayload<{ select: typeof ACCOUNT_THEME_SELECT }>;

/** `CUSTOM` without a theme (deleted in a race) falls back to dark. */
export const accountThemePreferenceFromRow = (row: AccountThemeRow): AccountThemePreference => {
  const customTheme = row.activeCustomTheme ? customThemeDtoFromRow(row.activeCustomTheme) : null;
  const mode = MODE_TO_PREFERENCE[row.themeMode];
  return {
    mode: mode === "custom" && !customTheme ? "dark" : mode,
    updatedAt: row.themeUpdatedAt?.toISOString() ?? null,
    customTheme: mode === "custom" ? customTheme : null,
  };
};

/** null when the custom theme is missing or not the user's. */
export const setUserThemePreference = async (
  userId: string,
  selection: ThemeSelection,
): Promise<AccountThemePreference | null> => {
  if (selection.mode === "custom") {
    const owned = await prisma.userTheme.findFirst({
      where: { id: selection.themeId, userId },
      select: { id: true },
    });
    if (!owned) return null;
  }
  const row = await prisma.user.update({
    where: { id: userId },
    data: {
      themeMode: PREFERENCE_TO_MODE[selection.mode],
      activeCustomThemeId: selection.mode === "custom" ? selection.themeId : null,
      themeUpdatedAt: new Date(),
    },
    select: ACCOUNT_THEME_SELECT,
  });
  return accountThemePreferenceFromRow(row);
};
