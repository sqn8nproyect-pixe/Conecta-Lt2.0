// ─────────────────────────────────────────────────────────────
// chat.service.ts — lógica de negocio del chat entre usuarios.
//
// Fuente de verdad: PostgreSQL (Conversation/Participant/Message/
// BlockedUser/ChatReport). La entrega en vivo es dual (Pusher o
// polling) — ver src/server/chat/pusher-server.ts.
//
// Convención del repo: los errores de dominio se LANZAN como
// `Response` (401/403/404) y cada route handler los captura con
// `if (e instanceof Response) return e` (patrón requireUser /
// notification.service).
// ─────────────────────────────────────────────────────────────

import { Prisma } from '@prisma/client';

import { db } from '@/lib/db';
import { chatChannelNames, CHAT_EVENTS, triggerChatEvent } from '@/server/chat/pusher-server';

// ── Constantes de dominio ─────────────────────────────────────

/** Tope de caracteres por mensaje de texto (plan de chat, cap. 7). */
export const CHAT_MAX_TEXT_LENGTH = 4000;
/** Tope de duración de nota de voz en ms (2 min, schema.prisma). */
export const CHAT_MAX_VOICE_MS = 120_000;
/** Mensajes por página (GET paginado por cursor). */
export const CHAT_PAGE_SIZE = 30;

export const CHAT_REPORT_REASONS = [
  'SPAM',
  'ACOSO',
  'CONTENIDO_INAPROPIADO',
  'ESTAFA',
  'OTRO',
] as const;
export type ChatReportReason = (typeof CHAT_REPORT_REASONS)[number];

export type ChatMessageKind = 'TEXT' | 'VOICE' | 'IMAGE' | 'SYSTEM';

// ── DTOs serializables (fechas en ISO string) ─────────────────

export interface ChatUserDTO {
  id: string;
  name: string;
  image: string | null;
}

export interface ChatMessageDTO {
  id: string;
  conversationId: string;
  senderId: string | null;
  senderName: string | null;
  senderImage: string | null;
  kind: ChatMessageKind;
  text: string | null;
  mediaUrl: string | null;
  durationMs: number | null;
  createdAt: string;
}

export interface ChatConversationDTO {
  id: string;
  type: 'DIRECT' | 'GROUP';
  title: string | null;
  createdAt: string;
  lastMessageAt: string;
  participants: ChatUserDTO[];
  lastMessage: ChatMessageDTO | null;
  unreadCount: number;
  /** true = bloqueado en alguna dirección → no se puede enviar. */
  blocked: boolean;
}

// ── Helpers internos ──────────────────────────────────────────

function toMessageDTO(
  m: {
    id: string;
    conversationId: string;
    senderId: string | null;
    kind: string;
    text: string | null;
    mediaUrl: string | null;
    durationMs: number | null;
    createdAt: Date;
  },
  sender?: { name: string | null; image: string | null } | null,
): ChatMessageDTO {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    senderName: sender?.name ?? null,
    senderImage: sender?.image ?? null,
    kind: m.kind as ChatMessageKind,
    text: m.text,
    mediaUrl: m.mediaUrl,
    durationMs: m.durationMs,
    createdAt: m.createdAt.toISOString(),
  };
}

/**
 * Bloqueo en cualquiera de las dos direcciones (yo lo bloqueé o me
 * bloqueó): en ambos casos la conversación queda congelada para mí.
 */
async function isBlockedBetween(userId: string, otherUserId: string): Promise<boolean> {
  const block = await db.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedId: otherUserId },
        { blockerId: otherUserId, blockedId: userId },
      ],
    },
    select: { id: true },
  });
  return Boolean(block);
}

