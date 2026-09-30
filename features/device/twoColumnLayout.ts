/** Must match Tailwind's `lg`, which switches the vox detail to two columns. */
export const TWO_COLUMN_MEDIA_QUERY = "(min-width: 1024px)";

export const isTwoColumnLayout = (): boolean => window.matchMedia(TWO_COLUMN_MEDIA_QUERY).matches;
