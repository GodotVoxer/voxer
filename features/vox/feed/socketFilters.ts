import type { VoxCategory } from "@/lib/vox/categories";
import { getCategoryFromCode } from "@/lib/vox/categoryCodes";
import { isCategoryVisibleOnHome } from "@/features/vox/categoryFilterStore";
import type { VoxListItem } from "@/lib/vox/types";

export const shouldSignalNewVoxOnHomeFeed = (
  item: Pick<VoxListItem, "category">,
  opts: {
    categoryCode: string | null;
    enabledByCategory: Record<VoxCategory, boolean>;
  },
): boolean => {
  const routeCategory = opts.categoryCode
    ? getCategoryFromCode(opts.categoryCode.trim().toUpperCase())
    : null;
  if (routeCategory && item.category !== routeCategory) return false;
  return isCategoryVisibleOnHome(opts.enabledByCategory, item.category);
};
