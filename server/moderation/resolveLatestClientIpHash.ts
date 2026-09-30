import { prisma } from "@/server/db/prisma";

/** Network fingerprint of the account's latest vox or comment that has one. */
export const resolveLatestClientIpHashForUser = async (
  targetUserId: string,
): Promise<string | null> => {
  const [latestComment, latestVox] = await Promise.all([
    prisma.comment.findFirst({
      where: { authorId: targetUserId, clientIpHash: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { clientIpHash: true, createdAt: true },
    }),
    prisma.vox.findFirst({
      where: { ownerId: targetUserId, clientIpHash: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { clientIpHash: true, createdAt: true },
    }),
  ]);
  const ch = latestComment?.clientIpHash;
  const vh = latestVox?.clientIpHash;
  if (!ch && !vh) return null;
  if (!ch) return vh!;
  if (!vh) return ch;
  return latestComment!.createdAt >= latestVox!.createdAt ? ch : vh;
};
