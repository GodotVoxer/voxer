/** What the detail does with a `vox:updated`; three actions emit it with different fields. */
export type VoxUpdatedEffect =
  | { kind: "reload" }
  | { kind: "patch-category"; category: string }
  | { kind: "ignore" };

export const voxUpdatedEffect = (payload: unknown): VoxUpdatedEffect => {
  if (payload == null || typeof payload !== "object") return { kind: "ignore" };
  const p = payload as Record<string, unknown>;
  // The owner-admin edit sends text, but the detail has more fields to revalidate.
  if (typeof p.title === "string" || typeof p.description === "string") return { kind: "reload" };
  // A recategorization carries everything needed: patch without refetching.
  if (typeof p.category === "string" && p.category.trim().length > 0) {
    return { kind: "patch-category", category: p.category };
  }
  // `pinnedAt` only reorders the grid; the detail does not show it.
  return { kind: "ignore" };
};
