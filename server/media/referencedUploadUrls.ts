import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

export const fetchReferencedUploadUrlSet = async (
  db: PrismaClient = prisma,
): Promise<Set<string>> => {
  const rows = await db.$queryRaw<Array<{ col: string }>>`
    SELECT DISTINCT col
    FROM (
      SELECT "mediaUrl" AS col FROM "Vox" WHERE "mediaUrl" IS NOT NULL AND "mediaUrl" <> ''
      UNION ALL
      SELECT "thumbnailUrl" AS col FROM "Vox" WHERE "thumbnailUrl" IS NOT NULL AND "thumbnailUrl" <> ''
      UNION ALL
      SELECT "imageUrl" AS col FROM "Comment" WHERE "imageUrl" IS NOT NULL AND "imageUrl" <> ''
      UNION ALL
      SELECT "videoPosterUrl" AS col FROM "Comment" WHERE "videoPosterUrl" IS NOT NULL AND "videoPosterUrl" <> ''
    ) AS u
  `;
  return new Set(rows.map((r) => r.col));
};
