/** Height, type and border shared by the category/media pill and the comment count pill. */
export const voxCardTopPillShellLayoutClass =
  "h-6 min-h-0 text-[10px] font-semibold leading-none shadow-md ring-1 ring-media-scrim/25";

/** Top row (category/media and count) on grid cards and the create vox preview. */
export const voxCardTopOverlaysRowClassName =
  "pointer-events-none absolute top-1.5 right-1.5 left-1.5 z-[2] flex items-center justify-between gap-2 text-on-media sm:top-2 sm:right-2 sm:left-2";

/** Left slot of the row: the category/media pill. */
export const voxCardTopLeftPillSlotClassName =
  "pointer-events-auto flex min-w-0 max-w-[min(100%,18rem)] items-center sm:max-w-[60%]";
