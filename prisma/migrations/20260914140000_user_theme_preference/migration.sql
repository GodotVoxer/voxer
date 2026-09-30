-- Preferencia de tema por usuario (fuente de verdad entre dispositivos; localStorage es solo caché).
CREATE TYPE "ThemeMode" AS ENUM ('DARK', 'LIGHT', 'SYSTEM');

ALTER TABLE "User"
  ADD COLUMN "themeMode" "ThemeMode" NOT NULL DEFAULT 'DARK',
  ADD COLUMN "themeUpdatedAt" TIMESTAMP(3);
