import { expect, test } from "@playwright/test";
import { seedDemo } from "@/e2e/support/demoStorage";

test("a single-word title wraps and keeps the layout stable across a dialog", async ({ page }) => {
  await seedDemo(page, { role: "ADMIN" });
  await page.goto("/vox/1");
  const title = page.locator("main h1");
  await expect(title).toBeVisible();
  await title.evaluate((element) => {
    element.textContent = "m".repeat(120);
  });
  await page.getByRole("button", { name: "Moderación", exact: true }).click();

  const assertLayout = async () => {
    const metrics = await title.evaluate((element) => ({
      width: element.clientWidth,
      scrollWidth: element.scrollWidth,
      height: element.clientHeight,
      lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
      pageWidth: document.documentElement.clientWidth,
      pageScrollWidth: document.documentElement.scrollWidth,
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
    expect(metrics.height).toBeGreaterThan(metrics.lineHeight);
    expect(metrics.pageScrollWidth).toBeLessThanOrEqual(metrics.pageWidth);
    return metrics.width;
  };

  const width = await assertLayout();
  await page.getByRole("button", { name: "Recategorizar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Recategorizar vox" });
  await expect(dialog).toBeVisible();
  expect(await assertLayout()).toBe(width);
  await expect(async () => {
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  }).toPass();
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialog).toBeHidden();
  expect(await assertLayout()).toBe(width);
});
