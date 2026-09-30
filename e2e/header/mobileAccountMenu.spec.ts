import { expect, test } from "@playwright/test";
import { seedDemo } from "../support/demoStorage";

test.describe("mobile account menu", () => {
  test.skip(({ isMobile }) => !isMobile, "el menú solo existe en mobile");

  test.beforeEach(async ({ context }) => {
    await seedDemo(context);
  });

  test("does not reappear when the closing animation ends", async ({ page }) => {
    await page.goto("/");

    const trigger = page.getByRole("button", { name: "Menú de cuenta" });
    await expect(trigger).toBeVisible();
    await trigger.click();

    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(menu).toHaveAttribute("data-state", "open");

    const closeFrames = await page.evaluate(async () => {
      const triggerElement = document.querySelector<HTMLButtonElement>(
        'button[aria-label="Menú de cuenta"]',
      );
      if (!triggerElement) throw new Error("No se encontró el botón del menú de cuenta");

      triggerElement.click();

      return await new Promise<{ mounted: boolean; opacity: number | null }[]>((resolve) => {
        const frames: { mounted: boolean; opacity: number | null }[] = [];
        const startedAt = performance.now();

        const sample = () => {
          const menuElement = document.querySelector<HTMLElement>('[role="menu"]');
          frames.push({
            mounted: Boolean(menuElement),
            opacity: menuElement ? Number.parseFloat(getComputedStyle(menuElement).opacity) : null,
          });

          if (menuElement && performance.now() - startedAt < 500) {
            requestAnimationFrame(sample);
          } else {
            resolve(frames);
          }
        };

        requestAnimationFrame(sample);
      });
    });

    const firstNearlyTransparentFrame = closeFrames.findIndex(
      ({ opacity }) => opacity !== null && opacity < 0.1,
    );
    expect(firstNearlyTransparentFrame).toBeGreaterThanOrEqual(0);
    expect(closeFrames.at(-1)?.mounted).toBe(false);

    const framesUntilUnmount = closeFrames
      .slice(firstNearlyTransparentFrame)
      .filter((frame) => Boolean(frame.mounted));
    expect(framesUntilUnmount.every(({ opacity }) => opacity !== null && opacity < 0.1)).toBe(true);
  });
});
