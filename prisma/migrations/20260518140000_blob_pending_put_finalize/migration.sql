-- CreateTable
CREATE TABLE "BlobPendingPutFinalize" (
    "pathname" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlobPendingPutFinalize_pkey" PRIMARY KEY ("pathname")
);

-- CreateIndex
CREATE INDEX "BlobPendingPutFinalize_userId_idx" ON "BlobPendingPutFinalize"("userId");

-- CreateIndex
CREATE INDEX "BlobPendingPutFinalize_expiresAt_idx" ON "BlobPendingPutFinalize"("expiresAt");
