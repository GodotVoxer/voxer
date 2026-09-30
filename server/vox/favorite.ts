import { prisma } from "@/server/db/prisma";

export const setVoxFavorite = async (userId: string, voxId: string): Promise<boolean> => {
  const vox = await prisma.vox.findFirst({
    where: { id: voxId, deletedAt: null },
    select: { id: true },
  });
  if (!vox) return false;
  await prisma.voxFavorite.upsert({
    where: { userId_voxId: { userId, voxId } },
    create: { userId, voxId },
    update: {},
  });
  return true;
};

export const clearVoxFavorite = async (userId: string, voxId: string): Promise<void> => {
  await prisma.voxFavorite.deleteMany({ where: { userId, voxId } });
};
