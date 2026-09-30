import type { ClientIpBan } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

export const getActiveClientIpBanForHash = async (ipHash: string): Promise<ClientIpBan | null> => {
  const now = new Date();
  return prisma.clientIpBan.findFirst({
    where: {
      ipHash,
      revokedAt: null,
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
  });
};
