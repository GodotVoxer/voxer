/**
 * Every `/api/*` response is private and only useful fresh. Next sends no `Cache-Control` for
 * dynamic route handlers and they carry no validator, so intermediate caches apply heuristics; the
 * Android WebView (`LOAD_DEFAULT`) would serve a stale session or comment thread from its cache.
 */
const API_NO_STORE_CACHE_CONTROL = "private, no-store";

/** Also covers endpoints added later. */
export const API_NO_STORE_SOURCE = "/api/:path*";

export const apiNoStoreHeaders = (): Array<{ key: string; value: string }> => [
  { key: "Cache-Control", value: API_NO_STORE_CACHE_CONTROL },
];
