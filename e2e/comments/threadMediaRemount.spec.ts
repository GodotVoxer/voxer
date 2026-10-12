import { expect, test, type Page } from "@playwright/test";
import { seedDemo } from "../support/demoStorage";

const IMAGE_URL = "/e2e-thread-image.svg";
const THREAD_SIZE = 90;
const VOX = "/vox/7";
/** Natural sizes of the thread images: wide, tall (clamped by the max height) and small. */
const IMAGE_SIZES = [
  [640, 360],
  [480, 1200],
  [200, 150],
  [900, 900],
] as const;
const IMAGE_DELAY_MS = 120;
const STEP = 400;

let imageRequests = 0;

test.beforeEach(async ({ context }) => {
  imageRequests = 0;
  await seedDemo(context, {
    role: "USER",
    longThread: { size: THREAD_SIZE, imageUrl: IMAGE_URL },
  });
  await context.route(`**${IMAGE_URL}*`, async (route) => {
    const n = Number(new URL(route.request().url()).searchParams.get("n") ?? 0);
    const [width, height] = IMAGE_SIZES[(n / 3) % IMAGE_SIZES.length]!;
    imageRequests += 1;
    await new Promise((resolve) => setTimeout(resolve, IMAGE_DELAY_MS));
    await route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"/>`,
    });
  });
});

/** Runs in the page: the thread scrolls with the comments panel on desktop and with the page on mobile. */
const installThreadProbe = (page: Page) =>
  page.evaluate(() => {
    const list = document.querySelector("[data-tag]")!.closest("[data-index]")!.parentElement!;
    let panel: HTMLElement | null = list.parentElement;
    while (panel && panel !== document.body) {
      if (/(auto|scroll)/.test(getComputedStyle(panel).overflowY)) break;
      panel = panel.parentElement;
    }
    const scroller = panel && panel !== document.body ? panel : null;
    const probe = {
      position: () => (scroller ? scroller.scrollTop : window.scrollY),
      scrollBy: (top: number) => (scroller ?? window).scrollBy({ top, behavior: "instant" }),
      rows: () => [...list.querySelectorAll<HTMLElement>("[data-tag]")],
      /** Settled height of each row, by tag. */
      heights: new Map<string, number>(),
      watching: false,
      expectedPosition: 0,
      remountedImageRows: new Set<string>(),
      resized: [] as string[],
      corrections: [] as string[],
    };
    (window as unknown as { __thread: typeof probe }).__thread = probe;
  });

type ThreadProbe = {
  position: () => number;
  scrollBy: (top: number) => void;
  rows: () => HTMLElement[];
  heights: Map<string, number>;
  watching: boolean;
  expectedPosition: number;
  remountedImageRows: Set<string>;
  resized: string[];
  corrections: string[];
};

const settle = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 60))),
      ),
  );

const imagesLoaded = (page: Page) =>
  expect
    .poll(() =>
      page.evaluate(() =>
        [...document.querySelectorAll<HTMLImageElement>("[data-tag] img[decoding]")].every(
          (img) => img.complete && img.naturalHeight > 0,
        ),
      ),
    )
    .toBe(true);

/** Scrolls down through the thread, waiting for every image, and records each row's settled height. */
const readThreadDown = async (page: Page, steps: number) => {
  for (let i = 0; i < steps; i += 1) {
    await page.evaluate((top) => {
      (window as unknown as { __thread: ThreadProbe }).__thread.scrollBy(top);
    }, STEP);
    await settle(page);
    await imagesLoaded(page);
    await settle(page);
    await page.evaluate(() => {
      const probe = (window as unknown as { __thread: ThreadProbe }).__thread;
      for (const row of probe.rows()) {
        probe.heights.set(row.dataset.tag!, row.getBoundingClientRect().height);
      }
    });
  }
};

/**
 * Scrolls back up watching every frame: a row already seen must come back with the height it had,
 * and the scroll must move only as far as it was asked to.
 */
const scrollBackUpWatching = async (page: Page, steps: number) => {
  await page.evaluate(() => {
    const probe = (window as unknown as { __thread: ThreadProbe }).__thread;
    const mountedAtStart = new Set(probe.rows().map((row) => row.dataset.tag));
    probe.watching = true;
    probe.expectedPosition = probe.position();
    const frame = () => {
      if (!probe.watching) return;
      const position = probe.position();
      if (Math.abs(position - probe.expectedPosition) > 1) {
        probe.corrections.push(`scroll en ${position}, se esperaba ${probe.expectedPosition}`);
        probe.expectedPosition = position;
      }
      for (const row of probe.rows()) {
        const tag = row.dataset.tag!;
        const known = probe.heights.get(tag);
        if (known === undefined) continue;
        if (!mountedAtStart.has(tag) && row.querySelector("img[decoding]")) {
          probe.remountedImageRows.add(tag);
        }
        const height = row.getBoundingClientRect().height;
        if (Math.abs(height - known) > 1) {
          probe.resized.push(`${tag}: ${height}px, medía ${known}px`);
          probe.heights.set(tag, height);
        }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  for (let i = 0; i < steps; i += 1) {
    await page.evaluate((top) => {
      const probe = (window as unknown as { __thread: ThreadProbe }).__thread;
      probe.expectedPosition = Math.max(0, probe.expectedPosition + top);
      probe.scrollBy(top);
    }, -STEP);
    await settle(page);
  }
  // Images still on their way when the scroll stops.
  await page.waitForTimeout(IMAGE_DELAY_MS * 3);
  return page.evaluate(() => {
    const probe = (window as unknown as { __thread: ThreadProbe }).__thread;
    probe.watching = false;
    return {
      remountedImageRows: probe.remountedImageRows.size,
      resized: probe.resized,
      corrections: probe.corrections,
    };
  });
};

test("rows with an image come back with their height and without moving the scroll", async ({
  page,
}) => {
  await page.goto(VOX);
  await expect(page.locator("[data-tag]").first()).toBeVisible();
  await installThreadProbe(page);
  await page
    .locator("[data-tag]")
    .first()
    .evaluate((row) => row.scrollIntoView({ block: "start" }));
  await settle(page);

  const steps = 24;
  await readThreadDown(page, steps);
  // A browser drops from memory the images of rows that left the thread, sooner the heavier they
  // are: a row that comes back is laid out before its image arrives again.
  const client = await page.context().newCDPSession(page);
  await client.send("HeapProfiler.collectGarbage");
  const requestsGoingDown = imageRequests;
  const up = await scrollBackUpWatching(page, steps - 2);

  expect(up.remountedImageRows).toBeGreaterThan(8);
  // They were fetched again: the rows did come back without their image.
  expect(imageRequests - requestsGoingDown).toBeGreaterThan(8);
  expect(up.resized).toEqual([]);
  expect(up.corrections).toEqual([]);

  // The size is only held while the image is on its way: a loaded row is free to change again.
  await imagesLoaded(page);
  await expect(page.locator('[data-tag] [style*="min-height"]')).toHaveCount(0);
});
