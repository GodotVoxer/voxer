import { expect, test } from "@playwright/test";
import { seedDemo } from "../support/demoStorage";

test.describe("vox search", () => {
  test.beforeEach(async ({ context }) => {
    await seedDemo(context);
  });

  test("the field is empty again after searching", async ({ page }) => {
    await page.goto("/");
    const open = page.getByRole("button", { name: "Buscar vox por título" });
    await open.click();
    const input = page.getByPlaceholder("Escribí palabras del título…");
    await input.fill("jorge");
    await input.press("Enter");
    await page.waitForURL(/\/buscar\?q=jorge/);
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.getByRole("button", { name: "Buscar vox por título" }).click();
    await expect(page.getByPlaceholder("Escribí palabras del título…")).toHaveValue("");
  });

  test("no text is left either with a composing keyboard (Gboard)", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "CDP");
    await page.goto("/");
    await page.getByRole("button", { name: "Buscar vox por título" }).click();
    const input = page.getByPlaceholder("Escribí palabras del título…");
    await input.focus();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.imeSetComposition", {
      text: "jorge",
      selectionStart: 5,
      selectionEnd: 5,
    });
    await page.keyboard.press("Enter");
    await cdp.send("Input.insertText", { text: "jorge" });
    await page.waitForURL(/\/buscar\?q=jorge/);
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.getByRole("button", { name: "Buscar vox por título" }).click();
    await expect(page.getByPlaceholder("Escribí palabras del título…")).toHaveValue("");
  });
});
