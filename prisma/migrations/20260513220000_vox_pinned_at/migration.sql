-- AlterTable
ALTER TABLE "Vox" ADD COLUMN "pinnedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Vox_pinnedAt_idx" ON "Vox"("pinnedAt");
