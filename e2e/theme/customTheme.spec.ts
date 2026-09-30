import { readFile } from "node:fs/promises";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import sharp from "sharp";
import { contrastRatio } from "../../lib/theme/colorContrast";
import type {
  CustomThemeDto,
  CustomThemeOverrides,
  HeaderBackground,
  VoxBackground,
} from "../../lib/theme/customTheme";
import { seedDemo } from "../support/demoStorage";

type ProbeWindow = Window & { __brandAtBodyStart?: string };

const html = (page: Page) => page.locator("html");

const cssVar = (page: Page, name: string) =>
  page.evaluate((n) => document.documentElement.style.getPropertyValue(n), name);

const prepare = async (context: BrowserContext) => {
  await seedDemo(context, { role: "USER" });
  await context.addInitScript(() => {
    // Value of --brand-600 as soon as the parser creates <body>: after the inline script, before React.
    const observer = new MutationObserver(() => {
      if (!document.body) return;
      (window as ProbeWindow).__brandAtBodyStart =
        document.documentElement.style.getPropertyValue("--brand-600");
      observer.disconnect();
    });
    observer.observe(document, { childList: true, subtree: true });
  });
};

const seedAccountCustomTheme = async (context: BrowserContext, theme: CustomThemeDto) => {
  await context.addInitScript((t) => {
    window.localStorage.setItem(
      "voxer:msw-demo-account-theme",
      JSON.stringify({ mode: "custom", updatedAt: "2026-09-14T12:00:00.000Z", customTheme: t }),
    );
  }, theme);
};

const customTheme = (
  overrides: CustomThemeOverrides,
  extra: Partial<CustomThemeDto> = {},
): CustomThemeDto => ({
  id: "mswseeded1",
  name: "Sembrado",
  base: "dark",
  overrides,
  headerBackground: { kind: "none" },
  voxBackground: { kind: "none" },
  version: 1,
  updatedAt: "2026-09-14T12:00:00.000Z",
  ...extra,
});

const openSidebar = async (page: Page) => {
  await expect(page.getByRole("link", { name: /^Vox:/ }).first()).toBeVisible();
  await page.locator("header button").first().click();
  await expect(page.getByRole("radiogroup", { name: "Tema" })).toBeVisible();
};

