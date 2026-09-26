-- "Eliminar conversación" (v1.1): soft-delete por participante.
-- Un participante la oculta de SU bandeja (reaparece si le escriben
-- de nuevo); ADMIN/MODERATOR pueden ocultarla para todos. Aditivo y
-- nullable: sin backfill necesario.
ALTER TABLE "Participant" ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "Participant" ADD COLUMN "deletedBy" TEXT;
