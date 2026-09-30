-- Tokens FCM por instalación: el token identifica al dispositivo, no al usuario.
CREATE TYPE "PushPlatform" AS ENUM ('ANDROID', 'IOS', 'WEB');

CREATE TABLE "PushDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" VARCHAR(512) NOT NULL,
    "platform" "PushPlatform" NOT NULL DEFAULT 'ANDROID',
    "appVersion" VARCHAR(32),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failureCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PushDevice_pkey" PRIMARY KEY ("id")
);

-- Unicidad global (no por usuario): al cambiar de cuenta en el mismo teléfono la fila se reasigna.
CREATE UNIQUE INDEX "PushDevice_token_key" ON "PushDevice"("token");

CREATE INDEX "PushDevice_userId_idx" ON "PushDevice"("userId");

CREATE INDEX "PushDevice_lastSeenAt_idx" ON "PushDevice"("lastSeenAt");

ALTER TABLE "PushDevice" ADD CONSTRAINT "PushDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
