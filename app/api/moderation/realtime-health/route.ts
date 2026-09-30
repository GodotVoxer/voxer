import { NextResponse } from "next/server";
import { forbidden, signInRequired } from "@/server/http/apiErrors";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { getStaffUser } from "@/server/moderation/permissions";
import { broadcastHealthReport } from "@/server/realtime/broadcastHealth";

/** Staff only: exposes hosts and configuration state, never the secret. */
export const GET = async () => {
  const userId = await getSessionUserIdFromCookies();
  if (!userId) return signInRequired();
  const staff = await getStaffUser(userId);
  if (!staff) return forbidden();
  return NextResponse.json(await broadcastHealthReport());
};
