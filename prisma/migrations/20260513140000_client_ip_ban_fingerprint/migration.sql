-- Huella HMAC de IP (nunca IP en claro) + bloqueos por huella para moderación.
ALTER TABLE "Vox" ADD COLUMN "clientIpHash" VARCHAR(64);
ALTER TABLE "Comment" ADD COLUMN "clientIpHash" VARCHAR(64);

CREATE TABLE "ClientIpBan" (
    "id" TEXT NOT NULL,
    "ipHash" VARCHAR(64) NOT NULL,
    "moderatorUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,

    CONSTRAINT "ClientIpBan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientIpBan_ipHash_revokedAt_endsAt_idx" ON "ClientIpBan"("ipHash", "revokedAt", "endsAt");
CREATE INDEX "ClientIpBan_moderatorUserId_idx" ON "ClientIpBan"("moderatorUserId");

ALTER TABLE "ClientIpBan" ADD CONSTRAINT "ClientIpBan_moderatorUserId_fkey" FOREIGN KEY ("moderatorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientIpBan" ADD CONSTRAINT "ClientIpBan_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
