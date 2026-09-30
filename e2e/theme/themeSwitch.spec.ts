import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { THEME_COLOR_META } from "../../lib/theme/themePreference";
import { seedDemo } from "../support/demoStorage";

type ThemeProbeWindow = Window & { __themeAtBodyStart?: string | null };

const prepare = async (context: BrowserContext) => {
  await seedDemo(context, { role: "USER" });
  await context.addInitScript(() => {
    // Records the theme as soon as the parser creates <body>: after the inline script, before React.
    const observer = new MutationObserver(() => {
      if (!document.body) return;
      (window as ThemeProbeWindow).__themeAtBodyStart =
        document.documentElement.getAttribute("data-theme");
      observer.disconnect();
    });
    observer.observe(document, { childList: true, subtree: true });
  });
};

const openSidebar = async (page: Page) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /^Vox:/ }).first()).toBeVisible();
  await page.locator("header button").first().click();
  await expect(page.getByRole("radiogroup", { name: "Tema" })).toBeVisible();
};

const html = (page: Page) => page.locator("html");

test.describe("theme selector in the sidebar", () => {
  test("Light applies at once and persists across a reload without a flash", async ({
    page,
    context,
  }) => {
    await prepare(context);
    await openSidebar(page);
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("radio", { name: "Oscuro" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await page.getByRole("radio", { name: "Claro" }).click();
    await expect(html(page)).toHaveAttribute("data-theme", "light");
    await expect(html(page)).not.toHaveClass(/(^|\s)dark(\s|$)/);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      THEME_COLOR_META.light,
    );

    await page.reload();
    await expect(html(page)).toHaveAttribute("data-theme", "light");
    const themeAtBodyStart = await page.evaluate(
      () => (window as ThemeProbeWindow).__themeAtBodyStart,
    );
    expect(themeAtBodyStart).toBe("light");
  });

  test("System follows the OS preference live", async ({ page, context }) => {
    await prepare(context);
    await page.emulateMedia({ colorScheme: "light" });
    await openSidebar(page);
    await page.getByRole("radio", { name: "Sistema" }).click();
    await expect(html(page)).toHaveAttribute("data-theme", "light");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
  });

  test("can be chosen with the arrow keys", async ({ page, context }) => {
    await prepare(context);
    await openSidebar(page);
    await page.getByRole("radio", { name: "Oscuro" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "Claro" })).toBeFocused();
    await expect(html(page)).toHaveAttribute("data-theme", "light");
    await page.keyboard.press("ArrowLeft");
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
  });
});

test.describe("theme stored on the account", () => {
  const seedAccountTheme = async (context: BrowserContext, mode: string) => {
    await context.addInitScript((m) => {
      window.localStorage.setItem(
        "voxer:msw-demo-account-theme",
        JSON.stringify({ mode: m, updatedAt: "2026-09-14T12:00:00.000Z" }),
      );
    }, mode);
  };

  test("with a session, choosing a theme stores it on the account", async ({ page, context }) => {
    await prepare(context);
    await openSidebar(page);
    const saved = page.waitForRequest(
      (r) =>
        r.url().endsWith("/api/theme/preference") &&
        r.method() === "PUT" &&
        (r.postData() ?? "").includes('"light"'),
    );
    await page.getByRole("radio", { name: "Claro" }).click();
    expect((await saved).postDataJSON()).toEqual({ mode: "light" });
  });

  test("the account theme wins over the device's on load", async ({ page, context }) => {
    await prepare(context);
    await seedAccountTheme(context, "light");
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Notificaciones" })).toBeVisible();
    await expect(html(page)).toHaveAttribute("data-theme", "light");
  });

  test("on logout the device's signed-out theme returns", async ({ page, context }, info) => {
    test.skip(info.project.name === "mobile", "«Salir» vive en el menú de cuenta en móvil");
    await prepare(context);
    await seedAccountTheme(context, "light");
    await context.addInitScript(() => {
      window.localStorage.setItem("voxer.theme.device.v1", JSON.stringify({ mode: "dark" }));
    });
    await page.goto("/");
    await expect(html(page)).toHaveAttribute("data-theme", "light");
    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
  });
});
