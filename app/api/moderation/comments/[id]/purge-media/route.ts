import { mayModeratePublication } from "@/server/moderation/protectedContent";
import { NextResponse } from "next/server";
import {
  commentNotFound,
  dbUnavailableMessageEs,
  forbidden,
  invalidRequest,
  isDbConfigured,
  jsonError,
  signInRequired,
} from "@/server/http/apiErrors";
import { isAdminRole } from "@/lib/moderation/roles";
import { readPurgeMediaBlockFlag } from "@/server/moderation/purgeMediaRequestBody";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { getStaffUser } from "@/server/moderation/permissions";
import { staffPurgeCommentPublicationMedia } from "@/server/moderation/purgePublicationMedia";

type Params = { params: Promise<{ id: string }> };

export const POST = async (req: Request, { params }: Params) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const sessionId = await getSessionUserIdFromCookies();
  if (!sessionId) return signInRequired();
  const staff = await getStaffUser(sessionId);
  if (!staff) return forbidden();
  const { id } = await params;
  if (!(await mayModeratePublication(sessionId, { kind: "comment", id }))) {
    return jsonError("No podés purgar contenido de otro administrador.", 403);
  }
  const blockHashes = await readPurgeMediaBlockFlag(req);
  if (blockHashes === null) return invalidRequest();
  // Blocking is permanent and global (any account, forever): ADMIN only.
  if (blockHashes && !isAdminRole(staff.role)) {
    return jsonError("Solo un administrador puede bloquear un archivo para siempre.", 403);
  }
  const r = await staffPurgeCommentPublicationMedia(id, undefined, { blockHashes });
  if (!r.ok) return commentNotFound();
  return NextResponse.json({
    ok: true,
    voxId: r.voxId,
    commentIds: r.commentIds,
    blockedHashes: r.blockedHashes,
  });
};
