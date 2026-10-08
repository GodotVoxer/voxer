"use client";
import { PumpkinIcon } from "@/components/Theme/PumpkinIcon";
import { useThemeStore } from "@/features/theme/store";
import { cn } from "@/lib/utils";

/** Fixed sidebar entry while the seasonal window lasts: turns Halloween on or off on this device. */
export const SeasonalThemeSidebarItem = () => {
  const available = useThemeStore((s) => s.seasonalThemeAvailable);
  const active = useThemeStore((s) => s.seasonalThemeActive);
  const chooseSeasonalTheme = useThemeStore((s) => s.chooseSeasonalTheme);

  if (!available) return null;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={() => chooseSeasonalTheme(!active)}
      className={cn(
        "mt-3 flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60",
        active
          ? "border-brand-600/70 bg-brand-950/60 hover:bg-brand-950"
          : "border-fg/15 bg-surface-sunken/60 hover:bg-fg/10",
      )}
    >
      <PumpkinIcon className={cn("size-6 shrink-0", active ? "text-brand-300" : "text-fg-muted")} />
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-fg">Halloween</span>
        <span className="block text-xs text-fg-subtle">Tema de temporada, hasta el 1/11</span>
      </span>
      <span
        aria-hidden
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full transition-colors",
          active ? "bg-brand-600" : "bg-fg/20",
        )}
      >
        <span
          className={cn(
            "absolute top-1 left-1 size-4 rounded-full bg-on-solid transition-transform",
            active && "translate-x-4",
          )}
        />
      </span>
    </button>
  );
};
