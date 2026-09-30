import { SignJWT, jwtVerify } from "jose";
import { SESSION_TTL_SEC, SOCKET_JOIN_TTL_SEC } from "@/lib/auth/constants";

export const getAuthSecretKey = (): Uint8Array => {
  const raw = process.env.AUTH_SECRET?.trim();
  if (!raw || raw.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters long");
  }
  return new TextEncoder().encode(raw);
};

export type SessionTokenPayload = {
  userId: string;
  typ: "session";
  sessionVersion: number;
  /** Expiry in epoch seconds; `/api/auth/me` uses it to slide the session. */
  expiresAtSec: number;
};

export const signSessionJwt = async (userId: string, sessionVersion: number): Promise<string> => {
  const key = getAuthSecretKey();
  return new SignJWT({ typ: "session" as const, sv: sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SEC}s`)
    .sign(key);
};

export const verifySessionJwt = async (token: string): Promise<SessionTokenPayload | null> => {
  try {
    const key = getAuthSecretKey();
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (payload.typ !== "session" || typeof payload.sub !== "string") return null;
    const sv = payload.sv;
    if (typeof sv !== "number" || !Number.isInteger(sv) || sv < 0) return null;
    if (typeof payload.exp !== "number") return null;
    return {
      userId: payload.sub,
      typ: "session",
      sessionVersion: sv,
      expiresAtSec: payload.exp,
    };
  } catch {
    return null;
  }
};

export const signSocketJoinJwt = async (userId: string): Promise<string> => {
  const key = getAuthSecretKey();
  return new SignJWT({ typ: "socket" as const })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SOCKET_JOIN_TTL_SEC}s`)
    .sign(key);
};
