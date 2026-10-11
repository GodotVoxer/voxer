import { markVoxReadOnPushOpen } from "@/features/notifications/markVoxReadOnPushOpen";
import { parseVoxHref, shouldNavigateByHash } from "@/features/vox/detail/anchorNavigation";

const isSitePath = (path: unknown): path is string =>
  typeof path === "string" && path.startsWith("/") && !path.startsWith("//");

/**
 * Navigation to a site path with the page already open: the router keeps the stores and caches,
 * unlike a reload. Defense in depth: only relative site paths get in.
 */
export const navigateToPushPath = (path: unknown, push: (href: string) => void): void => {
  if (!isSitePath(path)) return;
  // Already on that vox, `router.push` uses pushState without `hashchange`, so the anchor reader
  // never notices and the comment is not highlighted.
  if (shouldNavigateByHash(path, window.location.pathname, window.location.hash)) {
    window.location.hash = parseVoxHref(path).hash;
    return;
  }
  push(path);
};

/** A notification click (Android or desktop) with the page already open. */
export const openPushPath = (path: unknown, push: (href: string) => void): void => {
  if (!isSitePath(path)) return;
  navigateToPushPath(path, push);
  void markVoxReadOnPushOpen(path);
};
