import { countDuration } from "@/lib/format/plural";
import { MINUTE_MS } from "@/lib/time";
import { apiErrorBody } from "@/features/http/responseErrors";

export type BanApiClientPayload = {
  id: string;
  /** `network` bans the connection, not the account that tried to post. */
  scope: "account" | "network";
  reason: string;
  createdAt: string;
  endsAt: string | null;
};

export type BannedAxiosBody = {
  code: "BANNED";
  error?: string;
  ban: BanApiClientPayload;
};

export type ClientNetworkBlockedAxiosBody = {
  code: "CLIENT_NETWORK_BLOCKED";
  error?: string;
  /** Missing in responses from older servers: only the generic message is left. */
  ban: BanApiClientPayload | null;
};

const parseBan = (
  raw: unknown,
  fallbackScope: BanApiClientPayload["scope"],
): BanApiClientPayload | null => {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  if (typeof b.id !== "string" || typeof b.reason !== "string" || typeof b.createdAt !== "string") {
    return null;
  }
  return {
    id: b.id,
    scope: b.scope === "account" || b.scope === "network" ? b.scope : fallbackScope,
    reason: b.reason,
    createdAt: b.createdAt,
    endsAt: typeof b.endsAt === "string" ? b.endsAt : null,
  };
};

export const parseClientNetworkBlockedFromAxios = (
  e: unknown,
): ClientNetworkBlockedAxiosBody | null => {
  const rec = apiErrorBody(e);
  if (!rec || rec.code !== "CLIENT_NETWORK_BLOCKED") return null;
  return {
    code: "CLIENT_NETWORK_BLOCKED",
    error: typeof rec.error === "string" ? rec.error : undefined,
    ban: parseBan(rec.ban, "network"),
  };
};

export const parseBannedFromAxios = (e: unknown): BannedAxiosBody | null => {
  const rec = apiErrorBody(e);
  if (!rec || rec.code !== "BANNED") return null;
  const ban = parseBan(rec.ban, "account");
  if (!ban) return null;
  return {
    code: "BANNED",
    error: typeof rec.error === "string" ? rec.error : undefined,
    ban,
  };
};

/** Time left until `endsAt` in the two largest units: "2 días y 3 horas". */
export const formatBanRemainingEs = (endsAt: string, now: Date): string | null => {
  const end = new Date(endsAt).getTime();
  if (!Number.isFinite(end)) return null;
  const totalMinutes = Math.ceil((end - now.getTime()) / MINUTE_MS);
  if (totalMinutes <= 0) return null;
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(countDuration(days, "DAYS"));
  if (hours > 0) parts.push(countDuration(hours, "HOURS"));
  if (days === 0 && minutes > 0) parts.push(countDuration(minutes, "MINUTES"));
  return parts.slice(0, 2).join(" y ");
};
