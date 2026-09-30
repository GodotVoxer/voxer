import { expect, test, type Page } from "@playwright/test";
import { seedDemo } from "../support/demoStorage";

test.beforeEach(async ({ context }) => {
  await seedDemo(context, { role: "USER" });
});

const composerIsFixed = (page: Page) =>
  page
    .locator("[data-comment-composer-input]")
    .evaluate((textarea) => getComputedStyle(textarea.parentElement!).position === "fixed");

const scrollComments = (page: Page, top: number) =>
  page
    .locator("[data-vox-comment-composer-anchor]")
    .evaluate((anchor, value) => anchor.parentElement!.scrollTo({ top: value }), top);

test("quoting from far down the thread floats the composer beside it until its place is back", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Sólo el layout de dos columnas tiene lugar al costado",
  );

  await page.goto("/vox/1");
  const textarea = page.getByPlaceholder(/Escribí un comentario/);
  await expect(textarea).toBeVisible();

  await scrollComments(page, 1200);
  await page.getByTitle("Responder citando este ID").nth(3).click();

  await expect.poll(() => composerIsFixed(page)).toBe(true);
  await expect(textarea).toBeFocused();
  await expect(textarea).toHaveValue(/^>>[A-Z0-9]{8}\n$/);
  const draft = await textarea.inputValue();
  await expect(textarea).toBeInViewport();
  await expect
    .poll(() =>
      textarea.evaluate((element) => {
        const rect = element.parentElement!.getBoundingClientRect();
        const headerBottom = document.querySelector("header")!.getBoundingClientRect().bottom;
        const available = (headerBottom + window.innerHeight) / 2;
        return Math.abs((rect.top + rect.bottom) / 2 - available);
      }),
    )
    .toBeLessThan(2);

  await scrollComments(page, 0);
  await expect.poll(() => composerIsFixed(page)).toBe(false);

  await scrollComments(page, 1200);
  await expect.poll(() => composerIsFixed(page)).toBe(true);

  await page.getByLabel("Cerrar el cuadro flotante").click();
  await expect.poll(() => composerIsFixed(page)).toBe(false);
  await expect(textarea).toHaveValue(draft);
});
