/*
 * Desktop notifications service worker (Web Push). Contract: `buildWebPushData` in
 * `server/push/payload.ts`. Registered with scope `/push-sw/` so it controls no pages and does not
 * clash with MSW (`/mockServiceWorker.js`, scope `/`): it only receives pushes and clicks.
 */

const SUPPORTED_VERSION = "1";
const APP_ICON = "/push-icon.png";

/** Same rule as the Android app's `DeepLinkResolver.isSafeRelativePath`. */
const isSafeRelativePath = (path) =>
  typeof path === "string" &&
  path.startsWith("/") &&
  !path.startsWith("//") &&
  !path.includes("\\") &&
  !path.includes("..") &&
  !path.includes(":") &&
  !/[\u0000-\u001f]/.test(path);

const readPayload = (event) => {
  if (!event.data) return null;
  let data;
  try {
    data = event.data.json();
  } catch {
    return null;
  }
  if (!data || data.v !== SUPPORTED_VERSION) return null;
  if (typeof data.title !== "string" || !data.title) return null;
  if (typeof data.body !== "string" || !data.body) return null;
  if (!isSafeRelativePath(data.path)) return null;
  const tag = typeof data.tag === "string" && data.tag ? data.tag : data.path;
  const image =
    typeof data.image === "string" && (data.image.startsWith("https://") || isSafeRelativePath(data.image))
      ? data.image
      : null;
  return { title: data.title, body: data.body, path: data.path, tag, image };
};

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * One notification per vox (the `tag` is the server's collapse key): later comments replace it and bump
 * the counter without repeating the image. The counter goes first because the system cuts a long body.
 */
self.addEventListener("push", (event) => {
  const payload = readPayload(event);
  if (!payload) return;
  event.waitUntil(
    (async () => {
      const previous = await self.registration.getNotifications({ tag: payload.tag });
      const previousCount = previous.reduce(
        (max, n) => Math.max(max, Number(n.data && n.data.count) || 1),
        0,
      );
      const count = previousCount + 1;
      await self.registration.showNotification(payload.title, {
        body: count > 1 ? `${count} nuevos · ${payload.body}` : payload.body,
        tag: payload.tag,
        renotify: true,
        // macOS only shows `icon`; Windows and Linux show `image` large below the text.
        icon: payload.image || APP_ICON,
        ...(payload.image ? { image: payload.image } : {}),
        data: { path: payload.path, count },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawPath = event.notification.data && event.notification.data.path;
  const path = isSafeRelativePath(rawPath) ? rawPath : "/";
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((c) => new URL(c.url).origin === self.location.origin);
      if (open) {
        // The page navigates with the router (`hooks/device/useWebPushBridge.ts`) to keep its state: this
        // worker does not control the tab, so `client.navigate` is unavailable.
        await open.focus();
        open.postMessage({ type: "voxer:push-navigate", path });
        return;
      }
      await self.clients.openWindow(new URL(path, self.location.origin).href);
    })(),
  );
});
