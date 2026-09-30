import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { seedDemo } from "../support/demoStorage";

const prepare = (context: BrowserContext) => seedDemo(context, { role: "USER", theme: "dark" });

/** First `>>TAG` button mounted in the (virtualized) thread; auto-waits for comments to load. */
const firstRefButton = (page: Page): Locator =>
  page.getByRole("button", { name: /^>>[A-Z0-9]{8}/ }).first();

test.beforeEach(({ context }) => prepare(context));

test("the own history shows the comment body and links to it", async ({ page }) => {
  await page.goto("/comentarios");
  const rows = page.getByRole("listitem");
  await expect(rows.first()).toBeVisible();

  const withBody = rows.filter({ hasText: "jaja no puede ser real esa captura" });
  await expect(withBody).toHaveCount(1);
  await expect(withBody.getByRole("link").or(withBody.locator("a"))).toHaveAttribute(
    "href",
    /^\/vox\/[^#]+#[A-Z0-9]+$/,
  );
});

test("the own history searches the full text of comments", async ({ page }) => {
  await page.goto("/comentarios");
  await expect(page.getByRole("listitem").first()).toBeVisible();

  await page.getByRole("searchbox", { name: "Buscar en tus comentarios" }).fill("captura");

  await expect(page.getByText("jaja no puede ser real esa captura").first()).toBeVisible();
  await expect(page.getByText("gracias por compartirlo")).toHaveCount(0);
});

test("quoting from the quote dialog keeps the navigation open", async ({ page }) => {
  await page.goto("/vox/1");
  await expect(page.getByPlaceholder(/./).first()).toBeVisible();

  await firstRefButton(page).click();
  const dialog = page.getByRole("dialog").filter({ hasText: "Comentario citado" });
  await expect(dialog).toBeVisible();

  const tagButton = dialog.getByTitle("Responder citando este ID");
  const tag = (await tagButton.textContent())?.trim() ?? "";
  expect(tag).not.toBe("");
  // Keyboard activation: a pointer crossing the opening dialog can trigger a reference's hover
  // preview, which then sits on top of this button.
  await tagButton.focus();
  await page.keyboard.press("Enter");

  await expect(dialog).toBeVisible();
  await expect(page.getByPlaceholder(/./).first()).toHaveValue(new RegExp(`>>${tag}`));
});

test("quoting from the replies dialog keeps it open", async ({ page }) => {
  await page.goto("/vox/1");
  await expect(page.getByPlaceholder(/./).first()).toBeVisible();

  await page
    .getByRole("button", { name: /^Respuestas: \d+$/ })
    .first()
    .click();

  const dialog = page.getByRole("dialog").filter({ hasText: "Respuestas a" });
  await expect(dialog).toBeVisible();

  const tagButton = dialog.getByTitle("Responder citando este ID").first();
  const tag = (await tagButton.textContent())?.trim() ?? "";
  expect(tag).not.toBe("");
  await tagButton.click();

  await expect(dialog).toBeVisible();
  await expect(page.getByPlaceholder(/./).first()).toHaveValue(new RegExp(`>>${tag}`));
});