async function assertParticipant(conversationId: string, userId: string) {
  const me = await db.participant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { lastReadAt: true },
  });
  if (!me) {
    // 404 (no 403): no revelar la existencia de conversaciones ajenas.
    throw new Response(JSON.stringify({ error: 'Conversación no encontrada' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }
  return me;
}

// ── Servicio ──────────────────────────────────────────────────

export const chatService = {
  /**
   * Lista mis conversaciones (máx 50, por actividad reciente) con
   * último mensaje, participantes y conteo de no leídos. El conteo
   * usa SQL directo porque el `lastReadAt` es POR participante y
   * Prisma no puede comparar por-grupo en un solo groupBy.
   */
  listConversations: async (userId: string): Promise<ChatConversationDTO[]> => {
    const convos = await db.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: { include: { user: { select: { id: true, name: true, image: true } } } },
        messages: { orderBy: { createdAt: 'desc' as const }, take: 1, include: { sender: { select: { name: true, image: true } } } },
      },
      orderBy: { lastMessageAt: 'desc' as const },
      take: 50,
    });
    if (convos.length === 0) return [];

    const convoIds = convos.map((c) => c.id);

    // No leídos por conversación: createdAt > mi lastReadAt y no míos.
    const unreadRows = await db.$queryRaw<{ conversationId: string; n: bigint }[]>`
      SELECT m."conversationId", count(*)::bigint AS n
      FROM "Message" m
      JOIN "Participant" p
        ON p."conversationId" = m."conversationId" AND p."userId" = ${userId}
      WHERE m."conversationId" IN (${Prisma.join(convoIds)})
        AND m."createdAt" > p."lastReadAt"
        AND (m."senderId" IS NULL OR m."senderId" <> ${userId})
      GROUP BY m."conversationId"
    `;
    const unreadMap = new Map(unreadRows.map((r) => [r.conversationId, Number(r.n)]));

    // Bloqueos relevantes (cualquier dirección) para DIRECT.
    const otherIds = convos
      .map((c) => c.participants.find((p) => p.userId !== userId)?.userId)
      .filter((x): x is string => Boolean(x));
    const blocks = await db.blockedUser.findMany({
      where: {
        OR: [
          { blockerId: userId, blockedId: { in: otherIds } },
          { blockerId: { in: otherIds }, blockedId: userId },
        ],
      },
      select: { blockerId: true, blockedId: true },
    });
    const blockKeys = new Set(blocks.map((b) => `${b.blockerId}:${b.blockedId}`));

    return convos.map((c) => {
      const other = c.participants.find((p) => p.userId !== userId);
      const blocked =
        c.type === 'DIRECT' && other
          ? blockKeys.has(`${userId}:${other.userId}`) || blockKeys.has(`${other.userId}:${userId}`)
          : false;
      const last = c.messages[0];
      return {
        id: c.id,
        type: c.type,
        title: c.title,
        createdAt: c.createdAt.toISOString(),
        lastMessageAt: c.lastMessageAt.toISOString(),
        participants: c.participants.map((p) => ({
          id: p.user.id,
          name: p.user.name ?? 'Usuario',
          image: p.user.image,
        })),
        lastMessage: last
          ? toMessageDTO(
              last,
              last.sender ? { name: last.sender.name, image: last.sender.image } : null,
            )
          : null,
        unreadCount: unreadMap.get(c.id) ?? 0,
        blocked,
      };
    });
  },

  /**
   * Abre (o encuentra) la conversación DIRECT con otro usuario.
   * Reglas: no conmigo mismo, no bloqueados (403 BLOCKED), el otro
   * debe existir. Crea la conversación + 2 participantes si no existe.
   */
  openDirectConversation: async (userId: string, otherUserId: string): Promise<ChatConversationDTO> => {
    if (userId === otherUserId) {
      throw new Response(JSON.stringify({ error: 'No puedes chatear contigo mismo' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const other = await db.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, name: true, image: true },
    });
    if (!other) {
      throw new Response(JSON.stringify({ error: 'Usuario no encontrado' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }

    const blocked = await isBlockedBetween(userId, otherUserId);
    if (blocked) {
      throw new Response(JSON.stringify({ error: 'BLOCKED' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      });
    }

    // Alguno + todos = exactamente los dos participantes (DIRECT).
    let convo = await db.conversation.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: otherUserId } } },
          { participants: { every: { userId: { in: [userId, otherUserId] } } } },
        ],
      },
    });

    if (!convo) {
      convo = await db.conversation.create({
        data: {
          type: 'DIRECT',
          createdBy: userId,
          participants: { create: [{ userId }, { userId: otherUserId }] },
        },
      });
    }

    return {
      id: convo.id,
      type: convo.type,
      title: convo.title,
      createdAt: convo.createdAt.toISOString(),
      lastMessageAt: convo.lastMessageAt.toISOString(),
      participants: [
        { id: userId, name: 'Yo', image: null }, // el cliente completa con la sesión
        { id: other.id, name: other.name ?? 'Usuario', image: other.image },
      ],
      lastMessage: null,
      unreadCount: 0,
      blocked: false,
    };
  },

  /**
   * Página de mensajes (asc). Cursor = createdAt ISO del mensaje más
   * antiguo ya cargado. Devuelve `hasMore` para el botón "cargar más".
   */
  getMessages: async (
    userId: string,
    conversationId: string,
    before?: string,
  ): Promise<{ messages: ChatMessageDTO[]; hasMore: boolean }> => {
    await assertParticipant(conversationId, userId);

    let beforeDate: Date | undefined;
    if (before) {
      const t = Date.parse(before);
      if (Number.isNaN(t)) {
        throw new Response(JSON.stringify({ error: 'Cursor inválido' }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        });
      }
      beforeDate = new Date(t);
    }

    const rows = await db.message.findMany({
      where: { conversationId, ...(beforeDate ? { createdAt: { lt: beforeDate } } : {}) },
      orderBy: { createdAt: 'desc' as const },
      take: CHAT_PAGE_SIZE + 1,
      include: { sender: { select: { name: true, image: true } } },
    });

    const hasMore = rows.length > CHAT_PAGE_SIZE;
    const page = hasMore ? rows.slice(0, CHAT_PAGE_SIZE) : rows;
    return {
      messages: page
        .slice()
        .reverse()
        .map((m) => toMessageDTO(m, m.sender)),
      hasMore,
    };
  },

  /**
   * Enviar mensaje (TEXT / VOICE / IMAGE). Postgres primero; Pusher
   * después (fire-and-forget). Bloqueos: rechaza en cualquier dirección.
   * Para VOICE/IMAGE el cliente YA subió el medio vía presign y manda
   * `mediaKey` (clave `chat/{userId}/…` se valida aquí) + mediaUrl.
   */
  sendMessage: async (
    userId: string,
    conversationId: string,
    input: {
      kind: ChatMessageKind;
      text?: string;
      mediaUrl?: string;
      mediaKey?: string;
      durationMs?: number;
    },
  ): Promise<ChatMessageDTO> => {
    await assertParticipant(conversationId, userId);

    if (input.kind !== 'TEXT' && input.kind !== 'VOICE' && input.kind !== 'IMAGE') {
      throw new Response(JSON.stringify({ error: 'kind inválido' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const text = input.text?.trim() ?? '';
    if (input.kind === 'TEXT') {
      if (!text) {
        throw new Response(JSON.stringify({ error: 'El mensaje está vacío' }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (text.length > CHAT_MAX_TEXT_LENGTH) {
        throw new Response(
          JSON.stringify({ error: `Máximo ${CHAT_MAX_TEXT_LENGTH} caracteres` }),
          { status: 400, headers: { 'content-type': 'application/json' } },
        );
      }
    } else {
      // VOICE / IMAGE: exigir media ya subida vía presign tipo CHAT.
      if (!input.mediaKey || !input.mediaUrl) {
        throw new Response(JSON.stringify({ error: 'Falta el archivo multimedia' }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        });
      }
      // La clave debe pertenecer al propio usuario (prefijo validado).
      if (!input.mediaKey.startsWith(`chat/${userId}/`)) {
        throw new Response(JSON.stringify({ error: 'Clave de medio inválida' }), {
          status: 403,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (input.kind === 'VOICE') {
        const d = input.durationMs ?? 0;
        if (d <= 0 || d > CHAT_MAX_VOICE_MS + 2_000) {
          throw new Response(JSON.stringify({ error: 'Duración de voz inválida (máx 2 min)' }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
          });
        }
      }
    }

    // Bloqueo en cualquiera de las dos direcciones congelará el envío.
    const convo = await db.conversation.findUnique({
      where: { id: conversationId },
      select: {
        type: true,
        participants: { select: { userId: true } },
      },
    });
    if (!convo) {
      throw new Response(JSON.stringify({ error: 'Conversación no encontrada' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (convo.type === 'DIRECT') {
      const otherId = convo.participants.find((p) => p.userId !== userId)?.userId;
      if (otherId && (await isBlockedBetween(userId, otherId))) {
        throw new Response(JSON.stringify({ error: 'BLOCKED' }), {
          status: 403,
          headers: { 'content-type': 'application/json' },
        });
      }
    }

    const [message] = await db.$transaction([
      db.message.create({
        data: {
          conversationId,
          senderId: userId,
          kind: input.kind,
          text: input.kind === 'TEXT' ? text : null,
          mediaUrl: input.kind === 'TEXT' ? null : input.mediaUrl,
          mediaKey: input.kind === 'TEXT' ? null : input.mediaKey,
          durationMs: input.kind === 'VOICE' ? input.durationMs : null,
        },
        include: { sender: { select: { name: true, image: true } } },
      }),
      db.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      }),
      // Enviar también marca mis propios mensajes como leídos para mí.
      db.participant.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { lastReadAt: new Date() },
      }),
    ]);

    const dto = toMessageDTO(message, message.sender);

    // Entrega en vivo (no-op si Pusher no está configurado) +
    // aviso a los canales personales para refrescar la bandeja.
    const otherParticipantIds = convo.participants
      .map((p) => p.userId)
      .filter((id) => id !== userId);
    void triggerChatEvent(chatChannelNames.convo(conversationId), CHAT_EVENTS.MESSAGE_NEW, dto);
    if (otherParticipantIds.length > 0) {
      void triggerChatEvent(
        otherParticipantIds.map(chatChannelNames.user),
        CHAT_EVENTS.CONVO_UPDATED,
        { conversationId, message: dto },
      );
    }

    return dto;
  },

  /** Marca mi lectura (lastReadAt = ahora) y avisa por Pusher. */
  markRead: async (userId: string, conversationId: string): Promise<{ ok: true }> => {
    await assertParticipant(conversationId, userId);
    const now = new Date();
    await db.participant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: now },
    });
    void triggerChatEvent(chatChannelNames.convo(conversationId), CHAT_EVENTS.MESSAGE_READ, {
      userId,
      lastReadAt: now.toISOString(),
    });
    return { ok: true };
  },

  /** Reporta una conversación (y opcionalmente un mensaje concreto). */
  reportConversation: async (
    userId: string,
    conversationId: string,
    input: { reason: string; details?: string; messageId?: string },
  ): Promise<{ ok: true }> => {
    await assertParticipant(conversationId, userId);

    if (!CHAT_REPORT_REASONS.includes(input.reason as ChatReportReason)) {
      throw new Response(JSON.stringify({ error: 'Motivo de reporte inválido' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    let messageId: string | undefined;
    let reportedUserId: string | undefined;
    const convo = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { participants: { select: { userId: true } } },
    });
    if (convo) {
      reportedUserId = convo.participants.find((p) => p.userId !== userId)?.userId;
    }
    if (input.messageId) {
      const msg = await db.message.findFirst({
        where: { id: input.messageId, conversationId },
        select: { id: true, senderId: true },
      });
      if (!msg) {
        throw new Response(JSON.stringify({ error: 'Mensaje no encontrado' }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        });
      }
      messageId = msg.id;
      if (msg.senderId) reportedUserId = msg.senderId;
    }

    await db.chatReport.create({
      data: {
        reporterId: userId,
        conversationId,
        messageId,
        reportedUserId,
        reason: input.reason,
        details: input.details?.slice(0, 1000) || null,
      },
    });
    return { ok: true };
  },

  // ── Bloqueos ────────────────────────────────────────────────

  blockUser: async (userId: string, targetId: string): Promise<{ ok: true }> => {
    if (userId === targetId) {
      throw new Response(JSON.stringify({ error: 'No puedes bloquearte a ti mismo' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }
    const target = await db.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target) {
      throw new Response(JSON.stringify({ error: 'Usuario no encontrado' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }
    // Idempotente: si ya existe, no falla.
    await db.blockedUser.upsert({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
      create: { blockerId: userId, blockedId: targetId },
      update: {},
    });
    return { ok: true };
  },

  unblockUser: async (userId: string, targetId: string): Promise<{ ok: true }> => {
    await db.blockedUser.deleteMany({ where: { blockerId: userId, blockedId: targetId } });
    return { ok: true };
  },

  listBlocked: async (userId: string): Promise<ChatUserDTO[]> => {
    const rows = await db.blockedUser.findMany({
      where: { blockerId: userId },
      include: { blocked: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: 'desc' as const },
    });
    return rows.map((r) => ({ id: r.blocked.id, name: r.blocked.name ?? 'Usuario', image: r.blocked.image }));
  },

  /**
   * Búsqueda ligera de usuarios para "Nuevo chat" (v1: por nombre o
   * email, mínimo 2 caracteres, máx 20). Excluye bloqueados en
   * cualquier dirección y a mí mismo.
   */
  searchUsers: async (userId: string, query: string): Promise<ChatUserDTO[]> => {
    const q = query.trim();
    if (q.length < 2) return [];
    const blocks = await db.blockedUser.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    const excluded = new Set<string>([userId]);
    for (const b of blocks) {
      excluded.add(b.blockerId);
      excluded.add(b.blockedId);
    }
    const rows = await db.user.findMany({
      where: {
        AND: [
          { id: { notIn: [...excluded] } },
          {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { email: { contains: q, mode: 'insensitive' as const } },
            ],
          },
        ],
      },
      select: { id: true, name: true, image: true },
      orderBy: { name: 'asc' as const },
      take: 20,
    });
    return rows.map((u) => ({ id: u.id, name: u.name ?? 'Usuario', image: u.image }));
  },
};
