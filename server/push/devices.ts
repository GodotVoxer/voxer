import { Prisma, type PushPlatform } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { PUSH_DEVICES_PER_USER_MAX } from "@/server/push/constants";
import { normalizeFcmToken } from "@/server/push/deviceToken";
import { normalizeWebPushSubscription } from "@/server/push/webPushSubscription";
import { isAllowedUnifiedPushEndpoint } from "@/server/push/unifiedPushEndpoint";

export type PushTarget = {
  token: string;
  userId: string;
  platform: PushPlatform;
  webP256dh: string | null;
  webAuth: string | null;
};

type RegisterInput =
  | { platform: "ANDROID" | "IOS"; token: string }
  | { platform: "WEB" | "UNIFIED_PUSH"; endpoint: string; p256dh: string; auth: string };

/** Web Push stores the endpoint in `token`; it identifies the installation (browser profile or app). */
const normalizeRegistration = (
  input: RegisterInput,
): { token: string; webP256dh: string | null; webAuth: string | null } | null => {
  if ("token" in input) {
    const token = normalizeFcmToken(input.token);
    return token ? { token, webP256dh: null, webAuth: null } : null;
  }
  const sub = normalizeWebPushSubscription(
    input,
    input.platform === "UNIFIED_PUSH" ? isAllowedUnifiedPushEndpoint : undefined,
  );
  return sub ? { token: sub.endpoint, webP256dh: sub.p256dh, webAuth: sub.auth } : null;
};

/**
 * Upserts by `token`, not `(userId, token)`: the token identifies the installation, so when another
 * account signs in on the same phone the row changes hands instead of delivering to the old user.
 */
export const registerPushDevice = async (
  input: RegisterInput & { userId: string; appVersion?: string | null },
): Promise<{ ok: true } | { ok: false; kind: "invalid_token" }> => {
  const normalized = normalizeRegistration(input);
  if (!normalized) return { ok: false, kind: "invalid_token" };
  const { token, webP256dh, webAuth } = normalized;

  const appVersion = input.appVersion?.trim() || null;
  const update = {
    userId: input.userId,
    platform: input.platform,
    appVersion,
    webP256dh,
    webAuth,
    lastSeenAt: new Date(),
    failureCount: 0,
  };
  await prisma.$transaction(async (tx) => {
    try {
      await tx.pushDevice.upsert({
        where: { token },
        create: {
          userId: input.userId,
          token,
          platform: input.platform,
          appVersion,
          webP256dh,
          webAuth,
        },
        update,
      });
    } catch (e) {
      // Two concurrent registrations of the same token (two tabs, an app retry): the row exists.
      if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") throw e;
      await tx.pushDevice.update({ where: { token }, data: update });
    }
    // A looping client must not fill the table: keep the most recently seen devices.
    const extra = await tx.pushDevice.findMany({
      where: { userId: input.userId },
      orderBy: { lastSeenAt: "desc" },
      skip: PUSH_DEVICES_PER_USER_MAX,
      select: { id: true },
    });
    if (extra.length > 0) {
      await tx.pushDevice.deleteMany({ where: { id: { in: extra.map((d) => d.id) } } });
    }
  });
  return { ok: true };
};

/** Only the user's own row: nobody can unregister someone else's token. */
export const unregisterPushDeviceToken = async (userId: string, token: string): Promise<number> => {
  const r = await prisma.pushDevice.deleteMany({ where: { userId, token: token.trim() } });
  return r.count;
};

/** Logout bumps `sessionVersion`, ending every session, so no device may keep receiving. */
export const deleteAllPushDevicesForUser = async (userId: string): Promise<number> => {
  const r = await prisma.pushDevice.deleteMany({ where: { userId } });
  return r.count;
};

export const listPushTargetsForUserIds = async (
  userIds: readonly string[],
): Promise<PushTarget[]> => {
  if (userIds.length === 0) return [];
  return prisma.pushDevice.findMany({
    where: { userId: { in: [...userIds] } },
    select: { token: true, userId: true, platform: true, webP256dh: true, webAuth: true },
  });
};

export const deletePushTokens = async (tokens: readonly string[]): Promise<void> => {
  if (tokens.length === 0) return;
  await prisma.pushDevice.deleteMany({ where: { token: { in: [...tokens] } } });
};

export const bumpPushTokenFailures = async (tokens: readonly string[]): Promise<void> => {
  if (tokens.length === 0) return;
  await prisma.pushDevice.updateMany({
    where: { token: { in: [...tokens] } },
    data: { failureCount: { increment: 1 } },
  });
};
