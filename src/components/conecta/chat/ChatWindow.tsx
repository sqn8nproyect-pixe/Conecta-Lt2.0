'use client';

// ─────────────────────────────────────────────────────────────
// ChatWindow — ventana de una conversación 1-a-1.
//
// Entrega dual: pusher (subscribeConversationChannel) si el build
// trae NEXT_PUBLIC_PUSHER_*, si no polling 3s (React Query). El
// polling SIEMPRE queda activo como red de seguridad.
//
// Moderación básica (nivel del plan): reportar conversación/mensaje
// y bloquear al otro usuario (congela el envío en ambas direcciones).
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Ban, Flag, Loader2, Mic, MoreVertical, Send, Square, Trash2 } from 'lucide-react';
import {
  blockChatUser,
  CHAT_REPORT_REASONS,
  chatUploadPresign,
  deleteChatConversation,
  deleteChatMessage,
  fetchChatMessages,
  markChatRead,
  reportChatConversation,
  sendChatMessage,
  unblockChatUser,
} from '@/lib/api';
import { isChatClientRealtimeEnabled, subscribeConversationChannel } from '@/lib/chat-realtime';
import { useAppStore } from '@/lib/store';
import { CHAT_CONVERSATIONS_QUERY_KEY } from '@/lib/hooks/use-chat-badge-sync';
import type { ChatConversationDTO, ChatMessageDTO } from '@/lib/types';

const MESSAGES_QUERY_KEY = (convoId: string) => ['chat', 'messages', convoId] as const;

function Avatar({ name, image, size = 40 }: { name: string; image: string | null; size?: number }) {
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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
}

// ── Grabación de voz (MediaRecorder) ─────────────────────────
// Permissions-Policy permite microphone=(self) (next.config.ts).
// Si R2 no está configurado (sandbox), presign falla → toast claro.

function useVoiceRecorder(onError: (msg: string) => void) {
  const [state, setState] = useState<'idle' | 'recording'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(async (): Promise<
    { blob: Blob; durationMs: number } | null
  > => {
    const rec = recorderRef.current;
    if (!rec || rec.state !== 'recording') return null;
    const durationMs = Date.now() - startedAtRef.current;
    // onstop ensambla el blob antes de resolver.
    return new Promise((resolve) => {
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        chunksRef.current = [];
        recorderRef.current = null;
        setState('idle');
        setElapsed(0);
        resolve({ blob, durationMs });
      };
      rec.stop();
    });
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.start();
      recorderRef.current = rec;
      startedAtRef.current = Date.now();
      setState('recording');
      timerRef.current = setInterval(
        () => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)),
        500,
      );
    } catch {
      onError('No se pudo acceder al micrófono. Revisa los permisos del navegador.');
    }
  }, [onError]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  return { state, elapsed, start, stop };
}

// ── Componente principal ─────────────────────────────────────

interface ChatWindowProps {
  conversation: ChatConversationDTO;
  onBack: () => void;
}

