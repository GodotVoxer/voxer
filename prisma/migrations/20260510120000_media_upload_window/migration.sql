-- Ventana de subidas de multimedia por usuario (anti-abuso de storage)
ALTER TABLE "User" ADD COLUMN "mediaUploadWindowStartAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "mediaUploadCountInWindow" INTEGER NOT NULL DEFAULT 0;
