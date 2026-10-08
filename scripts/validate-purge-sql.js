// Validación LITERAL de la migración 20260926140000_purge_conversations
// sobre PG real (embebida local). Correr DENTRO de preview-run.sh:
//   bash scripts/preview-run.sh node /home/z/my-project/scripts/validate-purge-sql.js
// Escenario: 2 conversaciones (una con mensaje+reporte, otra limpia) →
// tras la purga: 0 mensajes, 0 participantes, 1 cáscara (la reportada), 1 reporte.
const { Client } = require('/home/z/preview-pg/node_modules/pg');
const fs = require('fs');

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  // Limpio el escenario de chat local y tomo dos usuarios reales
  await c.query('DELETE FROM "ChatReport"');
  await c.query('DELETE FROM "Message"');
  await c.query('DELETE FROM "Conversation"');
  const u = await c.query('SELECT id FROM "User" ORDER BY "createdAt" LIMIT 2');
  if (u.rows.length < 2) throw new Error('necesito 2 usuarios en la BD local (correr seed-chat-test antes)');
  const [ana, beto] = [u.rows[0].id, u.rows[1].id];

  // Convo 1 (reportada): ana↔beto con mensaje y reporte
  const c1 = (await c.query(
    "INSERT INTO \"Conversation\" (id, type, \"createdBy\", \"lastMessageAt\", \"createdAt\", \"updatedAt\") VALUES ('purge_test_conv1', 'DIRECT', $1, now(), now(), now()) RETURNING id",
    [ana],
  )).rows[0].id;
  await c.query("INSERT INTO \"Participant\" (id, \"conversationId\", \"userId\", \"lastReadAt\", \"joinedAt\") VALUES ('purge_test_p1', $1, $2, now(), now()), ('purge_test_p2', $1, $3, now(), now())", [c1, ana, beto]);
  await c.query("INSERT INTO \"Message\" (id, \"conversationId\", \"senderId\", kind, text, \"createdAt\") VALUES ('purge_test_m1', $1, $2, 'TEXT', 'hola', now())", [c1, ana]);
  await c.query("INSERT INTO \"ChatReport\" (id, \"reporterId\", \"conversationId\", reason, status, \"createdAt\") VALUES ('purge_test_r1', $1, $2, 'OTRO', 'OPEN', now())", [ana, c1]);

  // Convo 2 (sin reporte)
  const c2 = (await c.query(
    "INSERT INTO \"Conversation\" (id, type, \"createdBy\", \"lastMessageAt\", \"createdAt\", \"updatedAt\") VALUES ('purge_test_conv2', 'DIRECT', $1, now(), now(), now()) RETURNING id",
    [beto],
  )).rows[0].id;
  await c.query("INSERT INTO \"Participant\" (id, \"conversationId\", \"userId\", \"lastReadAt\", \"joinedAt\") VALUES ('purge_test_p3', $1, $2, now(), now())", [c2, beto]);
  await c.query("INSERT INTO \"Message\" (id, \"conversationId\", \"senderId\", kind, text, \"createdAt\") VALUES ('purge_test_m2', $1, $2, 'TEXT', 'dos', now())", [c2, beto]);

  const count = async (sql) => Number((await c.query(sql)).rows[0].n);
  console.log('ANTES  → mensajes:', await count('SELECT count(*)::int AS n FROM "Message"'),
    '| participantes:', await count('SELECT count(*)::int AS n FROM "Participant"'),
    '| conversaciones:', await count('SELECT count(*)::int AS n FROM "Conversation"'),
    '| reportes:', await count('SELECT count(*)::int AS n FROM "ChatReport"'));

  // Ejecutar la migración LITERAL
  const sql = fs.readFileSync('/home/z/conecta-clean/prisma/migrations/20260926140000_purge_conversations/migration.sql', 'utf8');
  await c.query(sql);

  const after = {
    mensajes: await count('SELECT count(*)::int AS n FROM "Message"'),
    participantes: await count('SELECT count(*)::int AS n FROM "Participant"'),
    conversaciones: await count('SELECT count(*)::int AS n FROM "Conversation"'),
    reportes: await count('SELECT count(*)::int AS n FROM "ChatReport"'),
    cascade_conv1: await count('SELECT count(*)::int AS n FROM "Conversation" WHERE id = \'purge_test_conv1\''),
    mensajeIdNull: await count('SELECT count(*)::int AS n FROM "ChatReport" WHERE "messageId" IS NULL'),
  };
  console.log('DESPUÉS →', JSON.stringify(after));

  const ok =
    after.mensajes === 0 &&
    after.participantes === 0 &&
    after.conversaciones === 1 &&      // solo la cáscara de la reportada
    after.cascade_conv1 === 1 &&
    after.reportes === 1 &&
    after.mensajeIdNull === 1;

  // Limpieza del escenario
  await c.query('DELETE FROM "ChatReport"');
  await c.query('DELETE FROM "Conversation"');
  await c.end();

  if (ok) { console.log('VALIDACIÓN PURGA: OK (purga total + reporte/cáscara conservados)'); process.exit(0); }
  console.error('VALIDACIÓN PURGA: FALLO — resultados inesperados');
  process.exit(1);
})().catch((e) => { console.error('VALIDACIÓN PURGA:', e.message); process.exit(1); });
