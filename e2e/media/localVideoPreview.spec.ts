import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import path from "path";
import { seedDemo } from "../support/demoStorage";

const VIDEO_FIXTURE = path.join(__dirname, "..", "fixtures", "red.mp4");
const PREVIEW_TITLE = "Vista previa de video";

declare global {
  interface Window {
    __previewPlayCalls?: number;
  }
}

/**
 * Desktop Chromium paints the first frame on its own, so `readyState` cannot tell a bare `<video>`
 * apart. What fails in the Android WebView is that nobody plays it, so the spec counts `play()` calls
 * on the preview.
 */
const spyOnPreviewPlay = (context: BrowserContext) =>
  context.addInitScript((title: string) => {
    window.__previewPlayCalls = 0;
    const nativePlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function play(this: HTMLMediaElement) {
      if (this.getAttribute("title") === title) {
        window.__previewPlayCalls = (window.__previewPlayCalls ?? 0) + 1;
      }
      return nativePlay.call(this);
    };
  }, PREVIEW_TITLE);

const prepare = (context: BrowserContext) => seedDemo(context, { role: "USER", theme: "dark" });

/** `readyState >= HAVE_CURRENT_DATA` means "there is a frame for the current time". */
const previewState = (page: Page) =>
  page.evaluate((title) => {
    const video = document.querySelector<HTMLVideoElement>(`video[title="${title}"]`);
    if (!video) return null;
    return {
      hasFrame: video.readyState >= 2,
      paused: video.paused,
      muted: video.muted,
      playCalls: window.__previewPlayCalls ?? 0,
    };
  }, PREVIEW_TITLE);

test.beforeEach(async ({ context }) => {
  await spyOnPreviewPlay(context);
  await prepare(context);
});

test("the new vox cover shows a frame of the chosen video", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Crear vox" }).click();
  await expect(page.getByRole("dialog").filter({ hasText: "Nuevo vox" })).toBeVisible();

  await page.locator('input[type="file"]').first().setInputFiles(VIDEO_FIXTURE);
  await expect(page.locator(`video[title="${PREVIEW_TITLE}"]`)).toBeVisible();

  // Paused and muted: the frame stays still and the video does not keep running.
  await expect
    .poll(() => previewState(page))
    .toEqual({
      hasFrame: true,
      paused: true,
      muted: true,
      playCalls: 1,
    });
});

test("the comment preview shows a frame too", async ({ page }) => {
  await page.goto("/vox/1");
  await expect(page.getByPlaceholder(/./).first()).toBeVisible();

  await page.locator('input[type="file"]').first().setInputFiles(VIDEO_FIXTURE);
  await expect(page.locator(`video[title="${PREVIEW_TITLE}"]`)).toBeVisible();
  await expect(page.getByText("Tratar como GIF", { exact: true })).toBeVisible();

  await expect
    .poll(() => previewState(page))
    .toEqual({
      hasFrame: true,
      paused: true,
      muted: true,
      playCalls: 1,
    });
});
