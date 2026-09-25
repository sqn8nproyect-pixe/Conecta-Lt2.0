// ─────────────────────────────────────────────────────────────
// use-chat-badge-sync.ts — badge "Mensajes" del Navbar.
//
// Espeja el patrón de use-notifications-sync: UNA instancia (en el
// Navbar) consulta /api/chat/conversations cada 15s mientras el
// usuario está autenticado y guarda el total de no leídos en el
// store Zustand. Con Pusher activo, las invalidaciones de las
// mutaciones del chat refrescan la misma query al instante.
// ─────────────────────────────────────────────────────────────

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { fetchChatConversations } from '@/lib/api';
import { useAppStore } from '@/lib/store';

export const CHAT_CONVERSATIONS_QUERY_KEY = ['chat', 'conversations'] as const;

export function useChatBadgeSync() {
  const { status } = useSession();
  const setChatUnreadTotal = useAppStore((s) => s.setChatUnreadTotal);

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

  // Al desloguear, setUser(null) ya resetea el badge en el store.
}
