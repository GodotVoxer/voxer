import { NextResponse } from "next/server";
import {
  commentNotFound,
  dbUnavailableMessageEs,
  isDbConfigured,
  jsonError,
  signInRequired,
} from "@/server/http/apiErrors";
import { userActionRateLimitResponse } from "@/server/http/userActionRateLimit";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { setCommentRepliesMuted } from "@/server/comments/replyNotifications";
type Params = {
  params: Promise<{
    id: string;
  }>;
};
const handle = async ({ params }: Params, muted: boolean) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const userId = await getSessionUserIdFromCookies();
  if (!userId) {
    return signInRequired();
  }
  const limited = await userActionRateLimitResponse(userId, "voxFlags");
  if (limited) return limited;
  const { id: commentId } = await params;
  const ok = await setCommentRepliesMuted(userId, commentId, muted);
  if (!ok) return commentNotFound();
  return NextResponse.json({ ok: true, repliesMuted: muted });
};
export const POST = (_req: Request, ctx: Params) => handle(ctx, true);
export const DELETE = (_req: Request, ctx: Params) => handle(ctx, false);
