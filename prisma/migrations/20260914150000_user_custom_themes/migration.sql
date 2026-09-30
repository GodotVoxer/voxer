-- Temas personalizados por usuario: base incluida + overrides de color (hex validados) + fondo de vox estructurado.
ALTER TYPE "ThemeMode" ADD VALUE 'CUSTOM';

CREATE TYPE "ThemeBase" AS ENUM ('DARK', 'LIGHT');

CREATE TABLE "UserTheme" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "base" "ThemeBase" NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "overrides" JSONB NOT NULL,
    "voxBackground" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTheme_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "User" ADD COLUMN "activeCustomThemeId" TEXT;

CREATE INDEX "UserTheme_userId_idx" ON "UserTheme"("userId");

ALTER TABLE "UserTheme" ADD CONSTRAINT "UserTheme_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User" ADD CONSTRAINT "User_activeCustomThemeId_fkey" FOREIGN KEY ("activeCustomThemeId") REFERENCES "UserTheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