test.describe("custom themes", () => {
  test("create: live preview, readable editor, saves and persists without a flash", async ({
    page,
    context,
  }) => {
    await prepare(context);
    await page.goto("/");
    await openSidebar(page);
    await page.getByRole("button", { name: "Crear tema" }).click();
    const editor = page.getByRole("dialog", { name: "Crear tema" });
    await expect(editor).toBeVisible();

    await editor.getByLabel("Nombre").fill("Violeta");
    const brandHex = editor.locator("#theme-token-brand-hex");
    await brandHex.fill("#7c3aed");
    await brandHex.press("Enter");

    await expect.poll(() => cssVar(page, "--brand-600")).toBe("#7c3aed");
    const editorBrand = await editor.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--brand-600").trim(),
    );
    expect(editorBrand).not.toBe("#7c3aed");

    const created = page.waitForResponse(
      (r) => r.url().endsWith("/api/theme/themes") && r.request().method() === "POST",
    );
    const activated = page.waitForRequest(
      (r) =>
        r.url().endsWith("/api/theme/preference") &&
        r.method() === "PUT" &&
        (r.postData() ?? "").includes('"custom"'),
    );
    await editor.getByRole("button", { name: "Guardar y usar" }).click();
    const saved = (await (await created).json()) as { theme: CustomThemeDto };
    await activated;
    await expect(editor).toBeHidden();
    expect(saved.theme.overrides.brand).toBe("#7c3aed");
    await expect.poll(() => cssVar(page, "--brand-600")).toBe("#7c3aed");

    // MSW lives in the page's memory: seed the saved theme to simulate the server after a reload.
    await seedAccountCustomTheme(context, saved.theme);
    await page.reload();
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
    const atBodyStart = await page.evaluate(() => (window as ProbeWindow).__brandAtBodyStart);
    expect(atBodyStart).toBe("#7c3aed");
    await expect(page.getByRole("button", { name: "Notificaciones" })).toBeVisible();
    await expect.poll(() => cssVar(page, "--brand-600")).toBe("#7c3aed");
  });

  test("the theme's gradient background applies to the vox detail", async ({ page, context }) => {
    const gradient: VoxBackground = {
      kind: "gradient",
      type: "linear",
      angleDeg: 135,
      stops: [
        { color: "#0b0614", pos: 0 },
        { color: "#2e1065", pos: 100 },
      ],
    };
    await prepare(context);
    await seedAccountCustomTheme(
      context,
      customTheme({ brand: "#7c3aed" }, { voxBackground: gradient }),
    );
    await page.goto("/vox/4");
    await expect.poll(() => detailBackgroundImage(page)).toContain("linear-gradient");
    // Fixed to the viewport: with many comments the background does not stretch with the page.
    const box = await page.getByTestId("vox-detail-backdrop").evaluate((el) => ({
      position: getComputedStyle(el).position,
      height: el.getBoundingClientRect().height,
      viewport: window.innerHeight,
    }));
    expect(box.position).toBe("fixed");
    expect(box.height).toBeLessThanOrEqual(box.viewport);
  });

  test("the structured header background applies and keeps its controls readable", async ({
    page,
    context,
  }) => {
    const headerBackground: HeaderBackground = {
      kind: "gradient",
      type: "linear",
      angleDeg: 180,
      stops: [
        { color: "#5bcefa", pos: 0 },
        { color: "#5bcefa", pos: 20 },
        { color: "#f5a9b8", pos: 20 },
        { color: "#f5a9b8", pos: 40 },
        { color: "#ffffff", pos: 40 },
        { color: "#ffffff", pos: 60 },
        { color: "#f5a9b8", pos: 60 },
        { color: "#f5a9b8", pos: 80 },
        { color: "#5bcefa", pos: 80 },
        { color: "#5bcefa", pos: 100 },
      ],
    };
    await prepare(context);
    await seedAccountCustomTheme(
      context,
      customTheme(
        {
          "header-scrim": "#07152514",
          "header-fg": "#ffffff",
          "header-text-bg": "#10233af2",
          "header-control": "#10233af2",
          "header-control-border": "#8eddf7",
          "sidebar-bg": "#173557",
          "sidebar-fg": "#f8fbff",
          "sidebar-muted": "#c1e5f2",
          "sidebar-accent": "#f5a9b8",
          "sidebar-accent-fg": "#10233a",
        },
        { headerBackground },
      ),
    );
    await page.goto("/");
    await expect(html(page)).toHaveAttribute("data-theme-header-background", "true");
    await expect(page.locator("header")).toHaveCSS("background-image", /linear-gradient/);
    await expect(page.getByRole("link", { name: "VOXER" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Notificaciones" })).toBeVisible();

    const headerControlContrast = await page
      .getByRole("button", { name: "Notificaciones" })
      .evaluate((el) => {
        const style = getComputedStyle(el);
        return { fg: style.color, bg: style.backgroundColor };
      });
    expect(
      contrastRatio(headerControlContrast.fg, headerControlContrast.bg),
    ).toBeGreaterThanOrEqual(4.5);

    await openSidebar(page);
    const sidebar = page.locator(".app-sidebar");
    await expect(sidebar).toHaveCSS("background-color", "rgb(23, 53, 87)");
    await expect(sidebar.getByRole("button", { name: /Sembrado Oscuro/ })).toHaveCSS(
      "background-color",
      "rgb(245, 169, 184)",
    );
  });

  test("unreadable theme: the editor stays readable, warns, and ?tema=seguro disables it", async ({
    page,
    context,
  }) => {
    await prepare(context);
    const unreadable = customTheme(
      {
        fg: "#101010",
        surface: "#101010",
        "surface-raised": "#101010",
        "surface-sunken": "#101010",
      },
      { name: "Ilegible" },
    );
    await seedAccountCustomTheme(context, unreadable);
    await page.goto("/");
    await expect.poll(() => cssVar(page, "--fg")).toBe("#101010");

    await openSidebar(page);
    await page.getByRole("button", { name: "Editar tema Ilegible" }).click();
    const editor = page.getByRole("dialog", { name: "Editar tema" });
    await expect(editor).toBeVisible();
    const colors = await editor
      .getByRole("heading", { name: "Editar tema" })
      .evaluate((heading) => {
        // Chrome returns computed colors in lab()/oklch(): convert to rgb through a 1px canvas.
        const toRgb = (color: string) => {
          const ctx = document.createElement("canvas").getContext("2d")!;
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 1, 1);
          const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
          return `rgb(${r} ${g} ${b})`;
        };
        const panel = heading.closest('[role="dialog"]') as HTMLElement;
        return {
          fg: toRgb(getComputedStyle(heading).color),
          bg: toRgb(getComputedStyle(panel).backgroundColor),
        };
      });
    expect(contrastRatio(colors.fg, colors.bg)).toBeGreaterThanOrEqual(4.5);
    await expect(editor.getByText(/textos? pueden? costar leerse/)).toBeVisible();

    await page.goto("/?tema=seguro");
    await expect(
      page.getByText("Modo seguro: tu tema personalizado está desactivado"),
    ).toBeVisible();
    await expect.poll(() => cssVar(page, "--fg")).toBe("");
  });

  const chaos: [string, CustomThemeOverrides][] = [
    [
      "todo del mismo color",
      Object.fromEntries(
        ["surface", "surface-raised", "surface-sunken", "fg", "fg-muted", "brand", "danger"].map(
          (k) => [k, "#808080"],
        ),
      ) as CustomThemeOverrides,
    ],
    [
      "negro sobre negro",
      { surface: "#000000", "surface-raised": "#000000", fg: "#000000", brand: "#000000" },
    ],
    [
      "todo transparente",
      { surface: "#00000000", "surface-raised": "#00000000", fg: "#00000000", brand: "#ffffff00" },
    ],
  ];

  for (const [label, overrides] of chaos) {
    test(`an extreme theme (${label}) does not break the app`, async ({ page, context }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await prepare(context);
      await seedAccountCustomTheme(context, customTheme(overrides));
      await page.goto("/");
      await expect(page.getByRole("link", { name: /^Vox:/ }).first()).toBeAttached();
      await expect(page.getByRole("button", { name: "Notificaciones" })).toBeAttached();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.style.length))
        .toBeGreaterThan(0);
      expect(errors.filter((e) => !e.includes("already enabled network"))).toEqual([]);
    });
  }

  const sampleWebp = () =>
    sharp({ create: { width: 64, height: 36, channels: 3, background: { r: 120, g: 20, b: 200 } } })
      .webp()
      .toBuffer();

  /** Creates a theme with an image uploaded from the editor and navigates to a vox (no reload: MSW keeps its memory). */
  const createThemeWithUploadedImage = async (page: Page) => {
    await page.goto("/");
    await openSidebar(page);
    await page.getByRole("button", { name: "Crear tema" }).click();
    const editor = page.getByRole("dialog", { name: "Crear tema" });
    await editor.getByRole("radio", { name: "Imagen" }).click();
    await editor.locator('input[type="file"]:not([accept*="json"])').setInputFiles({
      name: "fondo.webp",
      mimeType: "image/webp",
      buffer: await sampleWebp(),
    });
    await expect(editor.getByText(/1 de 5 imágenes/)).toBeVisible();
    await expect(editor.getByRole("button", { name: /^Usar imagen de/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await editor.getByRole("button", { name: "Guardar y usar" }).click();
    await expect(editor).toBeHidden();
    await page.getByRole("link", { name: "Vox: Alguien se acuerda de este juego?" }).click();
    await expect(page).toHaveURL(/\/vox\/4$/);
    await expect(page.getByPlaceholder(/./).first()).toBeVisible();
  };

  /** Without an applied custom background there is no background layer: same as `none`. */
  const detailBackgroundImage = async (page: Page): Promise<string> => {
    const backdrop = page.getByTestId("vox-detail-backdrop");
    if ((await backdrop.count()) === 0) return "none";
    return backdrop.evaluate((el) => getComputedStyle(el).backgroundImage);
  };

  test("background image: if it fails to load, the detail keeps the theme color", async ({
    page,
    context,
  }) => {
    await prepare(context);
    await createThemeWithUploadedImage(page);
    await page.waitForTimeout(1000);
    expect(await detailBackgroundImage(page)).toBe("none");
  });

  test("background image: once loaded it shows in the detail", async ({ page, context }) => {
    const webp = await sampleWebp();
    await context.route(/\/uploads\/theme-bg\/[a-f0-9-]+(-sm)?\.webp$/, (route) =>
      route.fulfill({ status: 200, contentType: "image/webp", body: webp }),
    );
    await prepare(context);
    await createThemeWithUploadedImage(page);
    await expect.poll(() => detailBackgroundImage(page)).toContain("url(");
  });

  test("export and import a theme as a JSON file", async ({ page, context }) => {
    await prepare(context);
    await page.goto("/");
    await openSidebar(page);
    await page.getByRole("button", { name: "Crear tema" }).click();
    const editor = page.getByRole("dialog", { name: "Crear tema" });
    await editor.getByLabel("Nombre").fill("Para compartir");
    await editor.getByRole("radio", { name: "Imagen" }).click();
    await editor.locator('input[type="file"]:not([accept*="json"])').setInputFiles({
      name: "fondo.webp",
      mimeType: "image/webp",
      buffer: await sampleWebp(),
    });
    await expect(editor.getByRole("button", { name: /^Usar imagen de/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const downloadPromise = page.waitForEvent("download");
    await editor.getByRole("button", { name: "Exportar" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("voxer-tema-para-compartir.json");
    const exported = JSON.parse(await readFile(await download.path(), "utf8"));
    expect(exported).toMatchObject({ format: "voxer-theme", version: 1, name: "Para compartir" });
    expect(exported.voxBackground).toMatchObject({
      kind: "sharedImage",
      fit: "cover",
      shareId: expect.stringMatching(/^[A-Za-z0-9_-]{32}$/),
    });
    expect(JSON.stringify(exported)).not.toContain("mswasset");
    expect(JSON.stringify(exported)).not.toContain("/uploads/");

    const importInput = editor.getByLabel("Importar tema desde archivo");
    await importInput.setInputFiles({
      name: "tema.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({ ...exported, name: "Importado", overrides: { brand: "#7c3aed" } }),
      ),
    });
    await expect(editor.getByLabel("Nombre")).toHaveValue("Importado");
    await expect(editor.locator("#theme-token-brand-hex")).toHaveValue("#7c3aed");

    await editor.getByRole("button", { name: "Pegar JSON" }).click();
    await editor
      .getByLabel("Pegá el JSON completo del tema")
      .fill(JSON.stringify({ ...exported, name: "Pegado", overrides: { brand: "#5bcefa" } }));
    await editor.getByRole("button", { name: "Cargar JSON" }).click();
    await expect(editor.getByLabel("Nombre")).toHaveValue("Pegado");
    await expect(editor.locator("#theme-token-brand-hex")).toHaveValue("#5bcefa");

    await editor.getByRole("button", { name: "Pegar JSON" }).click();
    await editor
      .getByLabel("Pegá el JSON completo del tema")
      .fill(JSON.stringify({ ...exported, overrides: { brand: "url(javascript:alert(1))" } }));
    await editor.getByRole("button", { name: "Cargar JSON" }).click();
    await expect(editor.getByRole("alert")).toBeVisible();
    await expect(editor.getByLabel("Nombre")).toHaveValue("Pegado");
  });
});
