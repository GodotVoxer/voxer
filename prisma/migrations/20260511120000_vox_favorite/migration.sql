-- CreateTable
CREATE TABLE "VoxFavorite" (
    "userId" TEXT NOT NULL,
    "voxId" TEXT NOT NULL,

    CONSTRAINT "VoxFavorite_pkey" PRIMARY KEY ("userId","voxId")
);

-- CreateIndex
CREATE INDEX "VoxFavorite_userId_idx" ON "VoxFavorite"("userId");

-- CreateIndex
CREATE INDEX "VoxFavorite_voxId_idx" ON "VoxFavorite"("voxId");

-- AddForeignKey
ALTER TABLE "VoxFavorite" ADD CONSTRAINT "VoxFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoxFavorite" ADD CONSTRAINT "VoxFavorite_voxId_fkey" FOREIGN KEY ("voxId") REFERENCES "Vox"("id") ON DELETE CASCADE ON UPDATE CASCADE;
