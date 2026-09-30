/**
 * Anonymous client id to count several tabs of one browser once in presence. Privacy invariant: it is
 * never linked to users, accounts or IPs; just a random string stored on the device.
 */
const STORAGE_KEY = "voxer:presence-client-id";

export const getPresenceClientId = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    let id = window.localStorage.getItem(STORAGE_KEY);
    if (!id || id.length < 8) {
      id = `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
};
