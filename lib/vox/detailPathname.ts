/** `/vox/<id>` to `<id>`; any other route to `null`. */
export const voxIdFromDetailPathname = (pathname: string | null | undefined): string | null => {
  if (!pathname) return null;
  const match = /^\/vox\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};
