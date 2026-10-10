import { expect, test, type Page } from "@playwright/test";
import path from "path";
import { seedDemo } from "../support/demoStorage";

const VIDEO_FIXTURE = path.join(__dirname, "..", "fixtures", "red.mp4");
const VIDEO_URL = "/e2e-thread-video.mp4";
const THREAD_SIZE = 300;
const VOX = "/vox/7";

test.beforeEach(async ({ context }) => {
  await seedDemo(context, {
    role: "USER",
    longThread: { size: THREAD_SIZE, videoUrl: VIDEO_URL },
  });
  await context.route(`**${VIDEO_URL}`, (route) =>
    route.fulfill({ status: 200, contentType: "video/mp4", path: VIDEO_FIXTURE }),
  );
});

const mobileOnly = (projectName: string) =>
  test.skip(projectName !== "mobile", "El scroll de página es el de mobile");

/** Rows of the thread itself: pinned copies carry no `data-tag`. */
const mountedRows = (page: Page) => page.locator("[data-tag]").count();

const settle = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 60))),
      ),
  );

const openThread = async (page: Page, url = VOX) => {
  await page.goto(url);
  await expect(page.locator("[data-tag]").first()).toBeVisible();
  await settle(page);
};

/** Tags as the thread lists them, newest first. */
const threadTags = (page: Page) =>
  page.evaluate(async () => {
    const res = await fetch("/api/vox/7/comments");
    const data = (await res.json()) as { comments: { publicTag: string }[] };
    return data.comments.map((c) => c.publicTag.toUpperCase());
  });

type Snapshot = {
  scrollY: number;
  /** Thread row around the middle of the viewport, to follow across a scroll step. */
  anchor: { tag: string; top: number } | null;
  /** Sampled heights of the viewport that fall inside the thread but show no row. */
  gaps: number[];
};

const snapshot = (page: Page, followTag?: string) =>
  page.evaluate((tag): Snapshot => {
    const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
    const rows = [...document.querySelectorAll<HTMLElement>("[data-tag]")];
    const thread = rows[0]?.closest("[data-index]")?.parentElement?.getBoundingClientRect();
    const middle = (headerBottom + window.innerHeight) / 2;
    const followed = tag
      ? rows.find((row) => row.dataset.tag?.toUpperCase() === tag)
      : rows.find((row) => {
          const rect = row.getBoundingClientRect();
          return rect.top <= middle && rect.bottom > middle;
        });
    const gaps: number[] = [];
    for (let y = headerBottom + 4; y < window.innerHeight - 4; y += 40) {
      if (!thread || y < thread.top + 2 || y > thread.bottom - 2) continue;
      const hit = document.elementFromPoint(window.innerWidth / 2, y);
      if (!hit?.closest("[data-index]")) gaps.push(Math.round(y));
    }
    return {
      scrollY: window.scrollY,
      anchor: followed
        ? {
            tag: (followed.dataset.tag ?? "").toUpperCase(),
            top: followed.getBoundingClientRect().top,
          }
        : null,
      gaps,
    };
  }, followTag);

/** Scrolls by steps and checks, at each one, that the content moved exactly as far as the scroll. */
const scrollInSteps = async (page: Page, step: number, steps: number) => {
  for (let i = 0; i < steps; i += 1) {
    const before = await snapshot(page);
    if (!before.anchor) throw new Error(`Sin fila visible antes del paso ${i}`);
    await page.evaluate((top) => window.scrollBy({ top, behavior: "instant" }), step);
    await settle(page);
    const after = await snapshot(page, before.anchor.tag);
    expect(after.gaps, `huecos en el paso ${i}`).toEqual([]);
    expect(after.anchor, `la fila seguida se desmontó en el paso ${i}`).not.toBeNull();
    expect(
      Math.abs(after.anchor!.top - (before.anchor.top - step)),
      `salto en el paso ${i}`,
    ).toBeLessThanOrEqual(1.5);
  }
};

