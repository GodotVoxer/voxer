export const pollBarHueForSortOrder = (sortOrder: number): number => (22 + sortOrder * 61) % 360;
