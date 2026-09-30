import { prisma } from "@/server/db/prisma";

export const getUserSessionVersion = async (userId: string): Promise<number> => {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { sessionVersion: true },
  });
  return row?.sessionVersion ?? 0;
};

export const bumpUserSessionVersion = async (userId: string): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
  });
};
