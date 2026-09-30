-- AlterEnum
ALTER TYPE "ModerationActionType" ADD VALUE 'EDIT_COMMENT';

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN "hideOpBadge" BOOLEAN NOT NULL DEFAULT false;
