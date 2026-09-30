"use client";
import { useVoxDetailBackgroundStyle } from "@/hooks/theme/useVoxDetailBackgroundStyle";

/**
 * Custom detail background fixed to the viewport, not the `<main>`: with many comments the `<main>`
 * grows and `cover` stretches the image. A `fixed` element (unlike `background-attachment: fixed`)
 * also works on iOS. Needs `isolate` on `<main>` so `-z-10` sits above its fallback color.
 */
export const VoxDetailBackdrop = () => {
  const style = useVoxDetailBackgroundStyle();
  if (!style) return null;
  return (
    <div
      aria-hidden
      data-testid="vox-detail-backdrop"
      className="pointer-events-none fixed inset-x-0 top-[var(--app-header-offset)] bottom-0 -z-10"
      style={style}
    />
  );
};
