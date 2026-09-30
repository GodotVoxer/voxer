import type { NextResponse } from "next/server";
import { UPLOAD_SERVICE_UNAVAILABLE_ES } from "@/lib/media/uploadUnavailable";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { isDbConfigured, jsonError } from "@/server/http/apiErrors";
import { withinRateLimit, type RateLimitName } from "@/server/http/rateLimits";
import { requestClientIp } from "@/server/http/requestIp";
import {
  getPostingBlockForUser,
  postingBlockResponse,
} from "@/server/moderation/postingEligibility";
import { isR2StorageFullyConfigured } from "@/server/storage/r2Env";

type UploadGuardOptions = {
  rateLimit: RateLimitName;
  /** Direct-to-bucket routes cannot fall back to local disk. */
  requiresBucket: boolean;
};

/** Checks shared by every upload route, in order: service, session, rate limit, posting ban. */
export const guardUploadRequest = async (
  req: Request,
  { rateLimit, requiresBucket }: UploadGuardOptions,
): Promise<{ userId: string; ip: string } | { error: NextResponse }> => {
  if (!isDbConfigured() || (requiresBucket && !isR2StorageFullyConfigured())) {
    return { error: jsonError(UPLOAD_SERVICE_UNAVAILABLE_ES, 503) };
  }
  const userId = await getSessionUserIdFromCookies();
  if (!userId) {
    return { error: jsonError("Tenés que iniciar sesión para subir archivos.", 401) };
  }
  const ip = requestClientIp(req);
  if (!(await withinRateLimit(rateLimit, ip))) {
    return { error: jsonError("Demasiadas subidas. Probá más tarde.", 429) };
  }
  const postingBlock = await getPostingBlockForUser(userId, ip);
  if (postingBlock) return { error: postingBlockResponse(postingBlock) };
  return { userId, ip };
};
