import { expect, test } from "@playwright/test";
import { seedDemo } from "../support/demoStorage";

test.beforeEach(async ({ context }) => {
  await seedDemo(context, { role: "USER" });
});

test("the first comment of an empty vox keeps the scroll position", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "En escritorio el hilo tiene su propio scroll");

  await page.goto("/vox/14");
  await expect(page.getByText("Todavía no hay comentarios.")).toBeVisible();

  // An empty vox fits in the default viewport: shrink it so the page can scroll at all.
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("No se pudo medir el viewport mobile");
  await page.setViewportSize({ width: viewport.width, height: 480 });

  await page.getByPlaceholder(/Escribí un comentario/).fill("Primer comentario del vox");
  await page.evaluate(() =>
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }),
  );
  // Scrolled into view before measuring: the click must not be what moves the page.
  const submit = page.getByRole("button", { name: "Comentar", exact: true });
  await submit.scrollIntoViewIfNeeded();
  const scrollBefore = await page.evaluate(() => window.scrollY);
  expect(scrollBefore).toBeGreaterThan(100);

  await submit.click();
  await expect(page.getByText("Primer comentario del vox")).toBeVisible();

  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
});
