/** Escapes `%`, `_` and `\` for `ILIKE ... ESCAPE '\\'`. */
export const escapeSqlLikePattern = (value: string): string =>
  value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
