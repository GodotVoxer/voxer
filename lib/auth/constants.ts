export const SESSION_COOKIE_NAME = "voxer_session";
/** Session JWT lifetime; matches the cookie maxAge. */
export const SESSION_TTL_SEC = 60 * 60 * 24 * 7;
/** Short-lived token to join the user's realtime room. */
export const SOCKET_JOIN_TTL_SEC = 120;
