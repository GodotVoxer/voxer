-- Dedupe estable por vox vs comentario (evita NULL en UNIQUE de PostgreSQL).
ALTER TABLE "Report" ADD COLUMN "reportDedupeKey" TEXT;
ALTER TABLE "Report" ADD COLUMN "reporterIpHash" VARCHAR(64);

UPDATE "Report"
SET "reportDedupeKey" = CASE
  WHEN "commentId" IS NULL THEN 'v:' || "voxId"
  ELSE 'c:' || "commentId"
END;

DELETE FROM "Report" AS a
USING "Report" AS b
WHERE a."reportDedupeKey" = b."reportDedupeKey"
  AND a."reporterUserId" = b."reporterUserId"
  AND a."reason" = b."reason"
  AND (
    b."createdAt" < a."createdAt"
    OR (b."createdAt" = a."createdAt" AND b."id" < a."id")
  );

-- Filas existentes: huella sintética por fila (sin pgcrypto: `digest` no existe en Neon por defecto).
-- No coincide con HMAC de IP de la app; las nuevas usan `hashClientIpFromRawHeaderValue`.
UPDATE "Report"
SET "reporterIpHash" = md5("id") || md5("id" || 'voxer_report_legacy_row')
WHERE "reporterIpHash" IS NULL;

ALTER TABLE "Report" ALTER COLUMN "reportDedupeKey" SET NOT NULL;
ALTER TABLE "Report" ALTER COLUMN "reporterIpHash" SET NOT NULL;

CREATE UNIQUE INDEX "Report_reporterUserId_reportDedupeKey_reason_key" ON "Report" (
  "reporterUserId",
  "reportDedupeKey",
  "reason"
);

CREATE UNIQUE INDEX "Report_reporterIpHash_reportDedupeKey_reason_key" ON "Report" (
  "reporterIpHash",
  "reportDedupeKey",
  "reason"
);
