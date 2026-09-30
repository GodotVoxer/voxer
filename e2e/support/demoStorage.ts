import type { BrowserContext, Page } from "@playwright/test";
import { CATEGORY_FILTER_STORAGE_KEY } from "../../features/vox/categoryFilterStore";
import { SETTINGS_STORAGE_KEY } from "../../features/settings/store";
import {
  serializeThemePreference,
  THEME_STORAGE_KEY,
  type BuiltinThemePreference,
} from "../../lib/theme/themePreference";

export type DemoRole = "USER" | "ADMIN" | "ANON";

type DemoSeed = {
  /** Demo account the MSW backend impersonates; USER when omitted. */
  role?: DemoRole;
  theme?: BuiltinThemePreference;
  /** false simulates an account created before the community rules existed. */
  rulesAccepted?: boolean;
  /**
   * The home page opens the +18 prompt until it is answered, and the prompt hides the grid from
   * the accessibility tree; specs answer it unless they test the prompt itself.
   */
  nsfwPromptAnswered?: boolean;
  /** Persisted device settings (the `features/settings` store state). */
  settings?: Record<string, unknown>;
};

const persisted = (state: Record<string, unknown>) => JSON.stringify({ state, version: 0 });

const demoStorageEntries = ({
  role,
  theme,
  rulesAccepted,
  nsfwPromptAnswered = true,
  settings,
}: DemoSeed = {}): Record<string, string> => ({
  ...(role ? { "voxer:msw-demo-role": role } : {}),
  ...(theme ? { [THEME_STORAGE_KEY]: serializeThemePreference(theme) } : {}),
  ...(rulesAccepted !== undefined
    ? { "voxer:msw-demo-rules-accepted": String(rulesAccepted) }
    : {}),
  ...(nsfwPromptAnswered
    ? { [CATEGORY_FILTER_STORAGE_KEY]: persisted({ nsfwPromptAnswered: true }) }
    : {}),
  ...(settings ? { [SETTINGS_STORAGE_KEY]: persisted(settings) } : {}),
});

/** Seeds localStorage before any page script runs. */
export const seedDemo = (target: BrowserContext | Page, seed: DemoSeed = {}) =>
  target.addInitScript((entries) => {
    for (const [key, value] of Object.entries(entries)) window.localStorage.setItem(key, value);
  }, demoStorageEntries(seed));
