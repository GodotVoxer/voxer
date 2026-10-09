-- Hidden comments no longer count as activity: drop the vox a deleted flood bumped.
UPDATE "Vox" AS v
SET "lastActivityAt" = a."lastActivityAt"
FROM (
  SELECT
    v2."id",
    GREATEST(
      v2."createdAt",
      COALESCE(
        (SELECT MAX(c."createdAt") FROM "Comment" c WHERE c."voxId" = v2."id" AND c."deletedAt" IS NULL),
        v2."createdAt"
      )
    ) AS "lastActivityAt"
  FROM "Vox" v2
) AS a
WHERE a."id" = v."id" AND a."lastActivityAt" < v."lastActivityAt";
