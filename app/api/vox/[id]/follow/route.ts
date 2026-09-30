import { NextResponse } from "next/server";
import {
  dbUnavailableMessageEs,
  isDbConfigured,
  jsonError,
  signInRequired,
  voxNotFound,
} from "@/server/http/apiErrors";
import { userActionRateLimitResponse } from "@/server/http/userActionRateLimit";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { clearVoxFollow, setVoxFollowed } from "@/server/vox/follow";
type Params = {
  params: Promise<{
    id: string;
  }>;
};
export const POST = async (_req: Request, { params }: Params) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const userId = await getSessionUserIdFromCookies();
  if (!userId) {
    return signInRequired();
  }
  const limited = await userActionRateLimitResponse(userId, "voxFlags");
  if (limited) return limited;
  const { id: voxId } = await params;
  const ok = await setVoxFollowed(userId, voxId);
  if (!ok) return voxNotFound();
  return NextResponse.json({ ok: true });
};
export const DELETE = async (_req: Request, { params }: Params) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const userId = await getSessionUserIdFromCookies();
  if (!userId) {
    return signInRequired();
  }
  const limited = await userActionRateLimitResponse(userId, "voxFlags");
  if (limited) return limited;
  const { id: voxId } = await params;
  await clearVoxFollow(userId, voxId);
  return NextResponse.json({ ok: true });
};
