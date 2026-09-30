import { NextResponse } from "next/server";
import {
  dbUnavailableMessageEs,
  forbidden,
  isDbConfigured,
  jsonError,
  signInRequired,
  voxNotFound,
} from "@/server/http/apiErrors";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { getStaffUser } from "@/server/moderation/permissions";
import { findVoxOwnerForStaff } from "@/server/moderation/publicationAuthors";

type Params = { params: Promise<{ id: string }> };

/** Registered owner of a vox, for staff only; nothing else about the user is exposed. */
export const GET = async (_req: Request, { params }: Params) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const sessionId = await getSessionUserIdFromCookies();
  if (!sessionId) return signInRequired();
  const staff = await getStaffUser(sessionId);
  if (!staff) return forbidden();
  const { id } = await params;
  const owner = await findVoxOwnerForStaff(id, sessionId);
  if (!owner.found) return voxNotFound();
  return NextResponse.json({ ownerId: owner.userId });
};