test("on mobile only the rows near the viewport are mounted", async ({ page }, testInfo) => {
  mobileOnly(testInfo.project.name);
  await openThread(page);
  await expect(page.getByRole("heading", { name: /Comentarios \(\d+\)/ })).toContainText(
    String(THREAD_SIZE + 7),
  );
  expect(await mountedRows(page)).toBeLessThan(40);

  await page.evaluate(() =>
    window.scrollTo({ top: document.documentElement.scrollHeight / 2, behavior: "instant" }),
  );
  await settle(page);
  expect(await mountedRows(page)).toBeLessThan(40);
  expect((await snapshot(page)).gaps).toEqual([]);

  // The spare rows sit on both sides of the viewport: the thread knows where it starts in the page.
  const spare = await page.evaluate(() => {
    const rects = [...document.querySelectorAll("[data-tag]")].map((row) =>
      row.getBoundingClientRect(),
    );
    return {
      above: rects.filter((rect) => rect.bottom <= 0).length,
      below: rects.filter((rect) => rect.top >= window.innerHeight).length,
    };
  });
  expect(spare.above).toBeGreaterThanOrEqual(7);
  expect(spare.below).toBeGreaterThanOrEqual(7);
});

test("scrolling the page down and back up shows no gaps and no jumps", async ({
  page,
}, testInfo) => {
  mobileOnly(testInfo.project.name);
  await openThread(page);

  // Past the vox, into the thread.
  await page
    .locator("[data-tag]")
    .first()
    .evaluate((row) => row.scrollIntoView({ block: "start" }));
  await settle(page);
  await scrollInSteps(page, 420, 30);

  // A far jump lands among rows never measured: going back up they resize above the viewport.
  await page.evaluate(() =>
    window.scrollTo({ top: document.documentElement.scrollHeight * 0.8, behavior: "instant" }),
  );
  await settle(page);
  await scrollInSteps(page, -420, 30);
});

type FlingStats = { frames: number; distance: number; gapFrames: number; worstJump: number };

/** Samples every frame of a touch fling: blank stretches of thread, and rows that move against the scroll. */
const flingAndSample = async (page: Page, yDistance: number): Promise<FlingStats> => {
  // Known from the gesture: corrections for rows resizing above the viewport also move `scrollY`.
  const direction = yDistance < 0 ? 1 : -1;
  await page.evaluate((direction) => {
    const state = {
      running: true,
      frames: 0,
      gapFrames: 0,
      worstJump: 0,
      startY: window.scrollY,
      prev: null as null | { tag: string; top: number },
    };
    (window as unknown as { __fling: typeof state }).__fling = state;
    const frame = () => {
      if (!state.running) return;
      const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
      const rows = [...document.querySelectorAll<HTMLElement>("[data-tag]")];
      const thread = rows[0]?.closest("[data-index]")?.parentElement?.getBoundingClientRect();
      let gap = false;
      for (let y = headerBottom + 4; y < window.innerHeight - 4; y += 60) {
        if (!thread || y < thread.top + 2 || y > thread.bottom - 2) continue;
        if (!document.elementFromPoint(window.innerWidth / 2, y)?.closest("[data-index]")) {
          gap = true;
        }
      }
      state.frames += 1;
      if (gap) state.gapFrames += 1;
      const same = state.prev && rows.find((row) => row.dataset.tag === state.prev!.tag);
      if (same && state.prev) {
        // Scrolling down, content moves up, and the other way around: anything else is a jump.
        const moved = same.getBoundingClientRect().top - state.prev.top;
        state.worstJump = Math.max(state.worstJump, moved * direction);
      }
      const middle = (headerBottom + window.innerHeight) / 2;
      const next =
        rows.find((row) => {
          const rect = row.getBoundingClientRect();
          return rect.top <= middle && rect.bottom > middle;
        }) ?? null;
      state.prev = next
        ? { tag: next.dataset.tag ?? "", top: next.getBoundingClientRect().top }
        : null;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, direction);
  const client = await page.context().newCDPSession(page);
  await client.send("Input.synthesizeScrollGesture", {
    x: 200,
    y: 500,
    yDistance,
    speed: 5000,
    gestureSourceType: "touch",
  });
  await settle(page);
  return page.evaluate(() => {
    const state = (
      window as unknown as {
        __fling: {
          running: boolean;
          frames: number;
          gapFrames: number;
          worstJump: number;
          startY: number;
        };
      }
    ).__fling;
    state.running = false;
    return {
      frames: state.frames,
      distance: window.scrollY - state.startY,
      gapFrames: state.gapFrames,
      worstJump: state.worstJump,
    };
  });
};

test("a touch fling through the thread never shows a blank stretch nor a jump", async ({
  page,
}, testInfo) => {
  mobileOnly(testInfo.project.name);
  await openThread(page);
  await page
    .locator("[data-tag]")
    .first()
    .evaluate((row) => row.scrollIntoView({ block: "start" }));
  await settle(page);

  const down = await flingAndSample(page, -9000);
  expect(down.distance).toBeGreaterThan(6000);
  expect(down.frames).toBeGreaterThan(30);
  expect(down.gapFrames).toBe(0);
  expect(down.worstJump).toBeLessThanOrEqual(2);

  // Back up from rows never measured: they resize above the viewport while the finger moves.
  await page.evaluate(() =>
    window.scrollTo({ top: document.documentElement.scrollHeight * 0.8, behavior: "instant" }),
  );
  await settle(page);
  const up = await flingAndSample(page, 9000);
  expect(up.distance).toBeLessThan(-6000);
  expect(up.gapFrames).toBe(0);
  expect(up.worstJump).toBeLessThanOrEqual(2);
});

for (const cold of [true, false]) {
  test(`a link to a comment deep in the thread lands on it (${cold ? "opening the vox" : "with the vox open"})`, async ({
    page,
  }) => {
    await openThread(page);
    const tags = await threadTags(page);
    const target = tags[Math.floor(tags.length * 0.6)]!;
    await expect(page.locator(`[id="${target}"]`)).toHaveCount(0);

    if (cold) await page.goto(`${VOX}#${target}`);
    else await page.evaluate((tag) => (window.location.hash = tag), target);

    const row = page.locator(`[id="${target}"]`);
    await expect(row).toBeInViewport({ ratio: 0.9 });
    await expect(row).toHaveClass(/ring-brand-500/);
    // Rows around it keep being measured for a moment: the target must not drift away.
    await page.waitForTimeout(800);
    await expect(row).toBeInViewport({ ratio: 0.9 });
  });
}

test("a playing video keeps playing while its row is scrolled far away", async ({
  page,
}, testInfo) => {
  mobileOnly(testInfo.project.name);
  await openThread(page);

  await page.getByRole("button", { name: "Reproducir video" }).first().click();
  const playback = () =>
    page.evaluate(() => {
      const video = document.querySelector<HTMLVideoElement>("video[data-e2e-playing]");
      return video
        ? { connected: video.isConnected, paused: video.paused, played: video.played.length > 0 }
        : null;
    });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const video = document.querySelector<HTMLVideoElement>("[data-tag] video");
        if (!video || video.paused || video.currentTime <= 0) return false;
        video.dataset.e2ePlaying = "1";
        return true;
      }),
    )
    .toBe(true);

  for (let i = 0; i < 12; i += 1) {
    await page.evaluate(() => window.scrollBy({ top: 1500, behavior: "instant" }));
    await settle(page);
  }
  // Far enough that its row is out of the mounted range, which stays small.
  expect(await mountedRows(page)).toBeLessThan(40);
  expect(await playback()).toEqual({ connected: true, paused: false, played: true });

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await settle(page);
  expect(await playback()).toEqual({ connected: true, paused: false, played: true });
  await expect(page.locator("video[data-e2e-playing]")).toBeVisible();
});

