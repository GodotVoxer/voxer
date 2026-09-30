import { create } from "zustand";
import type { BuiltinThemeId } from "@/lib/theme/builtinThemes";
import type {
  CustomThemeDto,
  CustomThemeInput,
  ThemeAssetDto,
  ThemeAssetQuota,
} from "@/lib/theme/customTheme";
import {
  DEFAULT_THEME_PREFERENCE,
  isBuiltinThemePreference,
  readStoredDeviceThemePreference,
  writeStoredDeviceThemePreference,
  writeStoredThemePreference,
  writeStoredThemeState,
  type BuiltinThemePreference,
  type StoredCustomTheme,
  type StoredThemeState,
  type ThemePreference,
  type ThemeSelection,
} from "@/lib/theme/themePreference";

export type ThemeEditorTarget =
  | { kind: "create"; base: BuiltinThemeId }
  | { kind: "edit"; themeId: string };

type ThemeState = {
  preference: ThemePreference;
  systemPrefersLight: boolean;
  /** false until `ThemeApplier` reads the stored preference and the system mode on the client. */
  hydrated: boolean;
  /** Signed in: choices go to the account and leave the device preference alone. */
  accountBound: boolean;
  /** Choice made with a session that the server has not confirmed yet (retried). */
  pendingServerSync: ThemeSelection | null;
  /** Active custom theme document; may be missing until `/auth/me` when only the cache exists. */
  customTheme: CustomThemeDto | null;
  /** Cached custom theme (base + variables) the inline script painted with. */
  cachedCustom: StoredCustomTheme | null;
  /** Editor draft, previewed on top of everything until saved or discarded. */
  draft: CustomThemeInput | null;
  /** The account's custom themes; null when not loaded. */
  customThemes: CustomThemeDto[] | null;
  editor: ThemeEditorTarget | null;
  /** Background images uploaded by the user (editor and draft); null when not loaded. */
  themeAssets: ThemeAssetDto[] | null;
  themeAssetQuota: ThemeAssetQuota | null;

  hydrate: (stored: StoredThemeState, systemPrefersLight: boolean) => void;
  setSystemPrefersLight: (systemPrefersLight: boolean) => void;
  /** Explicit choice of a builtin mode (sidebar selector). */
  setPreference: (preference: BuiltinThemePreference) => void;
  /** Explicit choice of an own custom theme. */
  selectCustomTheme: (theme: CustomThemeDto) => void;
  /** Theme coming from the account, or the device's on logout: applied without uploading it again. */
  adoptSelection: (mode: ThemePreference, customTheme: CustomThemeDto | null) => void;
  setAccountBound: (accountBound: boolean) => void;
  markServerSynced: (selection: ThemeSelection) => void;
  cacheCustomVariables: (stored: StoredCustomTheme) => void;
  setDraft: (draft: CustomThemeInput | null) => void;
  setCustomThemes: (themes: CustomThemeDto[] | null) => void;
  upsertCustomTheme: (theme: CustomThemeDto) => void;
  removeCustomTheme: (themeId: string) => void;
  openEditor: (target: ThemeEditorTarget) => void;
  closeEditor: () => void;
  setThemeAssets: (assets: ThemeAssetDto[], quota: ThemeAssetQuota) => void;
};

const sameSelection = (a: ThemeSelection | null, b: ThemeSelection): boolean =>
  a !== null &&
  a.mode === b.mode &&
  (a.mode !== "custom" || (b.mode === "custom" && a.themeId === b.themeId));

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: DEFAULT_THEME_PREFERENCE,
  systemPrefersLight: false,
  hydrated: false,
  accountBound: false,
  pendingServerSync: null,
  customTheme: null,
  cachedCustom: null,
  draft: null,
  customThemes: null,
  editor: null,
  themeAssets: null,
  themeAssetQuota: null,

  hydrate: (stored, systemPrefersLight) =>
    set({
      preference: stored.preference,
      cachedCustom: stored.custom,
      systemPrefersLight,
      hydrated: true,
    }),
  setSystemPrefersLight: (systemPrefersLight) => set({ systemPrefersLight }),

  setPreference: (preference) => {
    const { accountBound } = get();
    writeStoredThemePreference(preference);
    if (!accountBound) writeStoredDeviceThemePreference(preference);
    set({
      preference,
      customTheme: null,
      cachedCustom: null,
      pendingServerSync: accountBound ? { mode: preference } : null,
    });
  },

  selectCustomTheme: (theme) =>
    set({
      preference: "custom",
      customTheme: theme,
      pendingServerSync: { mode: "custom", themeId: theme.id },
    }),

  adoptSelection: (mode, customTheme) => {
    if (mode === "custom" && customTheme) {
      set({ preference: "custom", customTheme });
      return;
    }
    const builtin = isBuiltinThemePreference(mode) ? mode : DEFAULT_THEME_PREFERENCE;
    writeStoredThemePreference(builtin);
    set({ preference: builtin, customTheme: null, cachedCustom: null });
  },

  setAccountBound: (accountBound) => {
    const state = get();
    if (accountBound === state.accountBound) return;
    // First session on this device: store the signed-out choice to restore it on logout.
    if (accountBound && readStoredDeviceThemePreference() === null) {
      writeStoredDeviceThemePreference(
        isBuiltinThemePreference(state.preference) ? state.preference : DEFAULT_THEME_PREFERENCE,
      );
    }
    set(
      accountBound
        ? { accountBound }
        : {
            accountBound,
            pendingServerSync: null,
            customThemes: null,
            draft: null,
            editor: null,
            themeAssets: null,
            themeAssetQuota: null,
          },
    );
  },

  markServerSynced: (selection) => {
    if (sameSelection(get().pendingServerSync, selection)) set({ pendingServerSync: null });
  },

  cacheCustomVariables: (stored) => {
    writeStoredThemeState({ preference: "custom", custom: stored });
    set({ cachedCustom: stored });
  },

  setDraft: (draft) => set({ draft }),

  setCustomThemes: (customThemes) => set({ customThemes }),

  upsertCustomTheme: (theme) => {
    const { customThemes, customTheme } = get();
    const list = customThemes ?? [];
    const exists = list.some((t) => t.id === theme.id);
    set({
      customThemes: exists ? list.map((t) => (t.id === theme.id ? theme : t)) : [...list, theme],
      customTheme: customTheme?.id === theme.id ? theme : customTheme,
    });
  },

  removeCustomTheme: (themeId) => {
    const { customThemes, customTheme, cachedCustom, preference } = get();
    set({ customThemes: (customThemes ?? []).filter((t) => t.id !== themeId) });
    const activeId = customTheme?.id ?? cachedCustom?.id;
    if (preference === "custom" && activeId === themeId) {
      // The server already moved the account back to the deleted theme's base.
      get().adoptSelection(
        customTheme?.base ?? cachedCustom?.base ?? DEFAULT_THEME_PREFERENCE,
        null,
      );
    }
  },

  openEditor: (editor) => set({ editor }),
  closeEditor: () => set({ editor: null, draft: null }),
  setThemeAssets: (themeAssets, themeAssetQuota) => set({ themeAssets, themeAssetQuota }),
}));
