import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VoxCategory } from "@/lib/vox/categories";
import { VOX_CATEGORIES_ALL } from "@/lib/vox/categories";
import type { CategoryGroup } from "@/lib/vox/categoryCodes";
import { NSFW_CATEGORIES } from "@/lib/vox/sensitiveCategories";
/** `localStorage` key; e2e specs seed it to start with the +18 prompt answered. */
export const CATEGORY_FILTER_STORAGE_KEY = "voxer-category-filter";
const nsfwOverrides = (enabled: boolean): Partial<Record<VoxCategory, boolean>> =>
  Object.fromEntries(NSFW_CATEGORIES.map((c) => [c, enabled]));
/** +18 categories start off: the home prompt must be answered before the grid can show them. */
const defaultEnabled = (): Record<VoxCategory, boolean> => ({
  ...(Object.fromEntries(VOX_CATEGORIES_ALL.map((c) => [c, true])) as Record<VoxCategory, boolean>),
  ...nsfwOverrides(false),
});
type State = {
  enabledByCategory: Record<VoxCategory, boolean>;
  /** False until the user answered the home +18 prompt. */
  nsfwPromptAnswered: boolean;
  setCategoryEnabled: (category: VoxCategory, enabled: boolean) => void;
  setGroupEnabled: (group: CategoryGroup, enabled: boolean) => void;
  answerNsfwPrompt: (showNsfw: boolean) => void;
};
export const useCategoryFilterStore = create<State>()(
  persist(
    (set) => ({
      enabledByCategory: defaultEnabled(),
      nsfwPromptAnswered: false,
      setCategoryEnabled: (category, enabled) =>
        set((s) => ({
          enabledByCategory: { ...s.enabledByCategory, [category]: enabled },
        })),
      setGroupEnabled: (group, enabled) =>
        set((s) => {
          const next = { ...s.enabledByCategory };
          for (const c of group.categories) {
            next[c] = enabled;
          }
          return { enabledByCategory: next };
        }),
      answerNsfwPrompt: (showNsfw) =>
        set((s) => ({
          nsfwPromptAnswered: true,
          enabledByCategory: { ...s.enabledByCategory, ...nsfwOverrides(showNsfw) },
        })),
    }),
    {
      name: CATEGORY_FILTER_STORAGE_KEY,
      partialize: (s) => ({
        enabledByCategory: s.enabledByCategory,
        nsfwPromptAnswered: s.nsfwPromptAnswered,
      }),
    },
  ),
);
export const isCategoryVisibleOnHome = (
  enabledByCategory: Record<VoxCategory, boolean>,
  category: string,
): boolean => {
  if (!(category in enabledByCategory)) return true;
  return enabledByCategory[category as VoxCategory] !== false;
};

export type CategoryGroupVisibility = "all" | "some" | "none";

export const categoryGroupVisibility = (
  enabledByCategory: Record<VoxCategory, boolean>,
  group: CategoryGroup,
): CategoryGroupVisibility => {
  const shown = group.categories.filter((c) => enabledByCategory[c] !== false).length;
  if (shown === group.categories.length) return "all";
  return shown === 0 ? "none" : "some";
};
