-- CreateEnum
CREATE TYPE "CommentStaffBadge" AS ENUM ('MOD', 'ADMIN');

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN "staffBadge" "CommentStaffBadge";
