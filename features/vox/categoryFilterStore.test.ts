import { beforeEach, describe, expect, it } from "vitest";
import {
  categoryGroupVisibility,
  isCategoryVisibleOnHome,
  useCategoryFilterStore,
} from "./categoryFilterStore";
import { CATEGORY_GROUPS } from "@/lib/vox/categoryCodes";
import { NSFW_CATEGORIES } from "@/lib/vox/sensitiveCategories";

const initial = useCategoryFilterStore.getState();

describe("categoryFilterStore: +18 prompt", () => {
  beforeEach(() => {
    useCategoryFilterStore.setState({
      enabledByCategory: { ...initial.enabledByCategory },
      nsfwPromptAnswered: false,
    });
  });

  it("starts unanswered with +18 categories off", () => {
    const { enabledByCategory, nsfwPromptAnswered } = useCategoryFilterStore.getState();
    expect(nsfwPromptAnswered).toBe(false);
    for (const category of NSFW_CATEGORIES) {
      expect(isCategoryVisibleOnHome(enabledByCategory, category)).toBe(false);
    }
    expect(isCategoryVisibleOnHome(enabledByCategory, "General")).toBe(true);
  });

  it("answering yes turns +18 on and never asks again", () => {
    useCategoryFilterStore.getState().answerNsfwPrompt(true);
    const { enabledByCategory, nsfwPromptAnswered } = useCategoryFilterStore.getState();
    expect(nsfwPromptAnswered).toBe(true);
    for (const category of NSFW_CATEGORIES) {
      expect(isCategoryVisibleOnHome(enabledByCategory, category)).toBe(true);
    }
  });

  it("answering no keeps them off and never asks again", () => {
    useCategoryFilterStore.getState().answerNsfwPrompt(false);
    const { enabledByCategory, nsfwPromptAnswered } = useCategoryFilterStore.getState();
    expect(nsfwPromptAnswered).toBe(true);
    for (const category of NSFW_CATEGORIES) {
      expect(isCategoryVisibleOnHome(enabledByCategory, category)).toBe(false);
    }
  });

  it("leaves the other categories alone", () => {
    const otras = CATEGORY_GROUPS.flatMap((g) => g.categories).filter(
      (c) => !NSFW_CATEGORIES.includes(c),
    );
    useCategoryFilterStore.getState().setCategoryEnabled("Humor", false);
    useCategoryFilterStore.getState().answerNsfwPrompt(true);
    const { enabledByCategory } = useCategoryFilterStore.getState();
    expect(isCategoryVisibleOnHome(enabledByCategory, "Humor")).toBe(false);
    for (const category of otras.filter((c) => c !== "Humor")) {
      expect(isCategoryVisibleOnHome(enabledByCategory, category)).toBe(true);
    }
  });
});

describe("categoryGroupVisibility", () => {
  const group = CATEGORY_GROUPS[0];
  const allOn = {
    ...initial.enabledByCategory,
    ...Object.fromEntries(group.categories.map((c) => [c, true])),
  };

  it("is all when every category of the group is shown", () => {
    expect(categoryGroupVisibility(allOn, group)).toBe("all");
  });

  it("is some when only part of the group is shown", () => {
    expect(categoryGroupVisibility({ ...allOn, [group.categories[0]]: false }, group)).toBe("some");
  });

  it("is none when the whole group is hidden", () => {
    const allOff = { ...allOn, ...Object.fromEntries(group.categories.map((c) => [c, false])) };
    expect(categoryGroupVisibility(allOff, group)).toBe("none");
  });
});
