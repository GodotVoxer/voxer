-- Dedupe de denuncias solo por usuario: por huella de IP bloqueaba a usuarios distintos detrás de la misma red (CGNAT).
DROP INDEX "Report_reporterIpHash_reportDedupeKey_reason_key";
