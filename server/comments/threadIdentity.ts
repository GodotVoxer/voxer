import type { Prisma } from "@prisma/client";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const ensureVoxThreadIdentity = async (
  tx: Prisma.TransactionClient,
  voxId: string,
  authorId: string,
): Promise<{ tag: string; badgeHue: number }> => {
  const existing = await tx.voxThreadIdentity.findUnique({
    where: { voxId_authorId: { voxId, authorId } },
  });
  if (existing) {
    return { tag: existing.tag, badgeHue: existing.badgeHue };
  }
  for (let tries = 0; tries < 48; tries++) {
    let tag = "";
    for (let i = 0; i < 3; i++) {
      tag += CHARSET[Math.floor(Math.random() * CHARSET.length)]!;
    }
    const clash = await tx.voxThreadIdentity.findUnique({
      where: { voxId_tag: { voxId, tag } },
    });
    if (clash) continue;
    const badgeHue = Math.floor(Math.random() * 360);
    await tx.voxThreadIdentity.create({
      data: { voxId, authorId, tag, badgeHue },
    });
    return { tag, badgeHue };
  }
  throw new Error("vox_thread_tag_exhausted");
};
