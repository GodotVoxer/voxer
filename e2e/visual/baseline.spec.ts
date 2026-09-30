import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { seedDemo, type DemoRole } from "../support/demoStorage";

type ThemeId = "dark" | "light";

/** Dark keeps the original baseline names; light adds a prefix. */
const THEME_CASES: { id: ThemeId; prefix: string }[] = [
  { id: "dark", prefix: "" },
  { id: "light", prefix: "light-" },
];

const FIXED_NOW = new Date("2026-01-15T15:00:00.000Z");

const GRAY_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mNgYGAAAAAEAAHI6uv5AAAAAElFTkSuQmCC",
  "base64",
);

const isLocalUrl = (url: string): boolean =>
  /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(url);

const prepareContext = async (
  context: BrowserContext,
  role: DemoRole,
  theme: ThemeId,
  askNsfw = false,
) => {
  await seedDemo(context, { role, theme, nsfwPromptAnswered: !askNsfw });
  // Remote mock thumbnails become a fixed pixel; external iframes and videos are aborted (no network).
  await context.route(
    (url) => !isLocalUrl(url.href) && url.protocol.startsWith("http"),
    (route) =>
      route.request().resourceType() === "image"
        ? route.fulfill({ status: 200, contentType: "image/png", body: GRAY_PIXEL_PNG })
        : route.abort(),
  );
};

const settle = async (page: Page) => {
  await page.waitForLoadState("networkidle");
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    // Offscreen `loading="lazy"` images never fire load/error: wait only for visible ones (with a cap).
    const inViewport = (img: HTMLImageElement) => {
      const r = img.getBoundingClientRect();
      return r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
    };
    const pending = Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete && (img.loading !== "lazy" || inViewport(img)))
        .map(
          (img) =>
            new Promise((resolve) => {
              img.addEventListener("load", resolve, { once: true });
              img.addEventListener("error", resolve, { once: true });
            }),
        ),
    );
    await Promise.race([pending, new Promise((resolve) => setTimeout(resolve, 5000))]);
  });
  await page.waitForTimeout(400);
};

const open = async (
  page: Page,
  context: BrowserContext,
  path: string,
  role: DemoRole,
  theme: ThemeId,
  askNsfw = false,
) => {
  await prepareContext(context, role, theme, askNsfw);
  await page.clock.setFixedTime(FIXED_NOW);
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  const authMarker =
    role === "ANON"
      ? page.getByRole("button", { name: "Entrar", exact: true })
      : page.getByRole("button", { name: "Notificaciones" });
  await expect(authMarker).toBeVisible();
};

const waitForGrid = async (page: Page) => {
  await expect(page.getByRole("link", { name: /^Vox:/ }).first()).toBeVisible();
  await settle(page);
};

const waitForDetail = async (page: Page) => {
  await expect(page.getByPlaceholder(/./).first()).toBeVisible();
  await settle(page);
};

for (const { id: theme, prefix } of THEME_CASES) {
  test.describe(`visual (${theme} theme)`, () => {
    test("home as a user", async ({ page, context }) => {
      await open(page, context, "/", "USER", theme);
      await waitForGrid(page);
      await expect(page).toHaveScreenshot(`${prefix}home-user.png`);
    });

    test("home without a session", async ({ page, context }) => {
      await open(page, context, "/", "ANON", theme);
      await waitForGrid(page);
      await expect(page).toHaveScreenshot(`${prefix}home-anon.png`);
    });

    test("home as staff hovering a card", async ({ page, context }, info) => {
      test.skip(info.project.name === "mobile", "hover no aplica en táctil");
      await open(page, context, "/", "ADMIN", theme);
      await waitForGrid(page);
      await page.getByRole("link", { name: /^Vox:/ }).nth(2).hover();
      await page.waitForTimeout(400);
      await expect(page).toHaveScreenshot(`${prefix}home-admin-hover.png`);
    });

    // No session marker from `open`: the modal leaves the rest of the document `aria-hidden`.
    test("+18 prompt on the home page", async ({ page, context }) => {
      await prepareContext(context, "ANON", theme, true);
      await page.clock.setFixedTime(FIXED_NOW);
      await page.goto("/");
      await expect(page.getByRole("dialog")).toBeVisible();
      await settle(page);
      await expect(page).toHaveScreenshot(`${prefix}nsfw-prompt.png`);
    });

    test("home filtered by category", async ({ page, context }) => {
      await open(page, context, "/HUM", "USER", theme);
      await waitForGrid(page);
      await expect(page).toHaveScreenshot(`${prefix}category-hum.png`);
    });

    test("open sidebar", async ({ page, context }) => {
      await open(page, context, "/", "ADMIN", theme);
      await waitForGrid(page);
      await page.locator("header button").first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await settle(page);
      await expect(page).toHaveScreenshot(`${prefix}sidebar.png`);
    });

    test("search dialog", async ({ page, context }) => {
      await open(page, context, "/", "USER", theme);
      await waitForGrid(page);
      await page.getByRole("button", { name: "Buscar vox por título" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await settle(page);
      await expect(page).toHaveScreenshot(`${prefix}search-dialog.png`);
    });

    test("create vox dialog", async ({ page, context }) => {
      await open(page, context, "/", "USER", theme);
      await waitForGrid(page);
      await page.getByRole("button", { name: "Crear vox" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await settle(page);
      await expect(page).toHaveScreenshot(`${prefix}create-vox-dialog.png`);
    });

    test("create vox dialog scrolled to the end", async ({ page, context }, info) => {
      test.skip(info.project.name !== "mobile", "el estado desplazado cubre la vista móvil");
      await open(page, context, "/", "USER", theme);
      await waitForGrid(page);
      await page.getByRole("button", { name: "Crear vox" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await dialog.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await settle(page);
      await expect(page).toHaveScreenshot(`${prefix}create-vox-dialog-bottom.png`);
    });

    test("login dialog", async ({ page, context }) => {
      await open(page, context, "/", "ANON", theme);
      await waitForGrid(page);
      await page.getByRole("button", { name: "Entrar", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await settle(page);
      await expect(page).toHaveScreenshot(`${prefix}auth-dialog.png`);
    });

    test("notifications panel", async ({ page, context }) => {
      await open(page, context, "/", "ADMIN", theme);
      await waitForGrid(page);
      await page.getByRole("button", { name: "Notificaciones" }).click();
      await settle(page);
      await expect(page).toHaveScreenshot(`${prefix}notifications.png`);
    });

    test("vox detail as a user", async ({ page, context }) => {
      await open(page, context, "/vox/4", "USER", theme);
      await waitForDetail(page);
      await expect(page).toHaveScreenshot(`${prefix}detail-user.png`, { fullPage: true });
    });

    test("vox detail as staff", async ({ page, context }) => {
      await open(page, context, "/vox/4", "ADMIN", theme);
      await waitForDetail(page);
      await expect(page).toHaveScreenshot(`${prefix}detail-admin.png`, { fullPage: true });
    });

    test("vox detail without a session", async ({ page, context }) => {
      await open(page, context, "/vox/1", "ANON", theme);
      await settle(page);
      await expect(page).toHaveScreenshot(`${prefix}detail-anon.png`, { fullPage: true });
    });

    test("report dialog in the detail", async ({ page, context }) => {
      await open(page, context, "/vox/4", "USER", theme);
      await waitForDetail(page);
      await page.getByRole("button", { name: "Denunciar" }).first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await settle(page);
      await expect(page).toHaveScreenshot(`${prefix}report-dialog.png`);
    });
  });
}
