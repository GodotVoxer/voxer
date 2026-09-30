-- El historial de comentarios propios pagina por (createdAt, id) filtrando por autor y vivos.
-- Con el índice suelto de `authorId` Postgres tenía que ordenar todo lo del usuario en cada página.
CREATE INDEX "Comment_authorId_deletedAt_createdAt_id_idx"
  ON "Comment" ("authorId", "deletedAt", "createdAt", "id");
