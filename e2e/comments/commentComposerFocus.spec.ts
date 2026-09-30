import { expect, test } from "@playwright/test";
import { seedDemo } from "../support/demoStorage";

test.beforeEach(async ({ context }) => {
  await seedDemo(context, { role: "USER" });
});

test("the focused composer stays below the header on mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "El ajuste sólo aplica al scroll mobile");

  await page.goto("/vox/1");
  const textarea = page.getByPlaceholder(/Escribí un comentario/);
  await expect(textarea).toBeVisible();

  const scrollBeforeTap = await textarea.evaluate((element) => {
    const bottom = element.getBoundingClientRect().bottom;
    window.scrollBy({ top: bottom - (window.innerHeight - 20), behavior: "instant" });
    return window.scrollY;
  });
  const box = await textarea.boundingBox();
  if (!box) throw new Error("No se pudo medir el composer");
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await expect(textarea).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBeforeTap);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("No se pudo medir el viewport mobile");
  await page.setViewportSize({ width: viewport.width, height: 500 });

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const rect = document
          .querySelector<HTMLElement>("[data-comment-composer-input]")
          ?.getBoundingClientRect();
        const viewportTop = window.visualViewport?.offsetTop ?? 0;
        const viewportBottom = viewportTop + (window.visualViewport?.height ?? window.innerHeight);
        const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
        return rect ? Math.min(rect.top - headerBottom, viewportBottom - rect.bottom) : -1;
      }),
    )
    .toBeGreaterThanOrEqual(9);

  await page.waitForTimeout(1300);
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => window.scrollBy({ top: 160, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore + 100);
  await expect(textarea).toBeFocused();
});

test("does not focus or correct the scroll when the gesture on the composer is a swipe", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "El ajuste sólo aplica al scroll mobile");

  await page.goto("/vox/1");
  const textarea = page.getByPlaceholder(/Escribí un comentario/);
  await expect(textarea).toBeVisible();

  await textarea.evaluate((element) => {
    const touchAt = (y: number) =>
      new Touch({ identifier: 1, target: element, clientX: 20, clientY: y });
    element.dispatchEvent(
      new TouchEvent("touchstart", { bubbles: true, cancelable: true, touches: [touchAt(180)] }),
    );
    element.dispatchEvent(
      new TouchEvent("touchmove", { bubbles: true, cancelable: true, touches: [touchAt(120)] }),
    );
    window.scrollBy({ top: 80, behavior: "instant" });
    element.dispatchEvent(
      new TouchEvent("touchend", { bubbles: true, cancelable: true, touches: [] }),
    );
  });

  await expect(textarea).not.toBeFocused();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(40);
});

test("does not correct the scroll when the composer is already above the keyboard", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "El ajuste sólo aplica al scroll mobile");

  await page.goto("/vox/1");
  const textarea = page.getByPlaceholder(/Escribí un comentario/);
  await expect(textarea).toBeVisible();

  const scrollBeforeTap = await textarea.evaluate((element) => {
    const top = element.getBoundingClientRect().top;
    window.scrollBy({ top: top - 100, behavior: "instant" });
    return window.scrollY;
  });
  const box = await textarea.boundingBox();
  if (!box) throw new Error("No se pudo medir el composer");
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await expect(textarea).toBeFocused();

  const viewport = page.viewportSize();
  if (!viewport) throw new Error("No se pudo medir el viewport mobile");
  await page.setViewportSize({ width: viewport.width, height: 500 });
  await page.waitForTimeout(1100);

  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBeforeTap);
});
