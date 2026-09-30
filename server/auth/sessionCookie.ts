import { cookies } from "next/headers";
import { prisma } from "@/server/db/prisma";
import { SESSION_COOKIE_NAME, SESSION_TTL_SEC } from "@/lib/auth/constants";
import { signSessionJwt, verifySessionJwt } from "@/server/auth/jwt";
import { getUserSessionVersion } from "@/server/auth/sessionVersion";
import { shouldRefreshSessionCookie } from "@/lib/auth/slidingSession";

const secureCookie = (): boolean => {
  return process.env.NODE_ENV === "production";
};

export type ActiveSession = { userId: string; expiresAtSec: number };

export const getSessionFromCookies = async (): Promise<ActiveSession | null> => {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifySessionJwt(token);
  if (!payload) return null;
  const row = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { sessionVersion: true },
  });
  if (!row || row.sessionVersion !== payload.sessionVersion) return null;
  return { userId: payload.userId, expiresAtSec: payload.expiresAtSec };
};

export const getSessionUserIdFromCookies = async (): Promise<string | null> =>
  (await getSessionFromCookies())?.userId ?? null;

/**
 * Renews the cookie once it is past half its lifetime. Route handlers only: Server Components
 * cannot write cookies.
 */
export const refreshSessionCookieIfStale = async (session: ActiveSession): Promise<void> => {
  const nowSec = Math.floor(Date.now() / 1000);
  if (!shouldRefreshSessionCookie(session.expiresAtSec, nowSec)) return;
  await setSessionCookie(session.userId);
};

export const setSessionCookie = async (userId: string): Promise<void> => {
  const sessionVersion = await getUserSessionVersion(userId);
  const token = await signSessionJwt(userId, sessionVersion);
  (await cookies()).set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
};

export const clearSessionCookie = async (): Promise<void> => {
  (await cookies()).set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
};
