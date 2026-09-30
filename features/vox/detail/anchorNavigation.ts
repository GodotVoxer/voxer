/** Splits `/vox/abc#TAG` into route and anchor. */
export const parseVoxHref = (href: string): { path: string; hash: string } => {
  const i = href.indexOf("#");
  if (i === -1) return { path: href, hash: "" };
  return { path: href.slice(0, i), hash: href.slice(i + 1) };
};

/** `router.push` uses `history.pushState`, which fires neither `hashchange` nor `popstate`: same-vox anchors need a manual hash. */
export const shouldNavigateByHash = (
  href: string,
  currentPathname: string,
  currentHash: string,
): boolean => {
  const { path, hash } = parseVoxHref(href);
  if (!hash) return false;
  if (path !== currentPathname) return false;
  return `#${hash}` !== currentHash;
};
