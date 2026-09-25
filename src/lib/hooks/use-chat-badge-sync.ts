// ─────────────────────────────────────────────────────────────
// use-chat-badge-sync.ts — badge "Mensajes" del Navbar.
//
// Espeja el patrón de use-notifications-sync: UNA instancia (en el
// Navbar) consulta /api/chat/conversations cada 15s mientras el
// usuario está autenticado y guarda el total de no leídos en el
// store Zustand. Con Pusher activo, las invalidaciones de las
// mutaciones del chat refrescan la misma query al instante.
//
// Sprint 9 (realtime): con NEXT_PUBLIC_PUSHER_* horneadas, este hook
// también se suscribe al canal personal private-user-{id} — cada
// evento `convo:update` (disparado por el servidor cuando ANY de mis
// conversaciones recibe un mensaje) invalida ['chat','conversations'],
// que es la MISMA query que consume la bandeja (MessagesPage). Una
// suscripción → badge + bandeja instantáneos. Sin Pusher esto es
// no-op y el polling 15s/10s hace todo el trabajo.
// ─────────────────────────────────────────────────────────────

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { fetchChatConversations } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import {
  isChatClientRealtimeEnabled,
  subscribeUserChannel,
} from '@/lib/chat-realtime';

export const CHAT_CONVERSATIONS_QUERY_KEY = ['chat', 'conversations'] as const;

export function useChatBadgeSync() {
  const { status, data: session } = useSession();
  const setChatUnreadTotal = useAppStore((s) => s.setChatUnreadTotal);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: CHAT_CONVERSATIONS_QUERY_KEY,
    queryFn: fetchChatConversations,
    enabled: status === 'authenticated',
    staleTime: 10_000,
    refetchInterval: 15_000,
    retry: false,
  });

  useEffect(() => {
    const total = (data ?? []).reduce((sum, c) => sum + c.unreadCount, 0);
    setChatUnreadTotal(total);
  }, [data, setChatUnreadTotal]);

  // Realtime (no-op sin Pusher): canal personal → refresco global.
  const userId = session?.user?.id;
  useEffect(() => {
    if (status !== 'authenticated' || !userId || !isChatClientRealtimeEnabled()) {
      return;
    }
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    void subscribeUserChannel(userId, () => {
      void queryClient.invalidateQueries({
        queryKey: CHAT_CONVERSATIONS_QUERY_KEY,
      });
    }).then((fn) => {
      if (cancelled) fn();
      else cleanup = fn;
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [status, userId, queryClient]);

  // Al desloguear, setUser(null) ya resetea el badge en el store.
}