export default function ChatWindow({ conversation, onBack }: ChatWindowProps) {
  const me = useAppStore((s) => s.user);
  const addNotification = useAppStore((s) => s.addNotification);
  const queryClient = useQueryClient();

  const other = conversation.participants.find((p) => p.id !== me?.id);
  const otherName = other?.name ?? 'Usuario';
  // Moderación (v1.1): ADMIN/MODERATOR pueden eliminar cualquier mensaje.
  const canModerate = me?.role === 'ADMIN' || me?.role === 'MODERATOR';

  const [draft, setDraft] = useState('');
  const [older, setOlder] = useState<{ messages: ChatMessageDTO[]; hasMore: boolean }>({
    messages: [],
    hasMore: false,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmConvoDelete, setConfirmConvoDelete] = useState<'self' | 'everyone' | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>('SPAM');
  const [reportDetails, setReportDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  // Mensajes (polling 3s como red de seguridad; Pusher acelera).
  const { data, isLoading } = useQuery({
    queryKey: MESSAGES_QUERY_KEY(conversation.id),
    queryFn: () => fetchChatMessages(conversation.id),
    staleTime: 2_000,
    // Red de seguridad: 3s en modo polling; con Pusher activo la
    // entrega es por eventos y el polling solo respalda cada 30s.
    refetchInterval: isChatClientRealtimeEnabled() ? 30_000 : 3_000,
    retry: false,
  });

  const messages = [...older.messages, ...(data?.messages ?? [])];
  const hasMore = older.messages.length > 0 ? older.hasMore : (data?.hasMore ?? false);

  // Reset al cambiar de conversación.
  useEffect(() => {
    setOlder({ messages: [], hasMore: false });
    setDraft('');
  }, [conversation.id]);

  // Auto-scroll al fondo si estaba cerca del fondo.
  useEffect(() => {
    if (atBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  // Marcar como leído cuando hay mensajes que no son míos visibles.
  const unreadForMe = (data?.messages ?? []).some(
    (m) => m.senderId && m.senderId !== me?.id,
  );
  const markReadMutation = useMutation({
    mutationFn: () => markChatRead(conversation.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_QUERY_KEY });
    },
  });
  useEffect(() => {
    if (unreadForMe && !markReadMutation.isPending) {
      markReadMutation.mutate();
    }
  }, [unreadForMe, conversation.id]);

  // Realtime (no-op sin Pusher): mensajes en vivo + lecturas.
  useEffect(() => {
    if (!isChatClientRealtimeEnabled()) return;
    let cleanup: (() => void) | undefined;
    void subscribeConversationChannel(conversation.id, {
      onMessage: (message) => {
        queryClient.setQueryData<{ messages: ChatMessageDTO[]; hasMore: boolean }>(
          MESSAGES_QUERY_KEY(conversation.id),
          (prev) => {
            if (!prev) return prev;
            if (prev.messages.some((m) => m.id === message.id)) return prev;
            return { ...prev, messages: [...prev.messages, message] };
          },
        );
        void queryClient.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_QUERY_KEY });
      },
      onRead: () => {
        void queryClient.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_QUERY_KEY });
      },
      onMessageDeleted: ({ id }) => {
        // Tumba instantánea (el contenido ya no está en el cache).
        const tomb = (m: ChatMessageDTO): ChatMessageDTO => ({
          ...m,
          text: null,
          mediaUrl: null,
          durationMs: null,
          deleted: true,
        });
        queryClient.setQueryData<{ messages: ChatMessageDTO[]; hasMore: boolean }>(
          MESSAGES_QUERY_KEY(conversation.id),
          (prev) => (prev ? { ...prev, messages: prev.messages.map(tomb) } : prev),
        );
        setOlder((prev) => ({ ...prev, messages: prev.messages.map(tomb) }));
        void queryClient.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_QUERY_KEY });
      },
    }).then((fn) => {
      cleanup = fn;
    });
    return () => cleanup?.();
  }, [conversation.id, queryClient]);

  // Enviar texto.
  const sendMutation = useMutation({
    mutationFn: (input: Parameters<typeof sendChatMessage>[1]) =>
      sendChatMessage(conversation.id, input),
    onSuccess: (message) => {
      queryClient.setQueryData<{ messages: ChatMessageDTO[]; hasMore: boolean }>(
        MESSAGES_QUERY_KEY(conversation.id),
        (prev) => {
          if (!prev) return { messages: [message], hasMore: false };
          if (prev.messages.some((m) => m.id === message.id)) return prev;
          return { ...prev, messages: [...prev.messages, message] };
        },
      );
      atBottomRef.current = true;
      void queryClient.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_QUERY_KEY });
    },
    onError: (e: Error) => {
      addNotification(e.message === 'BLOCKED' ? 'No puedes escribirle a este usuario.' : e.message, 'info');
    },
    onSettled: () => setSending(false),
  });

  const handleSendText = () => {
    const text = draft.trim();
    if (!text || sendMutation.isPending || conversation.blocked) return;
    setSending(true);
    setDraft('');
    sendMutation.mutate({ kind: 'TEXT', text });
  };

  // Voz: grabar → presign → PUT a R2 → enviar mensaje VOICE.
  const voice = useVoiceRecorder((msg) => addNotification(msg, 'info'));
  const handleVoice = async () => {
    if (voice.state === 'recording') {
      setUploading(true);
      const result = await voice.stop();
      try {
        if (!result) return;
        if (result.durationMs < 500) {
          addNotification('La nota de voz quedó demasiado corta.', 'info');
          return;
        }
        const fileType = result.blob.type || 'audio/webm';
        const presign = await chatUploadPresign('VOICE', fileType);
        const put = await fetch(presign.uploadUrl, {
          method: 'PUT',
          body: result.blob,
          headers: { 'content-type': fileType },
        });
        if (!put.ok) throw new Error('La subida del audio falló');
        sendMutation.mutate({
          kind: 'VOICE',
          mediaUrl: presign.publicUrl,
          mediaKey: presign.key,
          durationMs: result.durationMs,
        });
      } catch (e) {
        addNotification(
          e instanceof Error ? e.message : 'No se pudo enviar la nota de voz.',
          'info',
        );
      } finally {
        setUploading(false);
      }
    } else {
      void voice.start();
    }
  };

  // Moderación.
  const reportMutation = useMutation({
    mutationFn: (messageId?: string) =>
      reportChatConversation(conversation.id, reportReason, reportDetails.trim() || undefined, messageId),
    onSuccess: () => {
      addNotification('Reporte enviado. Gracias por ayudarnos a mantener CONECTA-LT seguro.', 'success');
      setReportOpen(false);
      setReportDetails('');
    },
    onError: (e: Error) => addNotification(e.message, 'info'),
  });

  const blockMutation = useMutation({
    mutationFn: async () => {
      if (!other) return;
      if (conversation.blocked) {
        // Nota: desbloquea solo si YO lo bloqueé (idempotente del otro lado).
        await unblockChatUser(other.id);
      } else {
        await blockChatUser(other.id);
      }
    },
    onSuccess: () => {
      addNotification(
        conversation.blocked ? 'Usuario desbloqueado.' : 'Usuario bloqueado. No podrá enviarte mensajes.',
        'success',
      );
      void queryClient.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_QUERY_KEY });
    },
    onError: (e: Error) => addNotification(e.message, 'info'),
  });

  // Eliminar mi mensaje (o moderación si canModerate). El servidor
  // devuelve el DTO redactado → sustituyo en cache (tumba) al instante.
  const deleteMutation = useMutation({
    mutationFn: (messageId: string) => deleteChatMessage(conversation.id, messageId),
    onSuccess: (dto) => {
      const swap = (m: ChatMessageDTO): ChatMessageDTO => (m.id === dto.id ? dto : m);
      queryClient.setQueryData<{ messages: ChatMessageDTO[]; hasMore: boolean }>(
        MESSAGES_QUERY_KEY(conversation.id),
        (prev) => (prev ? { ...prev, messages: prev.messages.map(swap) } : prev),
      );
      setOlder((prev) => ({ ...prev, messages: prev.messages.map(swap) }));
      setConfirmDeleteId(null);
      void queryClient.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_QUERY_KEY });
    },
    onError: (e: Error) => addNotification(e.message, 'info'),
  });

  // "Eliminar conversación": 'self' la quita solo de mi bandeja;
  // 'everyone' (moderación) la oculta para todos en vivo.
  const deleteConvoMutation = useMutation({
    mutationFn: (scope: 'self' | 'everyone') => deleteChatConversation(conversation.id, scope),
    onSuccess: () => {
      setConfirmConvoDelete(null);
      setMenuOpen(false);
      void queryClient.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_QUERY_KEY });
      onBack();
      addNotification('Conversación eliminada.', 'success');
    },
    onError: (e: Error) => addNotification(e.message, 'info'),
  });

  const loadOlder = async () => {
    const oldest = older.messages[0]?.createdAt ?? data?.messages[0]?.createdAt;
    if (!oldest) return;
    try {
      const page = await fetchChatMessages(conversation.id, oldest);
      setOlder((prev) => ({
        messages: [...page.messages, ...prev.messages],
        hasMore: page.hasMore,
      }));
    } catch {
      addNotification('No se pudieron cargar los mensajes anteriores.', 'info');
    }
  };

  return (
    <div className="glass-card flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 sm:p-4 border-b border-white/10 bg-obsidian/60">
        <button
          onClick={onBack}
          className="md:hidden p-1.5 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Volver a la bandeja"
        >
          <ArrowLeft size={18} />
        </button>
        <Avatar name={otherName} image={other?.image ?? null} size={40} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{otherName}</p>
          <p className="text-xs text-white/40">
            {conversation.blocked ? 'Conversación bloqueada' : 'Chat privado de CONECTA-LT'}
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/70"
            aria-label="Opciones de la conversación"
            aria-expanded={menuOpen}
          >
            <MoreVertical size={18} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-30 w-48 rounded-xl border border-white/10 bg-obsidian shadow-xl py-1"
              role="menu"
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setReportOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
                role="menuitem"
              >
                <Flag size={14} /> Reportar conversación
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  blockMutation.mutate();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/10 transition-colors"
                role="menuitem"
              >
                <Ban size={14} /> {conversation.blocked ? 'Desbloquear' : 'Bloquear'} usuario
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmConvoDelete('self');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/10 transition-colors"
                role="menuitem"
              >
                <Trash2 size={14} /> Eliminar conversación
              </button>
              {canModerate && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmConvoDelete('everyone');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/10 transition-colors"
                  role="menuitem"
                >
                  <Trash2 size={14} /> Eliminar para todos (moderación)
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reporte (básico) */}
      {reportOpen && (
        <div className="p-4 border-b border-white/10 bg-white/5 space-y-3">
          <p className="text-sm font-semibold text-white">¿Por qué reportas esta conversación?</p>
          <div className="flex flex-wrap gap-2">
            {CHAT_REPORT_REASONS.map((r) => (
              <button
                key={r.value}
                onClick={() => setReportReason(r.value)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  reportReason === r.value
                    ? 'border-gold bg-gold/20 text-gold'
                    : 'border-white/20 text-white/70 hover:border-white/40'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <textarea
            value={reportDetails}
            onChange={(e) => setReportDetails(e.target.value)}
            placeholder="Detalles opcionales (máx. 1000 caracteres)"
            maxLength={1000}
            rows={2}
            className="w-full rounded-lg bg-obsidian/70 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/60"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setReportOpen(false)}
              className="text-xs px-3 py-2 rounded-full border border-white/20 text-white/70 hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              onClick={() => reportMutation.mutate(undefined)}
              disabled={reportMutation.isPending}
              className="text-xs px-4 py-2 rounded-full bg-gold text-obsidian font-semibold hover:bg-gold/90 disabled:opacity-50"
            >
              {reportMutation.isPending ? 'Enviando…' : 'Enviar reporte'}
            </button>
          </div>
        </div>
      )}

      {/* Confirmación de eliminar conversación */}
      {confirmConvoDelete && (
        <div className="p-4 border-b border-white/10 bg-red-500/5 space-y-2">
          <p className="text-sm text-white/80">
            {confirmConvoDelete === 'everyone'
              ? '¿Eliminar esta conversación para TODOS los participantes? (moderación)'
              : '¿Eliminar esta conversación? Solo desaparece de tu bandeja; si te escriben de nuevo, reaparece.'}
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setConfirmConvoDelete(null)}
              className="text-xs px-3 py-2 rounded-full border border-white/20 text-white/70 hover:bg-white/10 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => deleteConvoMutation.mutate(confirmConvoDelete)}
              disabled={deleteConvoMutation.isPending}
              className="text-xs px-4 py-2 rounded-full bg-red-500/90 text-white font-semibold hover:bg-red-500 disabled:opacity-50 transition-colors"
            >
              {deleteConvoMutation.isPending ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        </div>
      )}

      {/* Mensajes */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-2 min-h-0"
      >
        {isLoading && messages.length === 0 && (
          <div className="flex items-center justify-center py-8 text-white/40 text-sm">
            <Loader2 className="animate-spin mr-2" size={16} /> Cargando mensajes…
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className="text-center py-10 space-y-2">
            <p className="text-white/60 text-sm">Aún no hay mensajes.</p>
            <p className="text-white/35 text-xs">
              Escribe el primer mensaje para romper el hielo.
            </p>
          </div>
        )}
        {hasMore && messages.length > 0 && (
          <div className="flex justify-center pb-2">
            <button
              onClick={() => void loadOlder()}
              className="text-xs px-3 py-1.5 rounded-full border border-white/15 text-white/60 hover:bg-white/10 transition-colors"
            >
              Cargar mensajes anteriores
            </button>
          </div>
        )}
        {messages.map((m) => {
          const mine = m.senderId === me?.id;
          // Autor puede eliminar el suyo; moderación cualquiera no borrado.
          const canDelete = !m.deleted && (mine || canModerate);
          return (
            <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              <div className={`group flex items-center gap-1.5 ${mine ? 'flex-row-reverse' : ''}`}>
                {canDelete && (
                  <button
                    onClick={() => setConfirmDeleteId((v) => (v === m.id ? null : m.id))}
                    className="p-1 rounded-full text-white/30 hover:text-red-400 hover:bg-white/10 transition-colors opacity-60 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 shrink-0"
                    aria-label="Eliminar mensaje"
                    aria-expanded={confirmDeleteId === m.id}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
                <div
                  className={`max-w-[78%] sm:max-w-[65%] rounded-2xl px-3.5 py-2 text-sm ${
                    m.deleted
                      ? 'bg-white/5 text-white/45 italic rounded-br-md'
                      : mine
                        ? 'bg-gold text-obsidian rounded-br-md'
                        : 'bg-white/10 text-white rounded-bl-md'
                  }`}
                >
                  {m.deleted ? (
                    <p className="italic">
                      {m.moderated ? 'Mensaje eliminado por moderación' : 'Mensaje eliminado'}
                    </p>
                  ) : (
                    <>
                      {m.kind === 'TEXT' && (
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      )}
                      {m.kind === 'VOICE' && (
                        <div className="flex items-center gap-2">
                          <Mic size={14} aria-hidden />
                          <audio
                            controls
                            src={m.mediaUrl ?? ''}
                            className="max-w-[200px] h-8"
                            preload="none"
                          />
                          {typeof m.durationMs === 'number' && (
                            <span className="text-xs opacity-70">
                              {Math.round(m.durationMs / 1000)}s
                            </span>
                          )}
                        </div>
                      )}
                      <span
                        className={`block text-[10px] mt-0.5 ${mine ? 'text-obsidian/60 text-right' : 'text-white/40'}`}
                      >
                        {formatTime(m.createdAt)}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {confirmDeleteId === m.id && (
                <div className="mt-1 flex items-center gap-2 text-xs text-white/60">
                  <span>¿Eliminar este mensaje?</span>
                  <button
                    onClick={() => deleteMutation.mutate(m.id)}
                    disabled={deleteMutation.isPending}
                    className="px-2.5 py-1 rounded-full bg-red-500/90 text-white font-medium hover:bg-red-500 disabled:opacity-50 transition-colors"
                  >
                    {deleteMutation.isPending ? 'Eliminando…' : 'Eliminar'}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-2.5 py-1 rounded-full border border-white/20 hover:bg-white/10 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Composer */}
      {conversation.blocked ? (
        <div className="p-4 border-t border-white/10 text-center text-sm text-white/50">
          {other && other.id === me?.id ? null : (
            <span>
              Esta conversación está bloqueada.{' '}
              <button
                onClick={() => blockMutation.mutate()}
                className="text-gold underline underline-offset-2"
              >
                Desbloquear
              </button>
            </span>
          )}
        </div>
      ) : (
        <div className="p-3 sm:p-4 border-t border-white/10 flex items-end gap-2">
          <button
            onClick={() => void handleVoice()}
            disabled={uploading || sendMutation.isPending}
            className={`p-2.5 rounded-full transition-colors shrink-0 ${
              voice.state === 'recording'
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            } disabled:opacity-50`}
            aria-label={voice.state === 'recording' ? 'Detener grabación' : 'Grabar nota de voz'}
            title={voice.state === 'recording' ? `Grabando… ${voice.elapsed}s` : 'Nota de voz'}
          >
            {voice.state === 'recording' ? <Square size={16} /> : <Mic size={16} />}
          </button>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendText();
              }
            }}
            placeholder="Escribe un mensaje…"
            rows={1}
            maxLength={4000}
            className="flex-1 resize-none max-h-32 rounded-2xl bg-obsidian/70 border border-white/15 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/60"
            aria-label="Escribe un mensaje"
          />
          <button
            onClick={handleSendText}
            disabled={!draft.trim() || sending}
            className="p-2.5 rounded-full bg-gold text-obsidian hover:bg-gold/90 transition-colors shrink-0 disabled:opacity-40"
            aria-label="Enviar mensaje"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      )}
    </div>
  );
}
