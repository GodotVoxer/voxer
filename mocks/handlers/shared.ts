import { HttpResponse } from "msw";
import { MSW_DEMO_ALWAYS_NEW_LIST_ITEM_IDS } from "@/mocks/data/voxList";
import type { VoxDetail, VoxListItem } from "@/lib/vox/types";
import { RULES_NOT_ACCEPTED_CODE, RULES_NOT_ACCEPTED_MESSAGE_ES } from "@/lib/auth/communityRules";
import type { AccountThemePreference } from "@/lib/theme/themeAccountSync";
import {
  type CustomThemeDto,
  type ThemeAssetDto,
  type VoxBackground,
} from "@/lib/theme/customTheme";
import {
  THEME_BG_ASSETS_PER_USER_MAX,
  THEME_BG_TOTAL_BYTES_MAX,
} from "@/lib/theme/themeBackgroundLimits";

/** Mutable demo backend state shared by every handler group. */
export const demoState = {
  voxCounter: 13,
  /** Simulated session; MSW has no real cookies. */
  authSessionActive: true,
  /** With the ANON demo role the session starts closed; signing in or registering opens it. */
  anonSignedIn: false,
  /** e2e: `localStorage["voxer:msw-demo-rules-accepted"] = "false"` simulates an account from before the rules. */
  rulesAccepted: null as boolean | null,
  customThemes: [] as CustomThemeDto[],
  themeAssets: [] as ThemeAssetDto[],
  accountTheme: { mode: "dark", updatedAt: null, customTheme: null } as AccountThemePreference,
};

export const withMswDemoFreshCreatedAt = (items: VoxListItem[]): VoxListItem[] => {
  const now = new Date().toISOString();
  return items.map((v) =>
    MSW_DEMO_ALWAYS_NEW_LIST_ITEM_IDS.has(v.id) ? { ...v, createdAt: now } : v,
  );
};

export const sortMswDefaultHomeByPin = (items: VoxListItem[]): VoxListItem[] =>
  [...items].sort((a, b) => {
    const ta = a.pinnedAt ? new Date(a.pinnedAt).getTime() : Number.NEGATIVE_INFINITY;
    const tb = b.pinnedAt ? new Date(b.pinnedAt).getTime() : Number.NEGATIVE_INFINITY;
    if (ta !== tb) return tb - ta;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
export const readMockRulesAccepted = (): boolean => {
  if (demoState.rulesAccepted !== null) return demoState.rulesAccepted;
  try {
    return window.localStorage.getItem("voxer:msw-demo-rules-accepted") !== "false";
  } catch {
    return true;
  }
};
export const mockRulesNotAcceptedResponse = () =>
  HttpResponse.json(
    { code: RULES_NOT_ACCEPTED_CODE, error: RULES_NOT_ACCEPTED_MESSAGE_ES },
    { status: 403 },
  );
/** Visual tests: `localStorage["voxer:msw-demo-role"]` = "ADMIN" | "ANON" (USER by default). */
const MSW_DEMO_ROLE_STORAGE_KEY = "voxer:msw-demo-role";
export const mswDemoRole = (): "USER" | "ADMIN" | "ANON" => {
  try {
    const raw = window.localStorage.getItem(MSW_DEMO_ROLE_STORAGE_KEY);
    return raw === "ADMIN" || raw === "ANON" ? raw : "USER";
  } catch {
    return "USER";
  }
};
export const mockThemeAssetShares = new Map<string, string>();
export const mockThemeAssetQuota = () => ({
  count: demoState.themeAssets.length,
  maxCount: THEME_BG_ASSETS_PER_USER_MAX,
  bytes: demoState.themeAssets.reduce((sum, a) => sum + a.byteSize, 0),
  maxBytes: THEME_BG_TOTAL_BYTES_MAX,
});
/** Like the server: URLs come from the stored image, never from the request body. */
export const mockBackgroundImageRef = (background: VoxBackground) => {
  if (background.kind !== "image") return null;
  const asset = demoState.themeAssets.find((a) => a.id === background.assetId);
  return asset ? { assetId: asset.id, url: asset.url, urlSm: asset.urlSm } : null;
};
const readMswDemoAccountTheme = (): AccountThemePreference => {
  try {
    const raw = window.localStorage.getItem("voxer:msw-demo-account-theme");
    const parsed = raw ? (JSON.parse(raw) as Partial<AccountThemePreference>) : null;
    if (parsed?.mode === "dark" || parsed?.mode === "light" || parsed?.mode === "system") {
      return { mode: parsed.mode, updatedAt: parsed.updatedAt ?? null, customTheme: null };
    }
    if (parsed?.mode === "custom" && parsed.customTheme) {
      demoState.customThemes = [parsed.customTheme];
      return {
        mode: "custom",
        updatedAt: parsed.updatedAt ?? null,
        customTheme: parsed.customTheme,
      };
    }
  } catch {
    /* no override */
  }
  return { mode: "dark", updatedAt: null, customTheme: null };
};
demoState.accountTheme = readMswDemoAccountTheme();
export const mockDetailOverrides = new Map<string, VoxDetail>();
export const parseJson = <T>(body: string | undefined): T | null => {
  if (!body) return null;
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
};
/** Sample bodies: a row is identified by what the user wrote, not by the vox. */
export const DEMO_MY_COMMENT_BODIES = [
  "",
  ">>6DTE2TQY jaja no puede ser real esa captura",
  "yo lo jugué en la notebook de la facu y andaba sorprendentemente bien",
  "a mí me pasó algo parecido en el campo de mi viejo, pero era el molino",
];
