import { expect, test } from "@playwright/test";
import { seedDemo } from "../support/demoStorage";

test.describe("report detail tooltip in the staff panel", () => {
  test("does not open by itself when reopening the cached panel or on focus", async ({ page }) => {
    await seedDemo(page, { role: "ADMIN", theme: "dark" });

    await page.goto("/");
    await page.waitForTimeout(500);

    const flagBtn = page.getByRole("button", { name: "Denuncias" });
    await expect(flagBtn).toBeVisible();

    await flagBtn.click();
    await page.waitForTimeout(400);

    const tooltipContent = page.locator('[data-slot="hover-card-content"]');
    await expect(tooltipContent).not.toBeVisible();

    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    // Reopen: the items are cached now
    await flagBtn.click();
    await page.waitForTimeout(400);

    // The first row's tooltip must not open by itself
    await expect(tooltipContent).not.toBeVisible();

    // Focusing the info button must not open the tooltip either
    const infoBtn = page.getByRole("button", { name: "Ver aclaración de la denuncia" }).first();
    await expect(infoBtn).toBeVisible();
    await infoBtn.focus();
    await page.waitForTimeout(300);
    await expect(tooltipContent).not.toBeVisible();

    // A real hover does open it
    await infoBtn.hover();
    await expect(tooltipContent).toBeVisible();
    await expect(tooltipContent).toContainText("Aclaración del denunciante");
  });
});
