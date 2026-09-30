import { NextResponse } from "next/server";
import {
  dbUnavailableMessageEs,
  forbidden,
  isDbConfigured,
  jsonError,
  signInRequired,
} from "@/server/http/apiErrors";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { getStaffUser } from "@/server/moderation/permissions";
import {
  deleteAllStaffNotificationsForUser,
  listStaffNotificationsForUser,
} from "@/server/moderation/staffNotifications";
export const GET = async () => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const userId = await getSessionUserIdFromCookies();
  if (!userId) return signInRequired();
  const staff = await getStaffUser(userId);
  if (!staff) return forbidden();
  const notifications = await listStaffNotificationsForUser(userId);
  return NextResponse.json({ notifications });
};
export const DELETE = async () => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const userId = await getSessionUserIdFromCookies();
  if (!userId) return signInRequired();
  const staff = await getStaffUser(userId);
  if (!staff) return forbidden();
  await deleteAllStaffNotificationsForUser(userId);
  return NextResponse.json({ ok: true });
};
