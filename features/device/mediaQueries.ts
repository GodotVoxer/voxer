/** Tailwind's `md`: below it the layout is the phone one. */
export const MOBILE_MEDIA_QUERY = "(max-width: 767px)";

/** Must match Tailwind's `lg`, which switches the vox detail to two columns. */
export const TWO_COLUMN_MEDIA_QUERY = "(min-width: 1024px)";

export const FINE_POINTER_MEDIA_QUERY = "(hover: hover) and (pointer: fine)";

/**
 * Width alone is not enough for desktop: a phone in landscape or an emulated phone can be wider than
 * `md` and still be touch-only.
 */
export const DESKTOP_MEDIA_QUERY = `(min-width: 768px) and ${FINE_POINTER_MEDIA_QUERY}`;

export const matchesMediaQuery = (query: string): boolean => window.matchMedia(query).matches;

export const isTwoColumnLayout = (): boolean => matchesMediaQuery(TWO_COLUMN_MEDIA_QUERY);
