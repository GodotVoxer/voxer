import { NextResponse } from "next/server";
import {
  dbUnavailableMessageEs,
  isDbConfigured,
  jsonError,
  voxNotFound,
} from "@/server/http/apiErrors";
import { getVoxDetailCached } from "@/server/vox/getVoxDetailCached";
import { serializeVoxDetailForClient } from "@/server/vox/serializeDetailForClient";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { withViewerFlags } from "@/server/vox/getDetailApi";
type Params = {
  params: Promise<{
    id: string;
  }>;
};
export const GET = async (_req: Request, { params }: Params) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const { id } = await params;
  try {
    const [sessionUserId, publicVox] = await Promise.all([
      getSessionUserIdFromCookies(),
      getVoxDetailCached(id, null),
    ]);
    const vox =
      publicVox && sessionUserId ? await withViewerFlags(publicVox, sessionUserId) : publicVox;
    if (!vox) return voxNotFound();
    return NextResponse.json(serializeVoxDetailForClient(vox));
  } catch {
    return jsonError("Error al cargar el vox", 500);
  }
};
