-- IP de registro: se guarda solo el HMAC (la columna en claro queda nullable hasta correr el backfill).
ALTER TABLE "User" ADD COLUMN "registrationIpHash" VARCHAR(64);
ALTER TABLE "User" ALTER COLUMN "registrationIp" DROP NOT NULL;
CREATE INDEX "User_registrationIpHash_idx" ON "User"("registrationIpHash");

-- Ventana de gracia para la limpieza de multimedia sin referencias (subidas aún no publicadas).
ALTER TABLE "StoredMediaByHash" ADD COLUMN "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "StoredMediaByHash_lastUsedAt_idx" ON "StoredMediaByHash"("lastUsedAt");
