import { prisma } from "@/server/db/prisma";
export const setVoxFollowed = async (userId: string, voxId: string): Promise<boolean> => {
  const vox = await prisma.vox.findFirst({
    where: { id: voxId, deletedAt: null },
    select: { id: true },
  });
  if (!vox) return false;
  await prisma.voxFollow.upsert({
    where: { userId_voxId: { userId, voxId } },
    create: { userId, voxId },
    update: {},
  });
  return true;
};
export const clearVoxFollow = async (userId: string, voxId: string): Promise<void> => {
  await prisma.voxFollow.deleteMany({ where: { userId, voxId } });
};
