import { prisma } from "@/server/db/prisma";
import { hashClientIpFromRawHeaderValue } from "@/server/http/clientIpHash";
import { acceptedRulesData } from "@/server/auth/communityRules";
import { hashPassword } from "@/server/auth/password";
import { normalizeUsername } from "@/server/auth/username";
const MAX_ACCOUNTS_PER_IP = 5;
export type RegisterInput = {
  username: string;
  password: string;
  registrationIp: string;
};
export type RegisterResult =
  | {
      ok: true;
      userId: string;
    }
  | {
      ok: false;
      message: string;
      status: number;
    };
export const registerUser = async (input: RegisterInput): Promise<RegisterResult> => {
  const username = normalizeUsername(input.username);
  if (!username) {
    return { ok: false, message: "Usuario inválido", status: 400 };
  }
  let registrationIpHash: string;
  try {
    registrationIpHash = hashClientIpFromRawHeaderValue(input.registrationIp);
  } catch (e) {
    console.error("[auth:register]", e instanceof Error ? e.message : e);
    return { ok: false, message: "Servicio no disponible. Probá más tarde.", status: 503 };
  }
  const count = await prisma.user.count({
    where: {
      // Accounts created before the hash backfill still carry the plain `registrationIp`.
      OR: [{ registrationIpHash }, { registrationIp: input.registrationIp }],
    },
  });
  if (count >= MAX_ACCOUNTS_PER_IP) {
    return {
      ok: false,
      message: "Ya se registraron demasiadas cuentas desde esta red.",
      status: 403,
    };
  }
  const taken = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true },
  });
  if (taken) {
    return { ok: false, message: "Ese nombre de usuario ya está en uso.", status: 409 };
  }
  const hash = await hashPassword(input.password);
  try {
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: hash,
        registrationIpHash,
        ...acceptedRulesData(),
      },
    });
    return { ok: true, userId: user.id };
  } catch {
    return { ok: false, message: "Ese nombre de usuario ya está en uso.", status: 409 };
  }
};
