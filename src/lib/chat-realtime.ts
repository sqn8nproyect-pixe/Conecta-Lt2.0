// ─────────────────────────────────────────────────────────────
// chat-realtime.ts — cliente Pusher Channels (browser).
//
// Modo dual: si NEXT_PUBLIC_PUSHER_KEY/CLUSTER no están horneados
// en el build, TODO es no-op y el chat funciona por polling. Al
// configurar las env vars en Vercel + redeploy, la entrega pasa a
// ser en vivo SIN cambios de código (el polling queda como red de
// seguridad con intervalos más largos).
//
// Autorización: POST /api/chat/pusher/auth (canales privados).
// ─────────────────────────────────────────────────────────────

import type { Channel } from 'pusher-js';
import type { ChatMessageDTO } from './types';

// Credenciales horneadas en build (vacías ⇒ modo polling).
export const isChatClientRealtimeEnabled = (): boolean =>
  Boolean(
    process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  );

type Lazy = { client: import('pusher-js').default | null };
const lazy: Lazy = { client: null };

async function getPusherClient(): Promise<import('pusher-js').default | null> {
  if (!isChatClientRealtimeEnabled()) return null;
  if (lazy.client) return lazy.client;
  // Import dinámico: evita cargar pusher-js cuando no se usa.
  const mod = await import('pusher-js');
  const Pusher = mod.default;
  lazy.client = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY as string, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER as string,
    // authEndpoint por defecto → /pusher/auth? No: forzamos nuestra ruta.
    authEndpoint: '/api/chat/pusher/auth',
  });
  return lazy.client;
}

/**
 * Se suscribe al canal personal (private-user-{id}) para eventos de
 * bandeja: `convo:update` cuando ANY conversación mía recibe actividad.
 * Retorna la función de limpieza. No-op sin Pusher.
 */
export async function subscribeUserChannel(
  userId: string,
  onConvoUpdated: (payload: { conversationId: string }) => void,
): Promise<() => void> {
  const client = await getPusherClient();
  if (!client) return () => {};
  const channel = client.subscribe(`private-user-${userId}`);
  channel.bind('convo:update', (data: { conversationId: string }) =>
    onConvoUpdated(data),
  );
  return () => {
    client.unsubscribe(`private-user-${userId}`);
  };
}

/**
 * Se suscribe a una conversación abierta (private-convo-{id}) para
 * recibir mensajes en vivo + lecturas. No-op sin Pusher.
 */
export async function subscribeConversationChannel(
  conversationId: string,
  handlers: {
    onMessage: (message: ChatMessageDTO) => void;
    onRead: (payload: { userId: string; lastReadAt: string }) => void;
  },
): Promise<() => void> {
  const client = await getPusherClient();
  if (!client) return () => {};
  const name = `private-convo-${conversationId}`;
  const channel: Channel = client.subscribe(name);
  channel.bind('message:new', handlers.onMessage);
  channel.bind('message:read', handlers.onRead);
  return () => {
    client.unsubscribe(name);
  };
}
