import { expect, test, type Page } from "@playwright/test";
import { seedDemo } from "../support/demoStorage";

const hideCheck = (page: Page) => page.getByLabel(">hide", { exact: true });
const lastCommentBody = (page: Page) => page.getByText(">hide", { exact: true }).last();

test("the >hide check appends the command to the comment and hides the vox", async ({
  page,
  context,
}) => {
  await seedDemo(context, { role: "USER" });
  await page.goto("/vox/1");
  const textarea = page.getByPlaceholder(/Escribí un comentario/);
  await expect(page.getByRole("button", { name: "Ocultar", exact: true })).toBeVisible();

  await textarea.fill("malísimo");
  await hideCheck(page).check();
  const request = page.waitForRequest(
    (r) => r.method() === "POST" && r.url().endsWith("/api/vox/1/comments"),
  );
  await page.getByRole("button", { name: "Comentar", exact: true }).click();

  expect((await request).postDataJSON().body).toBe("malísimo\n>hide");
  await expect(page.getByRole("button", { name: "Mostrar", exact: true })).toBeVisible();
  await expect(lastCommentBody(page)).toBeVisible();
  await expect(textarea).toHaveValue("");
  await expect(hideCheck(page)).not.toBeChecked();
});

test("a comment typed with >hide on its own line hides the vox", async ({ page, context }) => {
  await seedDemo(context, { role: "USER" });
  await page.goto("/vox/1");
  const textarea = page.getByPlaceholder(/Escribí un comentario/);
  await expect(page.getByRole("button", { name: "Ocultar", exact: true })).toBeVisible();

  await textarea.fill(">hide");
  await page.getByRole("button", { name: "Comentar", exact: true }).click();

  await expect(page.getByRole("button", { name: "Mostrar", exact: true })).toBeVisible();
});

test("staff gets the >hide check to the right of the staff one", async ({ page, context }) => {
  await seedDemo(context, { role: "ADMIN" });
  await page.goto("/vox/1");
  const staffCheck = page.getByLabel("Mostrar mi usuario como staff");
  await expect(staffCheck).toBeVisible();

  const staffBox = (await staffCheck.boundingBox())!;
  const hideBox = (await hideCheck(page).boundingBox())!;
  expect(hideBox.x).toBeGreaterThan(staffBox.x);
  expect(hideBox.y).toBe(staffBox.y);
});
