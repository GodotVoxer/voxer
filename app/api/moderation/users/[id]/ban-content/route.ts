import { NextResponse } from "next/server";
import { moderationBanContentSchema } from "@/lib/moderation/schemas";
import {
  dbUnavailableMessageEs,
  forbidden,
  internalErrorMessageEs,
  invalidJson,
  isDbConfigured,
  jsonError,
  signInRequired,
  zodToMessage,
} from "@/server/http/apiErrors";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { getStaffUser } from "@/server/moderation/permissions";
import {
  previewBulkBanUserContent,
  staffBulkBanUserContent,
  type BulkBanContentInput,
} from "@/server/moderation/ban";
import { isAdminRole } from "@/lib/moderation/roles";
import { ZodError } from "zod";
type Params = { params: Promise<{ id: string }> };

const parseBanContent = (raw: Record<string, unknown>) => {
  try {
    const parsed = moderationBanContentSchema.parse(raw);
    const contentBan: BulkBanContentInput =
      parsed.forever === true
        ? { kind: "forever" }
        : { kind: "relative", amount: parsed.amount, unit: parsed.unit };
    return { ok: true as const, parsed, contentBan };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false as const, res: jsonError(zodToMessage(e), 400) };
    return { ok: false as const, res: jsonError(internalErrorMessageEs(), 500) };
  }
};

const targetErrorResponse = (kind: "not_found" | "forbidden_target") =>
  kind === "not_found"
    ? jsonError("Usuario no encontrado", 404)
    : jsonError("No podés eliminar publicaciones de otro administrador.", 403);

export const GET = async (req: Request, { params }: Params) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const sessionId = await getSessionUserIdFromCookies();
  if (!sessionId) return signInRequired();
  const staff = await getStaffUser(sessionId);
  if (!staff) return forbidden();
  const { id: targetUserId } = await params;
  const sp = new URL(req.url).searchParams;
  const input = parseBanContent({
    targetUserId,
    forever: sp.get("forever") === "true",
    ...(sp.has("amount") ? { amount: sp.get("amount") } : {}),
    ...(sp.has("unit") ? { unit: sp.get("unit") } : {}),
  });
  if (!input.ok) return input.res;
  const r = await previewBulkBanUserContent(sessionId, targetUserId, input.contentBan);
  if (!r.ok) return targetErrorResponse(r.kind);
  return NextResponse.json(r.counts);
};

export const POST = async (req: Request, { params }: Params) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const sessionId = await getSessionUserIdFromCookies();
  if (!sessionId) return signInRequired();
  const staff = await getStaffUser(sessionId);
  if (!staff) return forbidden();
  const { id: targetUserId } = await params;
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return invalidJson();
  }
  const input = parseBanContent({ ...body, targetUserId });
  if (!input.ok) return input.res;
  // Blocking is permanent and global (any account, forever): ADMIN only.
  if (input.parsed.media === "block" && !isAdminRole(staff.role)) {
    return jsonError("Solo un administrador puede bloquear archivos para siempre.", 403);
  }
  const r = await staffBulkBanUserContent(
    sessionId,
    input.parsed.targetUserId,
    input.contentBan,
    input.parsed.media,
  );
  if (!r.ok) return targetErrorResponse(r.kind);
  return NextResponse.json({
    ok: true,
    actionId: r.actionId,
    voxCount: r.voxCount,
    commentCount: r.commentCount,
    fileCount: r.fileCount,
    blockedHashes: r.blockedHashes,
  });
};
