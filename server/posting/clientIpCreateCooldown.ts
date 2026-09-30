import type { Prisma } from "@prisma/client";
import { COMMENT_CREATE_INTERVAL_MS, VOX_CREATE_INTERVAL_MS } from "@/lib/limits";
import { PostingRateLimitError } from "@/server/posting/postingRateLimitError";

export const assertVoxCreateClientIpCooldown = async (
  tx: Prisma.TransactionClient,
  args: { clientIpHash: string; now: Date },
): Promise<void> => {
  const recent = await tx.vox.findFirst({
    where: { clientIpHash: args.clientIpHash },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (recent) {
    const elapsed = args.now.getTime() - recent.createdAt.getTime();
    const remainingMs = VOX_CREATE_INTERVAL_MS - elapsed;
    if (remainingMs > 0) {
      throw new PostingRateLimitError("vox_ip", Math.max(1, remainingMs));
    }
  }
};

export const assertCommentCreateClientIpCooldown = async (
  tx: Prisma.TransactionClient,
  args: { clientIpHash: string; now: Date },
): Promise<void> => {
  const recent = await tx.comment.findFirst({
    where: { clientIpHash: args.clientIpHash },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (recent) {
    const elapsed = args.now.getTime() - recent.createdAt.getTime();
    const remainingMs = COMMENT_CREATE_INTERVAL_MS - elapsed;
    if (remainingMs > 0) {
      throw new PostingRateLimitError("comment_ip", Math.max(1, remainingMs));
    }
  }
};
