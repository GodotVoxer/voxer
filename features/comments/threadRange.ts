import { defaultRangeExtractor, type Range } from "@tanstack/react-virtual";

/** Virtual range plus rows that must stay mounted far from the viewport: a playing video dies when React unmounts it. */
export const rangeWithPinnedIndexes = (range: Range, pinned: Iterable<number>): number[] => {
  const base = defaultRangeExtractor(range);
  const inRange = new Set(base);
  const extra: number[] = [];
  for (const index of pinned) {
    if (!Number.isInteger(index) || index < 0 || index >= range.count) continue;
    if (inRange.has(index)) continue;
    inRange.add(index);
    extra.push(index);
  }
  if (extra.length === 0) return base;
  return [...base, ...extra].sort((a, b) => a - b);
};
