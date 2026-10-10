import { Prisma, type PrismaClient } from "@prisma/client";
import { HIDE_COMMAND_LINE_PATTERN } from "@/lib/comments/hideCommand";

/**
 * Recomputes `lastActivityAt` from the vox creation and its latest visible comment, so hiding a
 * comment flood drops the bumped vox back to where it was (and restoring it brings them back).
 * `>hide` comments never bumped the vox, so they do not count here either.
 */
export const recomputeVoxLastActivity = async (
  db: PrismaClient | Prisma.TransactionClient,
  voxIds: readonly string[],
): Promise<void> => {
  const ids = [...new Set(voxIds)];
  if (ids.length === 0) return;
  await db.$executeRaw`
    UPDATE "Vox" AS v
    SET "lastActivityAt" = GREATEST(
      v."createdAt",
      COALESCE(
        (SELECT MAX(c."createdAt") FROM "Comment" c
          WHERE c."voxId" = v."id" AND c."deletedAt" IS NULL
            AND c."body" !~* ${HIDE_COMMAND_LINE_PATTERN}),
        v."createdAt"
      )
    )
    WHERE v."id" IN (${Prisma.join(ids)})`;
};
