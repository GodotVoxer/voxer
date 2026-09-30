-- Cooldown de creación por huella de IP (consulta último createdAt por clientIpHash).
CREATE INDEX "Vox_clientIpHash_createdAt_idx" ON "Vox"("clientIpHash", "createdAt");
CREATE INDEX "Comment_clientIpHash_createdAt_idx" ON "Comment"("clientIpHash", "createdAt");
