export type RenderedBox = { width: number; height: number };
type LayoutViewport = { width: number; height: number };

const MAX_REMEMBERED = 2000;
const remembered = new Map<string, RenderedBox>();

/** Media is sized against the viewport: a box measured in another one would reserve the wrong space. */
const memoryKey = (id: string, viewport: LayoutViewport) =>
  `${viewport.width}x${viewport.height}:${id}`;

export const rememberRenderedBox = (id: string, viewport: LayoutViewport, box: RenderedBox) => {
  if (!(box.width > 0 && box.height > 0)) return;
  const key = memoryKey(id, viewport);
  remembered.delete(key);
  remembered.set(key, box);
  if (remembered.size <= MAX_REMEMBERED) return;
  const oldest = remembered.keys().next();
  if (!oldest.done) remembered.delete(oldest.value);
};

export const recallRenderedBox = (id: string, viewport: LayoutViewport): RenderedBox | null =>
  remembered.get(memoryKey(id, viewport)) ?? null;

export const forgetRenderedBoxes = () => remembered.clear();

const HAVE_METADATA = 1;

/** Every image and video under `root` already has the size it will keep (or failed to load). */
export const isMediaSettled = (root: Pick<ParentNode, "querySelectorAll">): boolean => {
  for (const img of root.querySelectorAll("img")) {
    if (!img.complete) return false;
  }
  for (const video of root.querySelectorAll("video")) {
    if (video.readyState < HAVE_METADATA && !video.error) return false;
  }
  return true;
};
