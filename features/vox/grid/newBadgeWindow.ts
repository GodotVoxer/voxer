export const VOX_NEW_BADGE_WINDOW_MS = 5 * 60 * 1000;

export const isCreatedAtWithinNewBadgeWindow = (
  createdAtIso: string,
  nowMs: number = Date.now(),
): boolean => {
  const created = new Date(createdAtIso).getTime();
  if (!Number.isFinite(created)) return false;
  const delta = nowMs - created;
  return delta >= 0 && delta < VOX_NEW_BADGE_WINDOW_MS;
};
