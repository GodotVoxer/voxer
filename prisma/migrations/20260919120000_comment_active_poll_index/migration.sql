DROP INDEX IF EXISTS "Comment_voxId_createdAt_id_idx";

CREATE INDEX "Comment_voxId_deletedAt_createdAt_id_idx"
ON "Comment"("voxId", "deletedAt", "createdAt", "id");
