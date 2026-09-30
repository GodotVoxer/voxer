import { describe, expect, it } from "vitest";
import { shouldSignalNewVoxOnHomeFeed } from "@/features/vox/feed/socketFilters";
import type { VoxCategory } from "@/lib/vox/categories";
import { VOX_CATEGORIES_ALL } from "@/lib/vox/categories";

const allEnabled = (): Record<VoxCategory, boolean> =>
  Object.fromEntries(VOX_CATEGORIES_ALL.map((c) => [c, true])) as Record<VoxCategory, boolean>;

describe("shouldSignalNewVoxOnHomeFeed", () => {
  it("drops vox outside the category of the route", () => {
    expect(
      shouldSignalNewVoxOnHomeFeed(
        { category: "General" },
        { categoryCode: "POR", enabledByCategory: allEnabled() },
      ),
    ).toBe(false);
  });

  it("accepts vox of the category of the route", () => {
    expect(
      shouldSignalNewVoxOnHomeFeed(
        { category: "Porno" },
        { categoryCode: "POR", enabledByCategory: allEnabled() },
      ),
    ).toBe(true);
  });

  it("drops categories hidden in the sidebar", () => {
    const enabled = allEnabled();
    enabled.Porno = false;
    expect(
      shouldSignalNewVoxOnHomeFeed(
        { category: "Porno" },
        { categoryCode: null, enabledByCategory: enabled },
      ),
    ).toBe(false);
  });
});
