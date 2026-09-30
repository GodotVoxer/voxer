import { Prisma, type Vox } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

export type VoxDetailApi = Vox & {
  following: boolean;
  hidden: boolean;
  favorited: boolean;
  isOwner: boolean;
};

export const withViewerFlags = async (
  vox: Vox,
  sessionUserId: string | null,
): Promise<VoxDetailApi> => {
  if (!sessionUserId) {
    return { ...vox, following: false, hidden: false, favorited: false, isOwner: false };
  }

  const [flags] = await prisma.$queryRaw<
    { following: boolean; hidden: boolean; favorited: boolean }[]
  >(Prisma.sql`
    SELECT
      EXISTS(SELECT 1 FROM "VoxFollow" WHERE "userId" = ${sessionUserId} AND "voxId" = ${vox.id}) AS following,
      EXISTS(SELECT 1 FROM "VoxHide" WHERE "userId" = ${sessionUserId} AND "voxId" = ${vox.id}) AS hidden,
      EXISTS(SELECT 1 FROM "VoxFavorite" WHERE "userId" = ${sessionUserId} AND "voxId" = ${vox.id}) AS favorited
  `);

  return {
    ...vox,
    following: flags?.following ?? false,
    hidden: flags?.hidden ?? false,
    favorited: flags?.favorited ?? false,
    isOwner: vox.ownerId === sessionUserId,
  };
};
