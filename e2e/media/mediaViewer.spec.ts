import { expect, test, type BrowserContext } from "@playwright/test";
import { seedDemo } from "../support/demoStorage";

/** The viewer is opt-in: by default images keep opening in a new tab. */
const VIEWER_ENABLED = { openImagesInNewTab: false };

const prepare = (context: BrowserContext, settings?: Record<string, unknown>) =>
  seedDemo(context, { role: "USER", theme: "dark", settings });

test.describe("fullscreen image viewer", () => {
  test("with the preference off the vox image opens in the viewer and the backdrop closes it", async ({
    page,
    context,
  }) => {
    await prepare(context, VIEWER_ENABLED);
    await page.goto("/vox/1");

    const link = page.getByTitle("Ver imagen").first();
    await expect(link).toBeVisible();
    await link.click();

    const viewer = page.locator('[data-slot="media-viewer"]');
    await expect(viewer).toBeVisible();
    await expect(viewer.locator("img")).toBeVisible();

    // The backdrop is the stage itself: click a corner, away from the image.
    await viewer.click({ position: { x: 8, y: 400 } });
    await expect(viewer).toBeHidden();
  });

  test("the close button closes the viewer too", async ({ page, context }) => {
    await prepare(context, VIEWER_ENABLED);
    await page.goto("/vox/1");
    await page.getByTitle("Ver imagen").first().click();

    const viewer = page.locator('[data-slot="media-viewer"]');
    await expect(viewer).toBeVisible();
    await viewer.getByRole("button", { name: "Cerrar" }).click();
    await expect(viewer).toBeHidden();
  });

  test("by default images still open in a new tab", async ({ page, context }) => {
    await prepare(context);
    await page.goto("/vox/1");

    const link = page.getByTitle("Ver imagen").first();
    await expect(link).toHaveAttribute("target", "_blank");
    const popup = page.waitForEvent("popup");
    await link.click();
    await (await popup).close();
    await expect(page.locator('[data-slot="media-viewer"]')).toHaveCount(0);
  });
});
