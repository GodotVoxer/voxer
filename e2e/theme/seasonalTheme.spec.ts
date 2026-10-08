import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { SEASONAL_THEME_ENDS_AT, SEASONAL_THEME_SURFACE } from "../../lib/theme/seasonalTheme";
import { seedDemo } from "../support/demoStorage";

type ThemeProbeWindow = Window & { __seasonalAtBodyStart?: string | null };

const IN_SEASON = new Date("2026-10-31T21:00:00.000Z");

const prepare = async (context: BrowserContext) => {
  await seedDemo(context, { role: "USER", theme: "light", seasonal: true });
  await context.addInitScript(() => {
    // Records the seasonal attribute as soon as <body> exists: after the inline script, before React.
    const observer = new MutationObserver(() => {
      if (!document.body) return;
      (window as ThemeProbeWindow).__seasonalAtBodyStart =
        document.documentElement.getAttribute("data-seasonal-theme");
      observer.disconnect();
    });
    observer.observe(document, { childList: true, subtree: true });
  });
};

const openHome = async (page: Page, now: Date | number) => {
  await page.clock.setFixedTime(now);
  await page.goto("/");
  await expect(page.getByRole("link", { name: /^Vox:/ }).first()).toBeVisible();
};

const openSidebar = async (page: Page) => {
  await page.locator("header button").first().click();
  await expect(page.getByRole("radiogroup", { name: "Tema" })).toBeVisible();
};

const html = (page: Page) => page.locator("html");
const seasonalSwitch = (page: Page) => page.getByRole("switch", { name: /Halloween/ });

test.describe("Halloween seasonal theme", () => {
  test("covers the chosen theme without a flash and gives way to another choice", async ({
    page,
    context,
  }) => {
    await prepare(context);
    await openHome(page, IN_SEASON);
    await expect(html(page)).toHaveAttribute("data-seasonal-theme", "halloween");
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
    expect(await page.evaluate(() => (window as ThemeProbeWindow).__seasonalAtBodyStart)).toBe(
      "halloween",
    );
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      SEASONAL_THEME_SURFACE,
    );

    await openSidebar(page);
    await expect(seasonalSwitch(page)).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);

    await page.getByRole("radio", { name: "Oscuro" }).click();
    await expect(html(page)).not.toHaveAttribute("data-seasonal-theme", /.*/);
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
    await expect(seasonalSwitch(page)).toHaveAttribute("aria-checked", "false");

    await page.reload();
    await expect(page.getByRole("link", { name: /^Vox:/ }).first()).toBeVisible();
    await expect(html(page)).not.toHaveAttribute("data-seasonal-theme", /.*/);
    expect(
      await page.evaluate(() => (window as ThemeProbeWindow).__seasonalAtBodyStart),
    ).toBeNull();

    await openSidebar(page);
    await seasonalSwitch(page).click();
    await expect(html(page)).toHaveAttribute("data-seasonal-theme", "halloween");
  });

  test("the previous theme comes back when the season ends", async ({ page, context }) => {
    await prepare(context);
    await openHome(page, SEASONAL_THEME_ENDS_AT);
    await expect(html(page)).toHaveAttribute("data-theme", "light");
    await expect(html(page)).not.toHaveAttribute("data-seasonal-theme", /.*/);

    await openSidebar(page);
    await expect(seasonalSwitch(page)).toHaveCount(0);
  });
});
