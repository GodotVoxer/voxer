-- AlterTable
ALTER TABLE "Vox" ADD COLUMN "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Vox" AS v
SET "lastActivityAt" = GREATEST(
  v."createdAt",
  COALESCE(
    (SELECT MAX(c."createdAt") FROM "Comment" c WHERE c."voxId" = v."id"),
    v."createdAt"
  )
);

-- CreateIndex
CREATE INDEX "Vox_lastActivityAt_idx" ON "Vox"("lastActivityAt");
