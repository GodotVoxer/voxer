import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { PushPlatform } from "@prisma/client";
import {
  dbUnavailableMessageEs,
  internalErrorMessageEs,
  isDbConfigured,
  jsonError,
  readJsonBody,
  signInRequired,
  zodToMessage,
} from "@/server/http/apiErrors";
import { userActionRateLimitResponse } from "@/server/http/userActionRateLimit";
import { getSessionUserIdFromCookies } from "@/server/auth/sessionCookie";
import { registerPushDevice, unregisterPushDeviceToken } from "@/server/push/devices";
import { pushDeviceRegisterSchema, pushDeviceUnregisterSchema } from "@/server/push/deviceSchemas";

const PLATFORM_BY_INPUT: Record<"android" | "ios", Extract<PushPlatform, "ANDROID" | "IOS">> = {
  android: "ANDROID",
  ios: "IOS",
};

export const POST = async (req: Request) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const userId = await getSessionUserIdFromCookies();
  if (!userId) {
    return signInRequired();
  }
  const limited = await userActionRateLimitResponse(userId, "pushDevices");
  if (limited) return limited;
  const jsonBody = await readJsonBody(req);
  if ("error" in jsonBody) return jsonBody.error;
  const body = jsonBody.body;
  let parsed;
  try {
    parsed = pushDeviceRegisterSchema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) return jsonError(zodToMessage(e), 400);
    return jsonError(internalErrorMessageEs(), 500);
  }
  const res = await registerPushDevice(
    parsed.platform === "web" || parsed.platform === "unifiedpush"
      ? {
          userId,
          platform: parsed.platform === "web" ? "WEB" : "UNIFIED_PUSH",
          endpoint: parsed.subscription.endpoint,
          ...parsed.subscription.keys,
          appVersion: parsed.platform === "unifiedpush" ? (parsed.appVersion ?? null) : null,
        }
      : {
          userId,
          platform: PLATFORM_BY_INPUT[parsed.platform],
          token: parsed.token,
          appVersion: parsed.appVersion ?? null,
        },
  );
  if (!res.ok) {
    return jsonError("Token de dispositivo inválido", 400);
  }
  return NextResponse.json({ ok: true });
};

export const DELETE = async (req: Request) => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  const userId = await getSessionUserIdFromCookies();
  if (!userId) {
    return signInRequired();
  }
  const limited = await userActionRateLimitResponse(userId, "pushDevices");
  if (limited) return limited;
  const jsonBody = await readJsonBody(req);
  if ("error" in jsonBody) return jsonBody.error;
  const body = jsonBody.body;
  let parsed;
  try {
    parsed = pushDeviceUnregisterSchema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) return jsonError(zodToMessage(e), 400);
    return jsonError(internalErrorMessageEs(), 500);
  }
  const removed = await unregisterPushDeviceToken(userId, parsed.token);
  return NextResponse.json({ ok: true, removed });
};
