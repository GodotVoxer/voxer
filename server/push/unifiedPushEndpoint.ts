import { BlockList, isIP } from "node:net";
import { WEB_PUSH_ENDPOINT_MAX } from "@/server/push/webPushSubscription";

/**
 * UnifiedPush endpoints belong to whatever distributor the user runs (ntfy, NextPush, a self-hosted
 * server), so unlike browser Web Push there is no host allow-list. Instead the server only ever talks
 * to public addresses: this rejects private, loopback, link-local and reserved ranges, both in the
 * URL and, through `publicOnlyLookup`, in what the hostname resolves to when sending.
 */
const NON_PUBLIC = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  NON_PUBLIC.addSubnet(address, prefix, "ipv4");
}
for (const [address, prefix] of [
  ["::", 128],
  ["::1", 128],
  // NAT64 could reach a private IPv4 address; IPv4-mapped ones are unwrapped below.
  ["64:ff9b::", 96],
  ["100::", 64],
  // Teredo and 6to4 embed an IPv4 address that may be private.
  ["2001::", 32],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  NON_PUBLIC.addSubnet(address, prefix, "ipv6");
}

/** `::ffff:10.0.0.1` or its hex form `::ffff:a00:1` as the IPv4 address it stands for. */
const unwrapIpv4Mapped = (address: string): string | null => {
  const m = /^::ffff:(?:(\d+\.\d+\.\d+\.\d+)|([0-9a-f]{1,4}):([0-9a-f]{1,4}))$/i.exec(address);
  if (!m) return null;
  if (m[1]) return m[1];
  const high = parseInt(m[2]!, 16);
  const low = parseInt(m[3]!, 16);
  return [high >> 8, high & 255, low >> 8, low & 255].join(".");
};

export const isPublicIpAddress = (address: string): boolean => {
  const family = isIP(address);
  if (family === 0) return false;
  if (family === 6) {
    const mapped = unwrapIpv4Mapped(address);
    if (mapped) return isPublicIpAddress(mapped);
  }
  return !NON_PUBLIC.check(address, family === 4 ? "ipv4" : "ipv6");
};

const LOCAL_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home.arpa"];

export const isAllowedUnifiedPushEndpoint = (raw: string): boolean => {
  const t = raw.trim();
  if (t.length === 0 || t.length > WEB_PUSH_ENDPOINT_MAX) return false;
  let url: URL;
  try {
    url = new URL(t);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== "443") return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (isIP(host)) return isPublicIpAddress(host);
  if (!host.includes(".") || host === "localhost") return false;
  return !LOCAL_SUFFIXES.some((suffix) => host.endsWith(suffix));
};
