import type { HeaderBackground } from "@/lib/theme/customTheme";
import { headerBackgroundCss } from "@/lib/theme/headerBackgroundCss";
export const THEME_STORAGE_KEY = "voxer.theme.v1";
export const BUILTIN_THEME_PREFERENCES = ["dark", "light", "system"] as const;
export const SYSTEM_LIGHT_MEDIA_QUERY = "(prefers-color-scheme: light)";

export type BuiltinThemePreference = (typeof BUILTIN_THEME_PREFERENCES)[number];
export type ThemePreference = BuiltinThemePreference | "custom";
export type ResolvedTheme = "dark" | "light";
/** What the user chose: a builtin mode or a specific custom theme. */
export type ThemeSelection = { mode: BuiltinThemePreference } | { mode: "custom"; themeId: string };

export const DEFAULT_THEME_PREFERENCE: BuiltinThemePreference = "dark";

/** Browser bar color (`theme-color` meta), matching each theme's `surface`. */
export const THEME_COLOR_META: Record<ResolvedTheme, string> = {
  dark: "#030712",
  light: "#f3f4f6",
};

/** CSS variable name (without `--`) and value accepted from the local cache; nothing else is injected. */
export const CUSTOM_VAR_NAME_RE = /^[a-z][a-z0-9-]{0,39}$/;
export const CUSTOM_VAR_VALUE_RE = /^#[0-9a-f]{6}([0-9a-f]{2})?$/;
export const CUSTOM_VARS_MAX = 200;
const STORED_THEME_ID_RE = /^[a-z0-9]{1,64}$/;

/** Cache of the active custom theme: derived variables (only those differing from the base) for a flash-free paint. */
export type StoredCustomTheme = {
  id: string;
  base: ResolvedTheme;
  vars: Record<string, string>;
  headerBackground: HeaderBackground;
};
export type StoredThemeState = { preference: ThemePreference; custom: StoredCustomTheme | null };

const DEFAULT_STORED_STATE: StoredThemeState = {
  preference: DEFAULT_THEME_PREFERENCE,
  custom: null,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isBuiltinThemePreference = (value: unknown): value is BuiltinThemePreference =>
  typeof value === "string" && (BUILTIN_THEME_PREFERENCES as readonly string[]).includes(value);

export const isValidCustomThemeVars = (vars: unknown): vars is Record<string, string> => {
  if (!isRecord(vars)) return false;
  const entries = Object.entries(vars);
  return (
    entries.length <= CUSTOM_VARS_MAX &&
    entries.every(
      ([name, value]) =>
        CUSTOM_VAR_NAME_RE.test(name) &&
        typeof value === "string" &&
        CUSTOM_VAR_VALUE_RE.test(value),
    )
  );
};

const parseStoredCustomTheme = (value: unknown): StoredCustomTheme | null => {
  if (!isRecord(value)) return null;
  const { id, base, vars, headerBackground = { kind: "none" } } = value;
  if (typeof id !== "string" || !STORED_THEME_ID_RE.test(id)) return null;
  if (base !== "dark" && base !== "light") return null;
  if (!isValidCustomThemeVars(vars)) return null;
  if (
    !isRecord(headerBackground) ||
    (headerBackground.kind !== "none" && headerBackgroundCss(headerBackground) === null)
  ) {
    return null;
  }
  return { id, base, vars, headerBackground: headerBackground as HeaderBackground };
};

export const parseStoredThemeState = (raw: string | null): StoredThemeState => {
  if (!raw) return DEFAULT_STORED_STATE;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return DEFAULT_STORED_STATE;
    if (isBuiltinThemePreference(parsed.mode)) return { preference: parsed.mode, custom: null };
    if (parsed.mode === "custom") {
      const custom = parseStoredCustomTheme(parsed.custom);
      if (custom) return { preference: "custom", custom };
    }
  } catch {
    /* corrupt cache: fall back to the default */
  }
  return DEFAULT_STORED_STATE;
};

export const parseStoredThemePreference = (raw: string | null): ThemePreference =>
  parseStoredThemeState(raw).preference;

export const serializeThemePreference = (preference: BuiltinThemePreference): string =>
  JSON.stringify({ mode: preference });

export const serializeThemeState = ({ preference, custom }: StoredThemeState): string =>
  preference === "custom" && custom
    ? JSON.stringify({ mode: "custom", custom })
    : serializeThemePreference(preference === "custom" ? DEFAULT_THEME_PREFERENCE : preference);

export const readStoredThemeState = (): StoredThemeState => {
  try {
    return parseStoredThemeState(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_STORED_STATE;
  }
};

export const readStoredThemePreference = (): ThemePreference => readStoredThemeState().preference;

export const writeStoredThemeState = (state: StoredThemeState): void => {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, serializeThemeState(state));
  } catch {
    /* storage blocked (private mode, policies): the theme lasts as long as the tab */
  }
};

export const writeStoredThemePreference = (preference: BuiltinThemePreference): void =>
  writeStoredThemeState({ preference, custom: null });

/**
 * Preference chosen without a session on this device. The applied one (`THEME_STORAGE_KEY`) may come
 * from the account; this one is restored on logout so a shared device does not keep another account's
 * theme. Always a builtin mode: custom themes require a session.
 */
export const THEME_DEVICE_STORAGE_KEY = "voxer.theme.device.v1";

export const readStoredDeviceThemePreference = (): BuiltinThemePreference | null => {
  try {
    const raw = window.localStorage.getItem(THEME_DEVICE_STORAGE_KEY);
    if (!raw) return null;
    const preference = parseStoredThemePreference(raw);
    return isBuiltinThemePreference(preference) ? preference : null;
  } catch {
    return null;
  }
};

export const writeStoredDeviceThemePreference = (preference: BuiltinThemePreference): void => {
  try {
    window.localStorage.setItem(THEME_DEVICE_STORAGE_KEY, serializeThemePreference(preference));
  } catch {
    /* storage blocked */
  }
};

export const resolveThemePreference = (
  preference: ThemePreference,
  systemPrefersLight: boolean,
  customBase: ResolvedTheme = "dark",
): ResolvedTheme => {
  if (preference === "system") return systemPrefersLight ? "light" : "dark";
  if (preference === "custom") return customBase;
  return preference;
};

/** `?tema=seguro` ignores the custom theme, to recover from an unreadable one. */
export const THEME_SAFE_MODE_QUERY_RE = /(?:^|[?&])tema=seguro(?:&|$)/;

export const isThemeSafeMode = (search: string): boolean => THEME_SAFE_MODE_QUERY_RE.test(search);

type ThemeRootElement = {
  setAttribute: (name: string, value: string) => void;
  classList: { toggle: (token: string, force?: boolean) => unknown };
  style: { colorScheme: string };
};

/** `.dark` keeps shadcn's `dark:` variants working; `data-theme` selects the token block. */
export const applyResolvedTheme = (root: ThemeRootElement, resolved: ResolvedTheme): void => {
  root.setAttribute("data-theme", resolved);
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
};
