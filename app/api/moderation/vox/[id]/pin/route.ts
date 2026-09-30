import { after, NextResponse } from "next/server";
import { broadcastVoxUpdated } from "@/server/realtime/broadcast";
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
import { toggleVoxPinByAdmin } from "@/server/vox/adminPinVox";
import { isAdminRole } from "@/lib/moderation/roles";

type Params = { params: Promise<{ id: string }> };

export const POST = async (_req: Request, { params }: Params) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const sessionId = await getSessionUserIdFromCookies();
  if (!sessionId) {
    return signInRequired();
  }
  const staff = await getStaffUser(sessionId);
  if (!staff || !isAdminRole(staff.role)) {
    return jsonError("Solo un administrador puede pinear vox.", 403);
  }
  const { id: voxId } = await params;
  const r = await toggleVoxPinByAdmin(staff.id, staff.role, voxId);
  if (!r.ok) {
    if (r.kind === "not_found") {
      return voxNotFound();
    }
    return forbidden();
  }
  after(() => broadcastVoxUpdated(voxId, { pinnedAt: r.pinnedAt }));
  return NextResponse.json({ ok: true as const, pinnedAt: r.pinnedAt });
};
