/** WebSocket URL of a room; `https://` becomes `wss://`, as in the CSP. */
export const roomWebSocketUrl = (
  baseUrl: string,
  room: string,
  token?: string | null,
  clientId?: string | null,
): string | null => {
  const base = baseUrl.trim().replace(/\/$/, "");
  if (!base) return null;
  let url: URL;
  try {
    url = new URL(`${base}/ws`);
  } catch {
    return null;
  }
  if (url.protocol === "https:") url.protocol = "wss:";
  else if (url.protocol === "http:") url.protocol = "ws:";
  else if (url.protocol !== "wss:" && url.protocol !== "ws:") return null;
  url.searchParams.set("room", room);
  if (token) url.searchParams.set("token", token);
  if (clientId) url.searchParams.set("client", clientId);
  return url.toString();
};
