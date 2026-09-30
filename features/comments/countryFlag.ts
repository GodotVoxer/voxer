/** `flag-icons` suffix (`fi-xx`) for an ISO 3166-1 alpha-2 code; `null` when invalid. */
export const countryIso2FlagIconSuffix = (code: string): string | null => {
  const upper = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return null;
  return upper.toLowerCase();
};
