ALTER TABLE "UserThemeAsset"
ADD COLUMN "shareId" VARCHAR(32);

CREATE UNIQUE INDEX "UserThemeAsset_shareId_key" ON "UserThemeAsset"("shareId");
