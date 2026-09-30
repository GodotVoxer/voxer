import { NextResponse, after } from "next/server";
import { verifySessionJwt } from "@/server/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { cookies } from "next/headers";
import { bumpUserSessionVersion } from "@/server/auth/sessionVersion";
import { clearSessionCookie } from "@/server/auth/sessionCookie";
import { deleteAllPushDevicesForUser } from "@/server/push/devices";

export const POST = async () => {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const payload = await verifySessionJwt(token);
    if (payload) {
      await bumpUserSessionVersion(payload.userId);
      // Bumping `sessionVersion` ends the session everywhere: no device may keep receiving push.
      const userId = payload.userId;
      after(() => deleteAllPushDevicesForUser(userId).catch(() => {}));
    }
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
};
