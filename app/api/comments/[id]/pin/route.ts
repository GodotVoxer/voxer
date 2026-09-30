import { after, NextResponse } from "next/server";
import {
  commentNotFound,
  dbUnavailableMessageEs,
  isDbConfigured,
  jsonError,
  signInRequired,
} from "@/server/http/apiErrors";
import { broadcastCommentPinned } from "@/server/realtime/broadcast";
import { userActionRateLimitResponse } from "@/server/http/userActionRateLimit";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { setCommentPinned } from "@/server/comments/pin";
type Params = {
  params: Promise<{
    id: string;
  }>;
};
const handle = async ({ params }: Params, pinned: boolean) => {
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
  const result = await setCommentPinned(userId, commentId, pinned);
  if (!result.ok) return commentNotFound();
  after(async () => {
    await broadcastCommentPinned(result.voxId, commentId, result.pinnedAt);
  });
  return NextResponse.json({ ok: true, pinnedAt: result.pinnedAt });
};
export const POST = (_req: Request, ctx: Params) => handle(ctx, true);
export const DELETE = (_req: Request, ctx: Params) => handle(ctx, false);
