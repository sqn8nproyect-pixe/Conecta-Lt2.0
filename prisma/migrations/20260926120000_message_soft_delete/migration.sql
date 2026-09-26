-- Soft-delete de mensajes (v1.1): el autor o un moderador/admin pueden
-- eliminar un mensaje. Cambio ADITIVO (columnas nullable): cero riesgo
-- para datos existentes. El contenido se redacta en la capa de API.
ALTER TABLE "Message" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "deletedBy" TEXT;
