import { NextResponse } from "next/server";
import { isAuthSecretConfigured } from "@/server/auth/env";
import { isDbConfigured, jsonError, dbUnavailableMessageEs } from "@/server/http/apiErrors";
import { getMeForUserId } from "@/server/auth/me";
import { getSessionFromCookies, refreshSessionCookieIfStale } from "@/server/auth/sessionCookie";
export const GET = async () => {
  if (!isDbConfigured()) {
    return jsonError(dbUnavailableMessageEs(), 503);
  }
  if (!isAuthSecretConfigured()) {
    return NextResponse.json({ user: null });
  }
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ user: null });
  }
  // The app calls this on every foreground: the natural point to extend the session.
  await refreshSessionCookieIfStale(session);
  const user = await getMeForUserId(session.userId);
  if (!user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({ user });
};
