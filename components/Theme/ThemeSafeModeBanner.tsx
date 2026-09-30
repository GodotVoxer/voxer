"use client";
import { ShieldCheck } from "lucide-react";
import { useThemeStore } from "@/features/theme/store";
import { useThemeSafeMode } from "@/hooks/theme/useThemeSafeMode";

export const ThemeSafeModeBanner = () => {
  const preference = useThemeStore((s) => s.preference);
  const safeMode = useThemeSafeMode();
  if (!safeMode || preference !== "custom") return null;
  return (
    <div
      role="status"
      data-theme="dark"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-lg border border-fg/15 bg-surface-raised p-3 text-sm text-fg shadow-xl"
    >
      <ShieldCheck className="size-5 shrink-0 text-success-400" aria-hidden />
      <span className="min-w-0 flex-1">
        Modo seguro: tu tema personalizado está desactivado en esta página.
      </span>
      <a
        href={typeof window === "undefined" ? "/" : window.location.pathname}
        className="shrink-0 font-medium text-brand-300 hover:underline"
      >
        Salir
      </a>
    </div>
  );
};