test("the button to the oldest comment reaches the end of the thread", async ({
  page,
}, testInfo) => {
  mobileOnly(testInfo.project.name);
  await openThread(page);
  const tags = await threadTags(page);
  const oldest = tags[tags.length - 1]!;

  await page.getByRole("button", { name: "Ir al primer comentario del hilo" }).click();
  await expect(page.locator(`[id="${oldest}"]`)).toBeInViewport({ ratio: 0.9 });
});

test("the button back to the composer reaches it from deep in the thread", async ({
  page,
}, testInfo) => {
  mobileOnly(testInfo.project.name);
  await openThread(page);
  // A far jump: every row between here and the composer mounts and is measured on the way back.
  await page.evaluate(() =>
    window.scrollTo({ top: document.documentElement.scrollHeight * 0.8, behavior: "instant" }),
  );
  await settle(page);

  await page.getByRole("button", { name: "Volver al cuadro de comentario" }).click();
  const composer = page.getByPlaceholder(/Escribí un comentario/);
  await expect(composer).toBeInViewport({ ratio: 1 });
  const headerBottom = await page.evaluate(
    () => document.querySelector("header")?.getBoundingClientRect().bottom ?? 0,
  );
  const anchorTop = () =>
    page.evaluate(
      () =>
        document.querySelector("[data-vox-comment-composer-anchor]")?.getBoundingClientRect().top ??
        -1,
    );
  await expect.poll(async () => Math.abs((await anchorTop()) - headerBottom)).toBeLessThan(4);
});
