import { expect, test, type BrowserContext } from "@playwright/test";
import { seedDemo } from "../support/demoStorage";

const prepare = (context: BrowserContext) => seedDemo(context, { role: "USER", theme: "dark" });

const commentsScrollTop = (page: import("@playwright/test").Page) =>
  page.evaluate(
    () =>
      document.querySelector("[data-vox-comment-composer-anchor]")?.parentElement?.scrollTop ?? -1,
  );

/** The comments load after the heading: wheeling before they can scroll loses notches. */
const waitForScrollableComments = (page: import("@playwright/test").Page) =>
  expect
    .poll(() =>
      page.evaluate(() => {
        const el = document.querySelector("[data-vox-comment-composer-anchor]")?.parentElement;
        return el ? el.scrollHeight - el.clientHeight : 0;
      }),
    )
    .toBeGreaterThan(400);

test.describe("chained detail scroll on desktop", () => {
  // Below `lg` the detail is a single column on the document scroll.
  test.skip(
    ({ viewport }) => (viewport?.width ?? 0) < 1024,
    "only applies to the two-column layout",
  );

  test("the wheel over the vox column moves the comments and scrolling back up returns them", async ({
    page,
    context,
  }) => {
    await prepare(context);
    await page.goto("/vox/1");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await waitForScrollableComments(page);
    await expect.poll(() => commentsScrollTop(page)).toBe(0);

    // Over the left half: unchained, the wheel here would not touch the comments.
    await page.mouse.move(300, 500);
    for (let i = 0; i < 6; i += 1) await page.mouse.wheel(0, 400);
    await expect.poll(() => commentsScrollTop(page)).toBeGreaterThan(0);

    for (let i = 0; i < 12; i += 1) await page.mouse.wheel(0, -400);
    await expect.poll(() => commentsScrollTop(page)).toBe(0);
  });

  test("each physical wheel notch (including macOS with a tiny deltaY) moves as far as scrolling directly", async ({
    page,
    context,
  }) => {
    await prepare(context);
    await page.goto("/vox/1");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await waitForScrollableComments(page);

    // 1. Direct scroll on the comments: two notches
    await page.mouse.move(1000, 500);
    for (let i = 0; i < 2; i++) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(500);
    const directScroll = await commentsScrollTop(page);
    expect(directScroll).toBe(200);

    await page.evaluate(() => {
      const el = document.querySelector("[data-vox-comment-composer-anchor]")?.parentElement;
      if (el) el.scrollTop = 0;
    });
    await page.waitForTimeout(200);

    // 2. Chained scroll from the left column: two notches
    await page.mouse.move(300, 500);
    for (let i = 0; i < 2; i++) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(500);
    const chainedScroll = await commentsScrollTop(page);
    expect(chainedScroll).toBe(directScroll);

    await page.evaluate(() => {
      const el = document.querySelector("[data-vox-comment-composer-anchor]")?.parentElement;
      if (el) el.scrollTop = 0;
    });
    await page.waitForTimeout(200);

    // 3. Typical macOS wheel event (deltaY = 4, wheelDelta = -120)
    await page.evaluate(async () => {
      const sidebar = document.querySelector("section.lg\\:overflow-y-auto");
      if (!sidebar) return;
      for (let i = 0; i < 2; i++) {
        const event = new WheelEvent("wheel", {
          deltaY: 4,
          deltaMode: 0,
          bubbles: true,
          cancelable: true,
        });
        Object.defineProperty(event, "wheelDelta", { value: -120 });
        Object.defineProperty(event, "wheelDeltaY", { value: -120 });
        sidebar.dispatchEvent(event);
        await new Promise((r) => setTimeout(r, 60));
      }
    });

    await page.waitForTimeout(500);
    const macScroll = await commentsScrollTop(page);
    expect(macScroll).toBe(directScroll);
  });
});
