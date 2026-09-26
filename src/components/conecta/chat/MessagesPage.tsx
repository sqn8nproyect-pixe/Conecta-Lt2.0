'use client';

// ─────────────────────────────────────────────────────────────
// MessagesPage — vista "Mensajes" de la SPA.
//
// Dos paneles en desktop (bandeja + conversación); en móvil se
// alterna entre bandeja y conversación. La bandeja hace polling
// 10s (React Query); la conversación abierta, 3s (ChatWindow).
// Con Pusher configurado, la entrega es en vivo y el polling
// queda de red de seguridad.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageCircle, Plus, Search, X } from 'lucide-react';
import {
  fetchChatConversations,
  openChatConversation,
  searchChatUsers,
} from '@/lib/api';
import { CHAT_CONVERSATIONS_QUERY_KEY } from '@/lib/hooks/use-chat-badge-sync';
import { useAppStore } from '@/lib/store';
import ChatWindow from '@/components/conecta/chat/ChatWindow';
import type { ChatConversationDTO } from '@/lib/types';

function formatPreviewTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' });
}

function Avatar({ name, image, size = 44 }: { name: string; image: string | null; size?: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return image ? (
    <img
      src={image}
      alt={name}
      width={size}
      height={size}
      className="rounded-full object-cover ring-1 ring-white/10 shrink-0"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-hidden
      className="rounded-full bg-gold/20 text-gold font-semibold flex items-center justify-center shrink-0 ring-1 ring-gold/30"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initial}
    </span>
  );
}

// ── Bandeja de conversaciones ────────────────────────────────

