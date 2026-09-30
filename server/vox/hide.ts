import { prisma } from "@/server/db/prisma";
export const setVoxHidden = async (userId: string, voxId: string): Promise<boolean> => {
  const vox = await prisma.vox.findFirst({
    where: { id: voxId, deletedAt: null },
    select: { id: true },
  });
  if (!vox) return false;
  await prisma.voxHide.upsert({
    where: { userId_voxId: { userId, voxId } },
    create: { userId, voxId },
    update: {},
  });
  return true;
};
export const clearVoxHide = async (userId: string, voxId: string): Promise<void> => {
  await prisma.voxHide.deleteMany({ where: { userId, voxId } });
};
