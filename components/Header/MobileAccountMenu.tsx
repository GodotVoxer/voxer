"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Crown, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth/store";
import { isStaffRole } from "@/lib/moderation/roles";

const roleLabel = (role: string): string => {
  if (role === "ADMIN") return "Administrador";
  if (role === "MOD") return "Moderador";
  return "Usuario";
};

/** Must cover the exit animation; if `animationend` never fires, the fallback unmounts anyway. */
const CLOSE_ANIMATION_MS = 160;

/** Account menu below the `sm` breakpoint (icon, user, sign out). */
export const MobileAccountMenu = () => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  /** Stays mounted while the exit animation runs. */
  const [closing, setClosing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const requestClose = useCallback(() => {
    setOpen((wasOpen) => {
      if (wasOpen) setClosing(true);
      return false;
    });
  }, []);

  /**
   * The panel is centered by CSS (`left-1/2` + `-translate-x-1/2`), so the first frame is already in
   * place. This only corrects when centering would overflow the screen near the edge; Tailwind v4 uses
   * the separate `translate` property, so it does not fight the animation.
   */
  const clampToViewport = useCallback((anchor: HTMLDivElement | null) => {
    const trigger = triggerRef.current;
    if (!anchor || !trigger) return;
    const t = trigger.getBoundingClientRect();
    const width = anchor.offsetWidth;
    const margin = 8;
    const centered = t.left + t.width / 2 - width / 2;
    const clamped = Math.min(Math.max(centered, margin), window.innerWidth - width - margin);
    const shift = clamped - centered;
    anchor.style.translate = shift === 0 ? "" : `calc(-50% + ${shift}px)`;
  }, []);

  const anchorCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      anchorRef.current = node;
      clampToViewport(node);
    },
    [clampToViewport],
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) requestClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    const reposition = () => clampToViewport(anchorRef.current);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", reposition);
    window.addEventListener("orientationchange", reposition);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("orientationchange", reposition);
    };
  }, [open, requestClose, clampToViewport]);

  useEffect(() => {
    if (!closing) return;
    // Fallback: with `prefers-reduced-motion`, in a hidden tab or when the node never animates,
    // `animationend` does not fire and the panel would stay mounted forever.
    closeTimerRef.current = setTimeout(() => setClosing(false), CLOSE_ANIMATION_MS + 120);
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    };
  }, [closing]);

  if (!user) return null;

  const staff = isStaffRole(user.role);
  const initial = user.username.trim().charAt(0).toUpperCase() || "?";
  const mounted = open || closing;

  return (
    <div className="relative sm:hidden" ref={rootRef}>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="icon"
        className="app-header-control shrink-0 text-fg-secondary hover:bg-fg/10 hover:text-fg"
        aria-label="Menú de cuenta"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => (open ? requestClose() : (setClosing(false), setOpen(true)))}
      >
        <User className="size-5" />
      </Button>
      {mounted ? (
        // The anchor only positions; the animation lives on the child so neither centering nor clamping
        // is lost while it runs.
        <div
          ref={anchorCallbackRef}
          className="absolute left-1/2 top-full z-50 mt-1.5 w-[min(15rem,calc(100vw-1.5rem))] -translate-x-1/2"
        >
          <div
            role="menu"
            data-state={open ? "open" : "closed"}
            onAnimationEnd={() => {
              if (!open) setClosing(false);
            }}
            className="origin-top overflow-hidden rounded-xl border border-fg/15 bg-surface-elevated shadow-xl duration-200 ease-out data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fill-mode-forwards data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 data-[state=closed]:duration-150"
          >
            {/* The gradient goes from the brand to the category ramp, the same two colors as the header. */}
            <div className="flex items-center gap-3 bg-gradient-to-br from-brand-950/80 via-surface-raised to-category-950/70 px-3 py-3">
              <span
                className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-600 text-base font-semibold text-on-solid shadow-sm ring-2 ring-brand-400/35"
                aria-hidden
              >
                {initial}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-fg">
                  {user.username}
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-[0.7rem] leading-none">
                  {staff ? (
                    <Crown
                      className="size-3 shrink-0 fill-staff-crown text-staff-crown"
                      strokeWidth={2}
                      aria-hidden
                    />
                  ) : null}
                  <span className={staff ? "text-staff-crown" : "text-fg-subtle"}>
                    {roleLabel(user.role)}
                  </span>
                </span>
              </span>
            </div>
            <div className="border-t border-fg/10 p-1.5">
              <button
                type="button"
                role="menuitem"
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-danger-300 outline-none transition-colors hover:bg-danger-950/55 focus-visible:bg-danger-950/55"
                onClick={() => {
                  requestClose();
                  void logout();
                }}
              >
                <LogOut className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                Salir
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
