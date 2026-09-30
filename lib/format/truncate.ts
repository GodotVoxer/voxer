export const truncateOgDescription = (text: string, maxChars: number): string => {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxChars) return collapsed;
  const sliceEnd = Math.max(1, maxChars - 1);
  return `${collapsed.slice(0, sliceEnd)}…`;
};
