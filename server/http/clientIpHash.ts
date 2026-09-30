import { createHmac } from "node:crypto";

export const normalizeRawClientIp = (raw: string): string => raw.trim().toLowerCase();

const getClientIpHashPepper = (): string => {
  const p = process.env.VOXER_CLIENT_IP_PEPPER?.trim();
  if (p && p.length >= 16) return p;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "VOXER_CLIENT_IP_PEPPER is missing (16+ random characters), required for IP fingerprints and network bans.",
    );
  }
  return "dev-voxer-client-ip-pepper-do-not-use-in-prod";
};

export const hmacSha256Hex = (key: string, message: string): string =>
  createHmac("sha256", key).update(message, "utf8").digest("hex");

export const hashNormalizedClientIp = (normalizedIp: string, pepper: string): string =>
  hmacSha256Hex(pepper, normalizedIp);

export const hashClientIpFromRawHeaderValue = (raw: string): string => {
  const pepper = getClientIpHashPepper();
  return hashNormalizedClientIp(normalizeRawClientIp(raw), pepper);
};
