import type { NextResponse } from "next/server";
import { jsonError } from "@/server/http/apiErrors";
import { rateLimit } from "@/server/http/rateLimit";

/** Per user and minute: generous for people, low enough to stop bot loops. */
const USER_ACTION_LIMITS = {
  voxFlags: 60,
  pollVote: 20,
  pushDevices: 10,
  socketToken: 30,
  markRead: 120,
  acceptRules: 10,
} as const;

export type UserAction = keyof typeof USER_ACTION_LIMITS;

const WINDOW_MS = 60_000;

/** `null` to continue; otherwise the 429 response to return. */
export const userActionRateLimitResponse = async (
  userId: string,
  action: UserAction,
): Promise<NextResponse | null> => {
  const allowed = await rateLimit(
    `user-action:${action}:${userId}`,
    USER_ACTION_LIMITS[action],
    WINDOW_MS,
  );
  return allowed ? null : jsonError("Demasiadas acciones seguidas. Esperá un momento.", 429);
};
