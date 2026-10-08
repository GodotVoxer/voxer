import { expect, test } from "@playwright/test";
import { seedDemo } from "../support/demoStorage";

test("an admin turns text-only mode on and off from the panel", async ({ page, context }) => {
  await seedDemo(context, { role: "ADMIN", nsfwPromptAnswered: false });
  await page.goto("/moderacion");
  await expect(page.getByText("· desactivado")).toBeVisible();
  await page.getByRole("button", { name: "Activar" }).click();
  await expect(page.getByText(/· activo desde/)).toBeVisible();
  await page.getByRole("button", { name: "Desactivar" }).click();
  await expect(page.getByText("· desactivado")).toBeVisible();
});
