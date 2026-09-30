import { describe, expect, it } from "vitest";
import type { CustomThemeDto } from "./customTheme";
import { decideThemeAccountSync, type ThemeAccountSyncInput } from "./themeAccountSync";

const theme = (overrides: Partial<CustomThemeDto> = {}): CustomThemeDto => ({
  id: "cltheme1",
  name: "Noche",
  base: "dark",
  overrides: { brand: "#7c3aed" },
  headerBackground: { kind: "none" },
  voxBackground: { kind: "none" },
  version: 1,
  updatedAt: "2026-09-14T12:00:00.000Z",
  ...overrides,
});

const base: ThemeAccountSyncInput = {
  accountTheme: null,
  wasLoggedIn: false,
  local: { preference: "dark", customTheme: null, cachedCustomThemeId: null },
  pendingServerSync: null,
};

const chosenAt = "2026-09-14T12:00:00.000Z";

describe("decideThemeAccountSync", () => {
  it("does nothing without a current or previous session", () => {
    expect(decideThemeAccountSync(base)).toEqual({ kind: "none" });
  });

  it("restores the device preference on logout", () => {
    expect(decideThemeAccountSync({ ...base, wasLoggedIn: true })).toEqual({
      kind: "restoreDevice",
    });
  });

  it("first sign-in of an account without a theme uploads the local preference", () => {
    expect(
      decideThemeAccountSync({
        ...base,
        accountTheme: { mode: "dark", updatedAt: null, customTheme: null },
        local: { ...base.local, preference: "light" },
      }),
    ).toEqual({ kind: "push", selection: { mode: "light" } });
  });

  it("once the account has chosen, its theme wins over the device's", () => {
    expect(
      decideThemeAccountSync({
        ...base,
        accountTheme: { mode: "system", updatedAt: chosenAt, customTheme: null },
        local: { ...base.local, preference: "light" },
      }),
    ).toEqual({ kind: "adopt", mode: "system", customTheme: null });
  });

  it("an unconfirmed local change is retried instead of being overwritten", () => {
    expect(
      decideThemeAccountSync({
        ...base,
        accountTheme: { mode: "dark", updatedAt: chosenAt, customTheme: null },
        local: { ...base.local, preference: "custom", customTheme: theme() },
        pendingServerSync: { mode: "custom", themeId: "cltheme1" },
      }),
    ).toEqual({ kind: "push", selection: { mode: "custom", themeId: "cltheme1" } });
  });

  it("adopts the account's custom theme when the local one differs or is stale", () => {
    const remote = theme({ version: 3 });
    const account = { mode: "custom" as const, updatedAt: chosenAt, customTheme: remote };
    expect(
      decideThemeAccountSync({
        ...base,
        accountTheme: account,
        local: {
          preference: "custom",
          customTheme: theme({ version: 2 }),
          cachedCustomThemeId: null,
        },
      }),
    ).toEqual({ kind: "adopt", mode: "custom", customTheme: remote });
    expect(
      decideThemeAccountSync({
        ...base,
        accountTheme: account,
        local: { preference: "custom", customTheme: null, cachedCustomThemeId: "cltheme1" },
      }),
    ).toEqual({ kind: "adopt", mode: "custom", customTheme: remote });
  });

  it("does nothing when the custom theme is in sync", () => {
    expect(
      decideThemeAccountSync({
        ...base,
        wasLoggedIn: true,
        accountTheme: { mode: "custom", updatedAt: chosenAt, customTheme: theme() },
        local: { preference: "custom", customTheme: theme(), cachedCustomThemeId: "cltheme1" },
      }),
    ).toEqual({ kind: "none" });
  });

  it("the first push with a merely cached custom theme uses its id", () => {
    expect(
      decideThemeAccountSync({
        ...base,
        accountTheme: { mode: "dark", updatedAt: null, customTheme: null },
        local: { preference: "custom", customTheme: null, cachedCustomThemeId: "cltheme9" },
      }),
    ).toEqual({ kind: "push", selection: { mode: "custom", themeId: "cltheme9" } });
  });
});
