import { NextResponse } from "next/server";
import {
  dbUnavailableMessageEs,
  isDbConfigured,
  jsonError,
  voxNotFound,
} from "@/server/http/apiErrors";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { prisma } from "@/server/db/prisma";
import { getPollPayloadForVox } from "@/server/vox/getPollPayloadForVox";

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
    const vox = await prisma.vox.findUnique({
      where: { id },
      select: { deletedAt: true, hasPoll: true },
    });
    if (!vox || vox.deletedAt) {
      return voxNotFound();
    }
    if (!vox.hasPoll) {
      return NextResponse.json({ poll: null });
    }
    const sessionUserId = await getSessionUserIdFromCookies();
    const poll = await getPollPayloadForVox(id, sessionUserId);
    return NextResponse.json({ poll });
  } catch {
    return jsonError("Error al cargar la encuesta", 500);
  }
};
