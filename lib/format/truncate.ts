export const truncateWithEllipsis = (text: string, maxChars: number): string => {
  if (text.length <= maxChars) return text;
  let end = Math.max(1, maxChars - 1);
  // Cutting after a high surrogate would leave half an emoji behind.
  const last = text.charCodeAt(end - 1);
  if (last >= 0xd800 && last <= 0xdbff) end -= 1;
  return `${text.slice(0, end)}…`;
};

export const truncateSingleLine = (text: string, maxChars: number): string =>
  truncateWithEllipsis(text.replace(/\s+/g, " ").trim(), maxChars);
