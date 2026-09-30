import { NextResponse } from "next/server";
import {
  dbUnavailableMessageEs,
  isDbConfigured,
  jsonError,
  signInRequired,
} from "@/server/http/apiErrors";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import {
  deleteAllNotificationsForUser,
  listNotificationsForUser,
} from "@/server/notifications/service";
export const GET = async () => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const userId = await getSessionUserIdFromCookies();
  if (!userId) {
    return signInRequired();
  }
  const items = await listNotificationsForUser(userId);
  return NextResponse.json({ notifications: items });
};
export const DELETE = async () => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const userId = await getSessionUserIdFromCookies();
  if (!userId) {
    return signInRequired();
  }
  await deleteAllNotificationsForUser(userId);
  return NextResponse.json({ ok: true });
};
