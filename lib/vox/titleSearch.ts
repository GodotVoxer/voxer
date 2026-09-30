import Fuse from "fuse.js";
import type { IFuseOptions } from "fuse.js";

/** Candidate rows fetched from SQL before ranking with Fuse (bounded cost). */
export const VOX_SEARCH_SQL_POOL_LIMIT = 1500;

/** Fuse options that favour precision over recall (a lower threshold is stricter). */
const voxTitleFuseOptions: IFuseOptions<{ title: string }> = {
  keys: ["title"],
  threshold: 0.28,
  ignoreLocation: true,
  minMatchCharLength: 2,
  distance: 72,
  ignoreDiacritics: true,
  includeScore: true,
  shouldSort: true,
};

const splitSearchTokens = (q: string): string[] =>
  q.trim().normalize("NFKC").toLowerCase().split(/\s+/).filter(Boolean);

/** Tokens for SQL substring matching (avoids overly ambiguous `LIKE '%a%'`). */
export const significantSearchTokens = (q: string): string[] =>
  splitSearchTokens(q).filter((t) => t.length >= 2);

export const rankVoxRowsByFuzzyTitle = <T extends { title: string }>(
  rows: readonly T[],
  query: string,
): T[] => {
  const q = query.trim();
  if (!q || rows.length === 0) {
    return [];
  }
  const fuse = new Fuse([...rows], voxTitleFuseOptions);
  const hits = fuse.search(q, { limit: rows.length });
  const maxScore = 0.42;
  return hits.filter((h) => h.score == null || h.score <= maxScore).map((h) => h.item);
};
