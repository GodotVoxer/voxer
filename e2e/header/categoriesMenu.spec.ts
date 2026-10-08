import { expect, test } from "@playwright/test";
import { seedDemo } from "../support/demoStorage";

test.describe("header categories", () => {
  test.beforeEach(async ({ context }) => {
    await seedDemo(context);
  });

  test("a checkbox hides the category without closing the panel", async ({ page, isMobile }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Categorías" }).click();

    if (isMobile) {
      const drawer = page.getByRole("dialog", { name: "Categorías" });
      await expect(drawer).toBeVisible();
      await drawer.getByRole("button", { name: "Expandir grupo" }).first().click();
      const checkbox = drawer.getByRole("checkbox", { name: "Ver vox de General en el inicio" });
      await expect(checkbox).toBeChecked();
      await checkbox.click();
      await expect(checkbox).not.toBeChecked();
      await expect(drawer).toBeVisible();
      return;
    }

    const menu = page.getByRole("menu");
    const checkbox = menu.getByRole("menuitemcheckbox", {
      name: "Ver vox de General en el inicio",
    });
    await expect(checkbox).toHaveAttribute("aria-checked", "true");
    await checkbox.click();
    await expect(checkbox).toHaveAttribute("aria-checked", "false");
    await expect(menu).toBeVisible();
    await expect(
      menu.getByRole("menuitemcheckbox", {
        name: "Mostrar u ocultar todas las categorías de General y comunidad en el inicio",
      }),
    ).toHaveAttribute("aria-checked", "mixed");
  });

  test("a category name navigates to it", async ({ page, isMobile }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Categorías" }).click();
    if (isMobile) {
      const drawer = page.getByRole("dialog", { name: "Categorías" });
      await drawer.getByRole("button", { name: "Expandir grupo" }).first().click();
      await drawer.getByRole("link", { name: "General" }).click();
    } else {
      await page
        .getByRole("menu")
        .getByRole("menuitem", { name: /^General/ })
        .click();
    }
    await page.waitForURL(/\/GEN$/);
  });
});