function ConversationList({
  conversations,
  activeId,
  isLoading,
  onSelect,
}: {
  conversations: ChatConversationDTO[];
  activeId: string | null;
  isLoading: boolean;
  onSelect: (convo: ChatConversationDTO) => void;
}) {
  const me = useAppStore((s) => s.user);

  if (isLoading && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-white/40 text-sm">
        <Loader2 className="animate-spin mr-2" size={16} /> Cargando conversaciones…
      </div>
    );
  }
  if (conversations.length === 0) {
    return (
      <div className="text-center py-12 px-4 space-y-2">
        <MessageCircle className="mx-auto text-white/20" size={36} aria-hidden />
        <p className="text-white/60 text-sm">Todavía no tienes conversaciones.</p>
        <p className="text-white/35 text-xs">
          Usa “Nuevo chat” para buscar a alguien y empezar a hablar.
        </p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-white/5">
      {conversations.map((c) => {
        const other = c.participants.find((p) => p.id !== me?.id);
        const name = other?.name ?? c.title ?? 'Usuario';
        const preview =
          c.lastMessage?.deleted
            ? 'Mensaje eliminado'
            : c.lastMessage?.kind === 'VOICE'
              ? '🎤 Nota de voz'
              : c.lastMessage?.kind === 'IMAGE'
                ? '📷 Imagen'
                : c.lastMessage?.text ?? 'Sin mensajes aún';
        return (
          <li key={c.id}>
            <button
              onClick={() => onSelect(c)}
              className={`w-full flex items-center gap-3 px-3 sm:px-4 py-3 text-left transition-colors ${
                activeId === c.id ? 'bg-gold/10' : 'hover:bg-white/5'
              }`}
              aria-current={activeId === c.id ? 'true' : undefined}
            >
              <Avatar name={name} image={other?.image ?? null} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-white truncate text-sm">{name}</p>
                  {c.lastMessage && (
                    <span className="text-[10px] text-white/35 shrink-0">
                      {formatPreviewTime(c.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-white/45 truncate">{preview}</p>
                  {c.unreadCount > 0 && (
                    <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-gold text-obsidian text-[10px] font-bold flex items-center justify-center">
                      {c.unreadCount > 99 ? '99+' : c.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ── Panel "Nuevo chat" ───────────────────────────────────────

function NewChatPanel({
  onOpen,
  onClose,
}: {
  onOpen: (convo: ChatConversationDTO) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Búsqueda con debounce simple (300ms).
  const [debouncedQ, setDebouncedQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data: users, isFetching } = useQuery({
    queryKey: ['chat', 'user-search', debouncedQ],
    queryFn: () => searchChatUsers(debouncedQ),
    enabled: debouncedQ.length >= 2,
    staleTime: 30_000,
  });

  const openMutation = useMutation({
    mutationFn: openChatConversation,
    onSuccess: (convo) => onOpen(convo),
    onError: (e: Error) => {
      setError(
        e.message === 'BLOCKED'
          ? 'No puedes iniciar un chat con este usuario (bloqueo activo).'
          : e.message,
      );
    },
  });

  return (
    <div className="p-3 sm:p-4 border-b border-white/10 bg-white/5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Nuevo chat</p>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-white/10 text-white/60 transition-colors"
          aria-label="Cerrar búsqueda"
        >
          <X size={16} />
        </button>
      </div>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Busca por nombre o email (mín. 2 letras)…"
          className="w-full rounded-lg bg-obsidian/70 border border-white/15 pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/60"
          aria-label="Buscar usuarios para chatear"
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {debouncedQ.length >= 2 && isFetching && (
        <p className="text-xs text-white/40 flex items-center gap-1.5">
          <Loader2 className="animate-spin" size={12} /> Buscando…
        </p>
      )}
      {debouncedQ.length >= 2 && !isFetching && (users ?? []).length === 0 && (
        <p className="text-xs text-white/40">Sin resultados para “{debouncedQ}”.</p>
      )}
      <ul className="max-h-56 overflow-y-auto space-y-1">
        {(users ?? []).map((u) => (
          <li key={u.id}>
            <button
              onClick={() => openMutation.mutate(u.id)}
              disabled={openMutation.isPending}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 transition-colors text-left disabled:opacity-50"
            >
              <Avatar name={u.name} image={u.image} size={32} />
              <span className="text-sm text-white truncate">{u.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Página ───────────────────────────────────────────────────

export default function MessagesPage() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const queryClient = useQueryClient();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);

  const { data: conversations, isLoading } = useQuery({
    queryKey: CHAT_CONVERSATIONS_QUERY_KEY,
    queryFn: fetchChatConversations,
    enabled: Boolean(user),
    staleTime: 5_000,
    refetchInterval: 10_000,
    retry: false,
  });

  const activeConversation = (conversations ?? []).find((c) => c.id === activeId) ?? null;

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-10 sm:mt-20 px-4">
        <div className="glass-card p-8 text-center space-y-4">
          <MessageCircle className="mx-auto text-gold" size={40} aria-hidden />
          <h1 className="text-xl font-bold text-white">Mensajes</h1>
          <p className="text-sm text-white/60 leading-relaxed">
            Inicia sesión para chatear con otros usuarios de CONECTA-LT de forma privada:
            coordinen compras, vendan cosas o simplemente saluden.
          </p>
          <button
            onClick={() => setView('home')}
            className="text-sm px-5 py-2.5 rounded-full bg-gold text-obsidian font-semibold hover:bg-gold/90 transition-colors"
          >
            Ir al Directorio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 pb-6">
      <div className="grid md:grid-cols-[340px_1fr] gap-4 h-[calc(100dvh-14rem)] sm:h-[calc(100dvh-10.5rem)] min-h-[420px]">
        {/* Bandeja */}
        <section
          className={`glass-card flex flex-col overflow-hidden ${
            activeId ? 'hidden md:flex' : 'flex'
          }`}
          aria-label="Bandeja de mensajes"
        >
          <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-white/10">
            <h1 className="font-bold text-white">Mensajes</h1>
            <button
              onClick={() => setNewChatOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 transition-colors font-medium"
              aria-expanded={newChatOpen}
            >
              <Plus size={13} /> Nuevo chat
            </button>
          </div>
          {newChatOpen && (
            <NewChatPanel
              onClose={() => setNewChatOpen(false)}
              onOpen={(convo) => {
                setNewChatOpen(false);
                // Insertar en cache (la bandeja aún no la incluye) y abrir.
                queryClient.setQueryData<ChatConversationDTO[]>(
                  CHAT_CONVERSATIONS_QUERY_KEY,
                  (prev) =>
                    prev?.some((c) => c.id === convo.id) ? prev : [convo, ...(prev ?? [])],
                );
                setActiveId(convo.id);
              }}
            />
          )}
          <div className="flex-1 overflow-y-auto min-h-0">
            <ConversationList
              conversations={conversations ?? []}
              isLoading={isLoading}
              activeId={activeId}
              onSelect={(c) => setActiveId(c.id)}
            />
          </div>
        </section>

        {/* Conversación / estado vacío */}
        <section className={`min-h-0 ${activeId ? 'block' : 'hidden md:block'}`} aria-label="Conversación">
          {activeConversation ? (
            <ChatWindow
              conversation={activeConversation}
              onBack={() => setActiveId(null)}
            />
          ) : (
            <div className="glass-card h-full flex flex-col items-center justify-center text-center px-6 space-y-3">
              <MessageCircle className="text-white/15" size={44} aria-hidden />
              <p className="text-white/60 text-sm">Selecciona una conversación</p>
              <p className="text-white/35 text-xs max-w-xs">
                Tus chats son privados. Puedes reportar comportamientos extraños o
                bloquear a cualquier usuario desde el menú de cada conversación.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
