import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import {
  dbUnavailableMessageEs,
  internalErrorMessageEs,
  isDbConfigured,
  jsonError,
  readJsonBody,
  voxNotFound,
  zodToMessage,
} from "@/server/http/apiErrors";
import { userActionRateLimitResponse } from "@/server/http/userActionRateLimit";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { castPollVote } from "@/server/vox/castPollVote";

const bodySchema = z.object({
  optionId: z.string().min(1),
});

type Params = {
  params: Promise<{ id: string }>;
};

export const POST = async (req: Request, { params }: Params) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const { id: voxId } = await params;
  const userId = await getSessionUserIdFromCookies();
  if (!userId) {
    return jsonError("Tenés que iniciar sesión para votar.", 401);
  }
  const limited = await userActionRateLimitResponse(userId, "pollVote");
  if (limited) return limited;
  const jsonBody = await readJsonBody(req);
  if ("error" in jsonBody) return jsonBody.error;
  const body = jsonBody.body;
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) return jsonError(zodToMessage(e), 400);
    return jsonError(internalErrorMessageEs(), 500);
  }

  const result = await castPollVote(voxId, userId, parsed.optionId);
  if (!result.ok) {
    if (result.kind === "not_found") return voxNotFound();
    if (result.kind === "no_poll") return jsonError("Este vox no tiene encuesta.", 400);
    if (result.kind === "invalid_option") return jsonError("Opción inválida.", 400);
    if (result.kind === "already_voted") {
      return jsonError(result.message ?? "Ya votaste.", 409);
    }
    return jsonError("No se pudo registrar el voto", 500);
  }
  return NextResponse.json({ poll: result.poll });
};
