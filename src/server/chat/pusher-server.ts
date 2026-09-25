// ─────────────────────────────────────────────────────────────
// Pusher Channels (server) — entrega en vivo del chat.
//
// Diseño dual (plan de chat, cap. 5):
//   - Si las 4 env vars PUSHER_* están configuradas, los eventos
//     se disparan por Pusher (private-convo-{id} / private-user-{id}).
//   - Si NO lo están (sandbox local, o Plan B), TODAS las funciones
//     son no-ops silenciosas y el cliente funciona por polling
//     (React Query refetchInterval). Cero cambios de código al
//     activar Pusher: solo configurar env vars en Vercel.
//
// Env vars (server-only): PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET,
// PUSHER_CLUSTER. Client: NEXT_PUBLIC_PUSHER_KEY, NEXT_PUBLIC_PUSHER_CLUSTER.
// ─────────────────────────────────────────────────────────────

import Pusher from 'pusher';

let instance: Pusher | null = null;

export function isChatRealtimeEnabled(): boolean {
  return Boolean(
    process.env.PUSHER_APP_ID &&
      process.env.PUSHER_KEY &&
      process.env.PUSHER_SECRET &&
      process.env.PUSHER_CLUSTER,
  );
}

function getPusherServer(): Pusher | null {
  if (!isChatRealtimeEnabled()) return null;
  if (!instance) {
    instance = new Pusher({
      appId: process.env.PUSHER_APP_ID as string,
      key: process.env.PUSHER_KEY as string,
      secret: process.env.PUSHER_SECRET as string,
      cluster: process.env.PUSHER_CLUSTER as string,
      useTLS: true,
    });
  }
  return instance;
}

/**
 * Dispara un evento de chat. Fire-and-forget: un fallo de Pusher
 * NUNCA debe romper el request del usuario (el mensaje ya está en
 * Postgres; los clientes lo verán por polling como máximo).
 */
export async function triggerChatEvent(
  channels: string | string[],
  event: string,
  data: unknown,
): Promise<void> {
  const server = getPusherServer();
  if (!server) return;
  try {
    await server.trigger(channels, event, data);
  } catch (e) {
    console.error('[chat/pusher] trigger falló (no bloquea request):', e);
  }
}

export const CHAT_EVENTS = {
  MESSAGE_NEW: 'message:new',
  MESSAGE_READ: 'message:read',
  CONVO_UPDATED: 'convo:update',
} as const;

export const chatChannelNames = {
  convo: (conversationId: string) => `private-convo-${conversationId}`,
  user: (userId: string) => `private-user-${userId}`,
};
