-- Purga ÚNICA de datos (petición del dueño, 2026-09-26): eliminar TODAS
-- las conversaciones existentes en la plataforma. Convive con "eliminar
-- conversación" v2 (borrado total por conversación); esta migración
-- limpia el histórico completo una sola vez en el deploy. Sin vuelta
-- atrás. Orden: hijos primero (Message, Participant) y Conversation al
-- final. Se conservan SOLO los ChatReport (evidencia de moderación):
-- las conversaciones reportadas quedan como cáscara sin participantes
-- (invisible en bandejas, inabrable, sin historial), igual que hace la
-- v2 al eliminar una conversación con reporte. Los mensajes borrados
-- ponen ChatReport.messageId a NULL automáticamente (FK SetNull).

DELETE FROM "Message";
DELETE FROM "Participant";

DELETE FROM "Conversation"
WHERE "id" NOT IN (
  SELECT "conversationId" FROM "ChatReport" WHERE "conversationId" IS NOT NULL
);
