export type RealtimeMode = "durable" | "off";

/** `durable` connects clients to the Cloudflare Worker in `realtime/`; anything else disables push. */
export const realtimeMode = (): RealtimeMode => {
  // Values pasted into a hosting dashboard often carry whitespace or a trailing newline.
  const mode = process.env.NEXT_PUBLIC_REALTIME_MODE?.trim().toLowerCase();
  return mode === "durable" ? "durable" : "off";
};

export const realtimePushEnabled = (): boolean => realtimeMode() === "durable";

export const socketBroadcastsEnabled = (): boolean =>
  process.env.REALTIME_BROADCAST_ENABLED?.trim().toLowerCase() === "true";
