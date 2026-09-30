/** Resting frame, ratio and ring shared by `VoxCard` and previews (e.g. create vox). */
export const voxCardFrameRestClassName =
  "relative z-0 aspect-square w-full touch-manipulation rounded bg-surface-elevated [-webkit-tap-highlight-color:transparent] shadow-[0_0_0_0px_transparent,0_0_16px_transparent,0_0_32px_transparent] ring-2 ring-brand-400/0";

/** Clips the content under the rounded frame (image, overlays and title). */
export const voxCardInnerShellClassName =
  "relative flex aspect-square h-full w-full flex-col justify-between overflow-hidden rounded";

/** [opacity %, position %] of the veil, bottom to top. */
const TITLE_SCRIM_STOPS: readonly (readonly [number, number])[] = [
  [62, 0],
  [48, 10],
  [36, 22],
  [24, 36],
  [16, 50],
  [9, 64],
  [4.5, 78],
  [1.6, 90],
];

/** Title veil: covers the bottom half of the card, opaque at the bottom and fading toward the middle. */
export const voxCardTitleHalfScrimGradient = `linear-gradient(to top,${TITLE_SCRIM_STOPS.map(
  ([opacity, pos]) => `color-mix(in srgb,var(--media-scrim) ${opacity}%,transparent) ${pos}%`,
).join(",")},transparent 100%)`;
