export const canMeasureVoxGridTrack = (input: {
  loadingInitial: boolean;
  error: string | null;
  itemCount: number;
}): boolean => !input.loadingInitial && input.error === null && input.itemCount > 0;
