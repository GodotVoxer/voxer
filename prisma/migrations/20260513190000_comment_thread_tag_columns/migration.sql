-- Denormaliza tag de hilo en el comentario (se rellena al crear; backfill desde identidades existentes).

ALTER TABLE "Comment" ADD COLUMN "threadTag" VARCHAR(3),
ADD COLUMN "threadBadgeHue" INTEGER;

UPDATE "Comment" AS c
SET "threadTag" = ti."tag",
    "threadBadgeHue" = ti."badgeHue"
FROM "VoxThreadIdentity" AS ti
WHERE c."authorId" = ti."authorId"
  AND c."voxId" = ti."voxId"
  AND c."authorId" IS NOT NULL;
