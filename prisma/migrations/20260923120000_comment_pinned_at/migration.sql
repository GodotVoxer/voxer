-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "pinnedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Comment_voxId_pinnedAt_idx" ON "Comment"("voxId", "pinnedAt");
