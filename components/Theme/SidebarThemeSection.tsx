"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Monitor, Moon, Palette, Pencil, Plus, Sun, type LucideIcon } from "lucide-react";
import { DrawerClose } from "@/components/ui/drawer";
import { useAuthStore } from "@/features/auth/store";
import { listCustomThemesRequest } from "@/features/theme/api";
import { useThemeStore } from "@/features/theme/store";
import { CUSTOM_THEMES_PER_USER_MAX } from "@/lib/theme/customTheme";
import { resolveThemePreference, type BuiltinThemePreference } from "@/lib/theme/themePreference";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: { value: BuiltinThemePreference; label: string; icon: LucideIcon }[] = [
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "light", label: "Claro", icon: Sun },
  { value: "system", label: "Sistema", icon: Monitor },
];

const HEADING_ID = "sidebar-theme-heading";
const CUSTOM_HEADING_ID = "sidebar-custom-themes-heading";

export const SidebarThemeSection = () => {
  const user = useAuthStore((s) => s.user);
  const preference = useThemeStore((s) => s.preference);
  const systemPrefersLight = useThemeStore((s) => s.systemPrefersLight);
  const customTheme = useThemeStore((s) => s.customTheme);
  const cachedCustom = useThemeStore((s) => s.cachedCustom);
  const customThemes = useThemeStore((s) => s.customThemes);
  const setPreference = useThemeStore((s) => s.setPreference);
  const selectCustomTheme = useThemeStore((s) => s.selectCustomTheme);
  const setCustomThemes = useThemeStore((s) => s.setCustomThemes);
  const openEditor = useThemeStore((s) => s.openEditor);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!user || customThemes !== null) return;
    let cancelled = false;
    listCustomThemesRequest()
      .then((themes) => {
        if (!cancelled) setCustomThemes(themes);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user, customThemes, setCustomThemes]);

  const selectedIndex = THEME_OPTIONS.findIndex((o) => o.value === preference);
  const activeCustomId = preference === "custom" ? (customTheme?.id ?? cachedCustom?.id) : null;
  const currentBase = resolveThemePreference(
    preference,
    systemPrefersLight,
    customTheme?.base ?? cachedCustom?.base,
  );
  const atLimit = (customThemes?.length ?? 0) >= CUSTOM_THEMES_PER_USER_MAX;

  const selectByOffset = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const current = Math.max(0, selectedIndex);
    const next = (current + step + THEME_OPTIONS.length) % THEME_OPTIONS.length;
    setPreference(THEME_OPTIONS[next].value);
    optionRefs.current[next]?.focus();
  };

  return (
    <section className="mt-4 border-t border-fg/25 pt-4" aria-labelledby={HEADING_ID}>
      <h2
        id={HEADING_ID}
        className="flex items-center gap-2.5 px-1 py-2 text-base font-semibold text-fg"
      >
        <Palette className="size-5 shrink-0 text-fg" strokeWidth={2} aria-hidden />
        Tema
      </h2>
      <div
        role="radiogroup"
        aria-labelledby={HEADING_ID}
        onKeyDown={selectByOffset}
        className="mt-1 grid grid-cols-3 gap-1 rounded-lg border border-fg/15 bg-surface-sunken/80 p-1"
      >
        {THEME_OPTIONS.map(({ value, label, icon: Icon }, index) => {
          const selected = preference === value;
          return (
            <button
              key={value}
              ref={(el) => {
                optionRefs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected || (selectedIndex === -1 && index === 0) ? 0 : -1}
              onClick={() => setPreference(value)}
              className={cn(
                "flex min-h-12 cursor-pointer flex-col items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60",
                selected
                  ? "bg-brand-600 text-on-solid shadow-sm"
                  : "text-fg-secondary hover:bg-fg/10 hover:text-fg",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>

      {user ? (
        <div className="mt-3 space-y-2">
          <h3 id={CUSTOM_HEADING_ID} className="px-1 text-sm font-medium text-fg-soft">
            Mis temas
          </h3>
          {loadFailed ? (
            <p className="px-1 text-xs text-danger-400">No pudimos cargar tus temas.</p>
          ) : null}
          {customThemes && customThemes.length > 0 ? (
            <ul aria-labelledby={CUSTOM_HEADING_ID} className="space-y-1">
              {customThemes.map((theme) => {
                const active = activeCustomId === theme.id;
                return (
                  <li key={theme.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => selectCustomTheme(theme)}
                      className={cn(
                        "flex min-h-9 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm",
                        active ? "bg-brand-600 text-on-solid" : "text-fg hover:bg-fg/10",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{theme.name}</span>
                      <span
                        className={cn(
                          "shrink-0 text-xs",
                          active ? "text-on-solid" : "text-fg-subtle",
                        )}
                      >
                        {theme.base === "light" ? "Claro" : "Oscuro"}
                      </span>
                    </button>
                    <DrawerClose asChild>
                      <button
                        type="button"
                        aria-label={`Editar tema ${theme.name}`}
                        onClick={() => openEditor({ kind: "edit", themeId: theme.id })}
                        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-fg/10 hover:text-fg"
                      >
                        <Pencil className="size-4" aria-hidden />
                      </button>
                    </DrawerClose>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {atLimit ? (
            <p className="px-1 text-xs text-fg-subtle">
              Llegaste al máximo de {CUSTOM_THEMES_PER_USER_MAX} temas.
            </p>
          ) : (
            <DrawerClose asChild>
              <button
                type="button"
                disabled={customThemes === null}
                onClick={() => openEditor({ kind: "create", base: currentBase })}
                className="flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-sm font-medium text-brand-300 hover:bg-fg/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="size-4" aria-hidden />
                Crear tema
              </button>
            </DrawerClose>
          )}
        </div>
      ) : (
        <p className="mt-2 px-1 text-xs text-fg-subtle">
          Iniciá sesión para crear temas personalizados.
        </p>
      )}
    </section>
  );
};
