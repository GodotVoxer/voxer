import { jwtVerify } from "jose";

/**
 * User id carried by a room token from `GET /api/auth/socket`, or null. Shared by the server and
 * the realtime Worker, which receives the secret from its own environment.
 */
export const verifySocketJoinToken = async (
  token: string,
  secret: Uint8Array,
): Promise<string | null> => {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    if (payload.typ !== "socket" || typeof payload.sub !== "string") return null;
    return payload.sub;
  } catch {
    return null;
  }
};
