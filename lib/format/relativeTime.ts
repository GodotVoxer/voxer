export const formatRelativeTimeShortEs = (iso: string, nowMs: number = Date.now()): string => {
  const t = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((nowMs - t) / 1000));
  if (s < 60) return "ahora";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} d`;
};
