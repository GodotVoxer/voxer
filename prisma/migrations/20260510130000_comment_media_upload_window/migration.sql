ALTER TABLE "User" ADD COLUMN "commentMediaUploadWindowStartAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "commentMediaUploadCountInWindow" INTEGER NOT NULL DEFAULT 0;
