-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REPLY_TO_COMMENT', 'COMMENT_ON_YOUR_VOX', 'COMMENT_ON_FOLLOWED_VOX');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "registrationIp" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVoxAt" TIMESTAMP(3),
    "lastCommentAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoxFollow" (
    "userId" TEXT NOT NULL,
    "voxId" TEXT NOT NULL,

    CONSTRAINT "VoxFollow_pkey" PRIMARY KEY ("userId","voxId")
);

-- CreateTable
CREATE TABLE "VoxHide" (
    "userId" TEXT NOT NULL,
    "voxId" TEXT NOT NULL,

    CONSTRAINT "VoxHide_pkey" PRIMARY KEY ("userId","voxId")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "voxId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "relatedCommentId" TEXT,
    "message" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "VoxFollow_voxId_idx" ON "VoxFollow"("voxId");

-- CreateIndex
CREATE INDEX "VoxHide_userId_idx" ON "VoxHide"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- AlterTable
ALTER TABLE "Vox" ADD COLUMN     "ownerId" TEXT;

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "authorId" TEXT;

-- CreateIndex
CREATE INDEX "Vox_ownerId_idx" ON "Vox"("ownerId");

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");

-- AddForeignKey
ALTER TABLE "Vox" ADD CONSTRAINT "Vox_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoxFollow" ADD CONSTRAINT "VoxFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoxFollow" ADD CONSTRAINT "VoxFollow_voxId_fkey" FOREIGN KEY ("voxId") REFERENCES "Vox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoxHide" ADD CONSTRAINT "VoxHide_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoxHide" ADD CONSTRAINT "VoxHide_voxId_fkey" FOREIGN KEY ("voxId") REFERENCES "Vox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_voxId_fkey" FOREIGN KEY ("voxId") REFERENCES "Vox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_relatedCommentId_fkey" FOREIGN KEY ("relatedCommentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
