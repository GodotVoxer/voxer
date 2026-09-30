"use client";

import { acquireRoom } from "@/features/realtime/roomClient";
import { realtimePushEnabled } from "@/lib/realtime/mode";

export type { RoomLease } from "@/features/realtime/roomClient";

const realtimeBaseUrl = (): string | undefined =>
  process.env.NEXT_PUBLIC_SOCKET_URL ??
  (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8787" : undefined);

/** Subscribes to a realtime room; `null` when push is disabled. */
export const acquireRealtimeRoom = async (opts: {
  room: string;
  getToken?: () => Promise<string | null>;
  clientId?: string | null;
}): Promise<import("@/features/realtime/roomClient").RoomLease | null> => {
  if (!realtimePushEnabled()) return null;
  const baseUrl = realtimeBaseUrl();
  if (!baseUrl) return null;
  return acquireRoom({
    baseUrl,
    room: opts.room,
    getToken: opts.getToken,
    clientId: opts.clientId,
  });
};
