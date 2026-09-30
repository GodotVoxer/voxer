CREATE TYPE "StoredMediaKind" AS ENUM ('IMAGE', 'UPLOADED_VIDEO');

CREATE TABLE "StoredMediaByHash" (
    "id" TEXT NOT NULL,
    "sha256Hex" VARCHAR(64) NOT NULL,
    "kind" "StoredMediaKind" NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "mimeType" VARCHAR(120),
    "blockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredMediaByHash_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StoredMediaByHash_sha256Hex_key" ON "StoredMediaByHash"("sha256Hex");

CREATE INDEX "StoredMediaByHash_blockedAt_idx" ON "StoredMediaByHash"("blockedAt");
