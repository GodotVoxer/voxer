CREATE EXTENSION IF NOT EXISTS pg_trgm;

UPDATE "Vox" SET title = LEFT(title, 200) WHERE char_length(title) > 200;

ALTER TABLE "Vox" ALTER COLUMN title SET DATA TYPE VARCHAR(200);

CREATE INDEX IF NOT EXISTS "Vox_title_lower_trgm_idx" ON "Vox" USING gin (lower(title) gin_trgm_ops);
