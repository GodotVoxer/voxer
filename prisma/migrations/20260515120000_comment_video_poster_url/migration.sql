-- Miniatura/fotograma para videos nativos en comentarios (carga diferida en UI).
ALTER TABLE "Comment" ADD COLUMN "videoPosterUrl" TEXT;
