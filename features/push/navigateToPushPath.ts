import { parseVoxHref, shouldNavigateByHash } from "@/features/vox/detail/anchorNavigation";

/**
 * Navigation from a notification click (Android or desktop) with the page already open: the router
 * keeps the stores and caches, unlike a reload. Defense in depth: only relative site paths get in.
 */
export const navigateToPushPath = (path: unknown, push: (href: string) => void): void => {
  if (typeof path !== "string") return;
  if (!path.startsWith("/") || path.startsWith("//")) return;
  // Already on that vox, `router.push` uses pushState without `hashchange`, so the anchor reader
  // never notices and the comment is not highlighted.
  if (shouldNavigateByHash(path, window.location.pathname, window.location.hash)) {
    window.location.hash = parseVoxHref(path).hash;
    return;
  }
  push(path);
};
