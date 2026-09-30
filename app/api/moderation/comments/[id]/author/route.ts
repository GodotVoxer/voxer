import { NextResponse } from "next/server";
import {
  commentNotFound,
  dbUnavailableMessageEs,
  forbidden,
  isDbConfigured,
  jsonError,
  signInRequired,
} from "@/server/http/apiErrors";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { getStaffUser } from "@/server/moderation/permissions";
import { findCommentAuthorForStaff } from "@/server/moderation/publicationAuthors";

type Params = { params: Promise<{ id: string }> };

/** Registered author of a comment, for staff only. */
export const GET = async (_req: Request, { params }: Params) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const sessionId = await getSessionUserIdFromCookies();
  if (!sessionId) return signInRequired();
  const staff = await getStaffUser(sessionId);
  if (!staff) return forbidden();
  const { id } = await params;
  const author = await findCommentAuthorForStaff(id, sessionId);
  if (!author.found) return commentNotFound();
  return NextResponse.json({ authorId: author.userId });
};
