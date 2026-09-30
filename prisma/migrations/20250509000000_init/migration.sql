-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'UPLOADED_VIDEO', 'YOUTUBE');

-- CreateEnum
CREATE TYPE "AvatarVariant" AS ENUM ('BLUE', 'GREEN', 'RED', 'YELLOW', 'PINK', 'MULTICOLOR', 'MULTICOLOR_INVERTED', 'WHITE', 'BLACK');

-- CreateTable
CREATE TABLE "Vox" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "mediaUrl" TEXT,
    "thumbnailUrl" TEXT,
    "youtubeVideoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "publicTag" VARCHAR(8) NOT NULL,
    "voxId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "avatarVariant" "AvatarVariant" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vox_createdAt_idx" ON "Vox"("createdAt");

-- CreateIndex
CREATE INDEX "Vox_category_idx" ON "Vox"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Comment_publicTag_key" ON "Comment"("publicTag");

-- CreateIndex
CREATE INDEX "Comment_voxId_createdAt_id_idx" ON "Comment"("voxId", "createdAt", "id");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_voxId_fkey" FOREIGN KEY ("voxId") REFERENCES "Vox"("id") ON DELETE CASCADE ON UPDATE CASCADE;
