/** Minimum production length of the internal broadcast secret. */
const SOCKET_BROADCAST_SECRET_MIN_LEN = 32;

export const isStrongSocketBroadcastSecret = (secret: string | undefined): boolean => {
  const s = secret?.trim();
  return Boolean(s && s.length >= SOCKET_BROADCAST_SECRET_MIN_LEN);
};
