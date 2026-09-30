-- Un GIF animado se guarda como MP4 (26x menos CPU y 5x menos bytes que re-encodarlo como GIF),
-- pero en la UI se reproduce en bucle, sin controles ni sonido: para quien mira sigue siendo un GIF.
-- Esta marca es lo que distingue ese caso de un video subido a mano.
ALTER TYPE "StoredMediaKind" ADD VALUE 'ANIMATION';

ALTER TABLE "Comment" ADD COLUMN "animatedImage" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Vox" ADD COLUMN "animatedImage" BOOLEAN NOT NULL DEFAULT false;
