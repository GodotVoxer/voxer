-- Imágenes de fondo de vox subidas por el usuario (re-encodadas a WebP, visibles solo para su dueño).
CREATE TABLE "UserThemeAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "objectKeySm" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sha256Hex" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserThemeAsset_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "UserTheme" ADD COLUMN "backgroundAssetId" TEXT;

CREATE UNIQUE INDEX "UserThemeAsset_objectKey_key" ON "UserThemeAsset"("objectKey");

CREATE UNIQUE INDEX "UserThemeAsset_objectKeySm_key" ON "UserThemeAsset"("objectKeySm");

CREATE INDEX "UserThemeAsset_userId_idx" ON "UserThemeAsset"("userId");

CREATE INDEX "UserThemeAsset_userId_sha256Hex_idx" ON "UserThemeAsset"("userId", "sha256Hex");

CREATE INDEX "UserTheme_backgroundAssetId_idx" ON "UserTheme"("backgroundAssetId");

ALTER TABLE "UserThemeAsset" ADD CONSTRAINT "UserThemeAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserTheme" ADD CONSTRAINT "UserTheme_backgroundAssetId_fkey" FOREIGN KEY ("backgroundAssetId") REFERENCES "UserThemeAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
