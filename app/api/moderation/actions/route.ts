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
import { listModerationActions } from "@/server/moderation/actionsQuery";
export const GET = async (req: Request) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const sessionId = await getSessionUserIdFromCookies();
  if (!sessionId) return signInRequired();
  const staff = await getStaffUser(sessionId);
  if (!staff) return forbidden();
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const actorUserId = searchParams.get("actorUserId") ?? undefined;
  const actorUsername = searchParams.get("actorUsername") ?? undefined;
  const banId = searchParams.get("banId") ?? undefined;
  const take = Number(searchParams.get("limit") ?? "40") || 40;
  const { items, nextCursor } = await listModerationActions({
    viewerUserId: sessionId,
    take,
    cursor,
    actorUserId: actorUserId || undefined,
    actorUsername: actorUsername || undefined,
    relatedBanId: banId || undefined,
  });
  return NextResponse.json({ actions: items, nextCursor });
};
