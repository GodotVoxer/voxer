import type { VoxCategory } from "@/lib/vox/categories";
import { CATEGORY_GROUPS, getCategoryFromCode } from "@/lib/vox/categoryCodes";

const nsfwGroup = CATEGORY_GROUPS.find((g) => g.id === "nsfw");
if (!nsfwGroup) throw new Error("The nsfw category group is missing");

/** +18 categories: the home prompt and previews outside the app follow this list. */
export const NSFW_CATEGORIES: readonly VoxCategory[] = nsfwGroup.categories;

/**
 * Categories that never show a thumbnail outside the app: notifications are read on the lock
 * screen and Open Graph previews render fully in someone else's chat.
 */
const SENSITIVE_CATEGORIES: ReadonlySet<string> = new Set(NSFW_CATEGORIES);

/** Accepts the stored name or the short URL code. */
export const isSensitiveVoxCategory = (category: string): boolean => {
  const raw = category.trim();
  if (raw === "") return false;
  return SENSITIVE_CATEGORIES.has(getCategoryFromCode(raw) ?? raw);
};
