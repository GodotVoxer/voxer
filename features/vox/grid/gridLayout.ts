export const VOX_GRID_GAP_PX = 4;
export const VOX_GRID_TRACK_PADDING_TOP_PX = 2;
export const VOX_GRID_MOBILE_MAX_TRACK_PX = 640;
export const VOX_GRID_MD_MIN_TRACK_PX = 768;
export const VOX_GRID_MIN_CARD_PX_SM = 168;
export const VOX_GRID_MIN_CARD_PX_MD = 200;

/** Column target on wide desktops; not a hard cap, ultrawide tracks get more once the cell maximum is hit. */
export const VOX_GRID_WIDE_TARGET_COLUMNS = 6.5;
/** Cap on the minimum cell width: avoids huge cards and allows more columns as the track grows. */
export const VOX_GRID_WIDE_MAX_MIN_CARD_PX = 340;

/** Space kept on the right when distributing width, for the last card's ring and shadow. */
export const VOX_GRID_RIGHT_RING_SAFE_PX = 4;

export const minCardWidthPxForTrack = (trackWidthPx: number): number => {
  if (trackWidthPx < VOX_GRID_MOBILE_MAX_TRACK_PX) {
    return Math.max(1, Math.floor((trackWidthPx - VOX_GRID_GAP_PX) / 2));
  }
  if (trackWidthPx < VOX_GRID_MD_MIN_TRACK_PX) {
    return VOX_GRID_MIN_CARD_PX_SM;
  }
  const scaledMin = Math.floor(trackWidthPx / VOX_GRID_WIDE_TARGET_COLUMNS);
  return Math.max(VOX_GRID_MIN_CARD_PX_MD, Math.min(scaledMin, VOX_GRID_WIDE_MAX_MIN_CARD_PX));
};

export const getVoxGridTrackLayout = (
  trackWidthPx: number,
): { columns: number; columnWidth: number } => {
  const distributeWidthPx = Math.max(0, trackWidthPx - VOX_GRID_RIGHT_RING_SAFE_PX);
  const minCardWidthForColumns = minCardWidthPxForTrack(trackWidthPx);

  const columns =
    trackWidthPx < VOX_GRID_MOBILE_MAX_TRACK_PX
      ? 2
      : Math.max(
          2,
          Math.floor(
            (distributeWidthPx + VOX_GRID_GAP_PX) / (minCardWidthForColumns + VOX_GRID_GAP_PX),
          ),
        );

  const totalGapPx = VOX_GRID_GAP_PX * Math.max(0, columns - 1);
  const columnWidth =
    columns <= 1
      ? distributeWidthPx
      : Math.max(1, Math.floor((distributeWidthPx - totalGapPx) / columns));

  return { columns, columnWidth };
};

export const readGridTrackWidthPx = (el: HTMLElement): number => {
  const st = window.getComputedStyle(el);
  const padX = (Number.parseFloat(st.paddingLeft) || 0) + (Number.parseFloat(st.paddingRight) || 0);
  return Math.max(0, el.clientWidth - padX);
};
