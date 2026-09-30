/** Stored as plain text: React escapes on render, so `<` is kept ("3 < 5", "<3"). */
export const sanitizePlainText = (input: string, maxLen: number): string => {
  const trimmed = input.replace(/\r\n/g, "\n").trim();
  return trimmed.replace(/\0/g, "").slice(0, maxLen);
};
