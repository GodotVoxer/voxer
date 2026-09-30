-- El dueño pasa a recibir "comentaron tu vox" solo mientras sigue su vox: los existentes arrancan seguidos.
INSERT INTO "VoxFollow" ("userId", "voxId")
SELECT "ownerId", "id" FROM "Vox" WHERE "ownerId" IS NOT NULL
ON CONFLICT DO NOTHING;
