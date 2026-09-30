import { NextResponse } from "next/server";
import { isDbConfigured } from "@/server/http/apiErrors";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

// Deploys route no traffic to a new container until this answers 200; it is public, so no error details.
export const GET = async () => {
  if (!isDbConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
};
