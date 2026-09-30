import type { ClientIpBan, UserBan } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

export const getActiveBanForUser = async (userId: string): Promise<UserBan | null> => {
  const now = new Date();
  return prisma.userBan.findFirst({
    where: {
      targetUserId: userId,
      revokedAt: null,
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
  });
};

export type BanApiPayload = {
  id: string;
  /** `network` bans the connection rather than the account trying to post. */
  scope: "account" | "network";
  reason: string;
  createdAt: string;
  endsAt: string | null;
};

export const banToApiPayload = (b: UserBan): BanApiPayload => ({
  id: b.id,
  scope: "account",
  reason: b.reason,
  createdAt: b.createdAt.toISOString(),
  endsAt: b.endsAt?.toISOString() ?? null,
});

export const clientIpBanToApiPayload = (b: ClientIpBan): BanApiPayload => ({
  id: b.id,
  scope: "network",
  reason: b.reason,
  createdAt: b.createdAt.toISOString(),
  endsAt: b.endsAt?.toISOString() ?? null,
});
