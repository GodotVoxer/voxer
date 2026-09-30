import { prisma } from "@/server/db/prisma";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { normalizeUsername } from "@/server/auth/username";
export type LoginInput = {
  username: string;
  password: string;
};
export type LoginResult =
  | {
      ok: true;
      userId: string;
    }
  | {
      ok: false;
      message: string;
      status: number;
    };

const INVALID_CREDENTIALS_ES = "Usuario o contraseña incorrectos.";

let dummyHashPromise: Promise<string> | undefined;

/** Makes a missing user as slow as a wrong password, so timing cannot enumerate usernames. */
const burnPasswordVerification = async (plain: string): Promise<void> => {
  dummyHashPromise ??= hashPassword("voxer-login-timing-equalizer");
  await verifyPassword(await dummyHashPromise, plain);
};

export const loginUser = async (input: LoginInput): Promise<LoginResult> => {
  const username = normalizeUsername(input.username);
  if (!username) {
    await burnPasswordVerification(input.password);
    return { ok: false, message: INVALID_CREDENTIALS_ES, status: 401 };
  }
  const user = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true, passwordHash: true },
  });
  if (!user) {
    await burnPasswordVerification(input.password);
    return { ok: false, message: INVALID_CREDENTIALS_ES, status: 401 };
  }
  const ok = await verifyPassword(user.passwordHash, input.password);
  if (!ok) {
    return { ok: false, message: INVALID_CREDENTIALS_ES, status: 401 };
  }
  return { ok: true, userId: user.id };
};
