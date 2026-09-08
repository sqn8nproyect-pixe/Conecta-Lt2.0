'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — PendingPhotosTab (Etapa de moderación de fotos)
//
// Pestaña "Fotos Pendientes" del AdminDashboard. Lista todas las
// imágenes BusinessImage con approvalStatus=PENDING y permite al
// admin aprobarlas (las hace visibles al público) o rechazarlas
// (no se eliminan pero no se muestran).
//
// Data fetching:
//   GET /api/admin/images/pending → { images: PendingImage[], count }
//
// Mutations:
//   POST /api/admin/images/[imageId]/approve   (sin body)
//   POST /api/admin/images/[imageId]/reject     (body opcional { reason })
//
// Notificaciones: usa useAppStore.addNotification para toasts.
// Visual: misma estética que el resto del admin (glass-card, gold,
// obsidian, shadcn/ui).
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Check,
  X,
  Clock,
  ImageIcon,
  AlertCircle,
  RotateCcw,
  Store,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { formatRelativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

// ─── Tipos ────────────────────────────────────────────────────
// Refleja exactamente lo que devuelve GET /api/admin/images/pending.
// No lo importamos de @/lib/types para mantener esta pestaña
// autocontenida (la API es lo único que cambia y si lo hace, lo
// hacemos aquí).
type ImageType = 'COVER' | 'GALLERY' | 'LOGO' | 'MENU';

type PendingImage = {
  id: string;
  businessId: string;
  url: string;
  storageKey?: string | null;
  type: ImageType;
  sortOrder: number;
  approvalStatus: 'PENDING';
  approvedById?: string | null;
  approvedAt?: string | Date | null;
  createdAt?: string | Date;
  business: {
    id: string;
    slug: string;
    name: string;
  };
};

type PendingResponse = {
  images: PendingImage[];
  count: number;
};

// Query key — público para que el AdminDashboard pueda prefetch
// o invalidar si en el futuro se aprueba desde otro lado.
export const QK_PENDING_IMAGES = ['admin', 'images', 'pending'] as const;

// ─── Etiquetas por tipo de imagen ────────────────────────────
const IMAGE_TYPE_LABELS: Record<ImageType, string> = {
  COVER: 'Portada',
  GALLERY: 'Galería',
  LOGO: 'Logo',
  MENU: 'Menú',
};

// Color del badge según el tipo — sirve para distinguir rápido
// una foto de portada (más visible) de una de galería.
const IMAGE_TYPE_BADGE_CLASS: Record<ImageType, string> = {
  COVER: 'bg-gold/15 text-gold border-gold/30',
  GALLERY: 'bg-white/5 text-white/70 border-white/15',
  LOGO: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  MENU: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

// ─── Helpers de fetch ────────────────────────────────────────
async function fetchPendingImages(): Promise<PendingResponse> {
  const res = await fetch('/api/admin/images/pending');
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Error' }));
    throw new Error(data.error ?? 'Error al cargar fotos pendientes');
  }
  return res.json();
}

async function approveImage(imageId: string): Promise<void> {
  const res = await fetch(`/api/admin/images/${imageId}/approve`, {
    method: 'POST',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Error' }));
    throw new Error(data.error ?? 'Error al aprobar la foto');
  }
}

async function rejectImage(
  imageId: string,
  reason?: string,
): Promise<void> {
  const res = await fetch(`/api/admin/images/${imageId}/reject`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reason: reason?.trim() || undefined }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Error' }));
    throw new Error(data.error ?? 'Error al rechazar la foto');
  }
}

// ─── Skeleton card ───────────────────────────────────────────
function PhotoCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <Skeleton className="w-full h-44 rounded-none bg-white/5" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded bg-white/5" />
          <Skeleton className="h-4 flex-1 max-w-[140px] bg-white/5" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-3 rounded bg-white/5" />
          <Skeleton className="h-3 w-24 bg-white/5" />
        </div>
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-9 flex-1 bg-white/5" />
          <Skeleton className="h-9 flex-1 bg-white/5" />
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="glass-card rounded-2xl p-10 sm:p-16 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-16 h-16 mx-auto mb-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center"
      >
        <Check className="text-emerald-300" size={28} />
      </motion.div>
      <h3 className="font-serif text-lg sm:text-xl font-bold text-white mb-2">
        No hay fotos pendientes de aprobación
      </h3>
      <p className="text-white/50 text-sm max-w-md mx-auto leading-relaxed">
        Cuando los dueños de negocios suban fotos nuevas, aparecerán
        aquí para que las revises antes de publicarlas.
      </p>
    </div>
  );
}

// ─── Error state ─────────────────────────────────────────────
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="glass-card rounded-2xl p-10 text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
        <AlertCircle className="text-red-400" size={24} />
      </div>
      <p className="text-white text-sm font-semibold mb-1">
        No se pudieron cargar las fotos pendientes
      </p>
      <p className="text-white/50 text-xs mb-5">
        Revisa tu conexión e inténtalo de nuevo.
      </p>
      <Button
        onClick={onRetry}
        className="bg-gold text-obsidian hover:bg-gold/80 font-semibold"
      >
        <RotateCcw size={14} className="mr-1.5" />
        Reintentar
      </Button>
    </div>
  );
}

// ─── PhotoCard ───────────────────────────────────────────────
// Tarjeta individual para cada foto pendiente.
function PhotoCard({
  image,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  image: PendingImage;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const busy = isApproving || isRejecting;
  const typeLabel = IMAGE_TYPE_LABELS[image.type] ?? image.type;
  const typeBadgeClass =
    IMAGE_TYPE_BADGE_CLASS[image.type] ??
    'bg-white/5 text-white/70 border-white/15';

  // createdAt viene como string ISO o Date; normalizamos a ISO string.
  const createdAt = image.createdAt
    ? typeof image.createdAt === 'string'
      ? image.createdAt
      : image.createdAt.toISOString()
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22 }}
      className="glass-card rounded-2xl overflow-hidden flex flex-col"
    >
      {/* Imagen */}
      <div className="relative aspect-[4/3] bg-white/[0.03] overflow-hidden">
        {/* Imagen de la foto pendiente — usamos <img> en vez de
            next/image porque las URLs son dinámicas (R2) y el ancho
            fijo del thumbnail no justifica el overhead de optimización. */}
        <img
          src={image.url}
          alt={`Foto de ${image.business.name} (${typeLabel})`}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
        {/* Badge tipo sobre la imagen */}
        <div className="absolute top-2 left-2">
          <Badge
            variant="outline"
            className={`text-[10px] font-bold tracking-wider uppercase backdrop-blur-sm ${typeBadgeClass}`}
          >
            {typeLabel}
          </Badge>
        </div>
        {/* Overlay sutil para legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Info + acciones */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Store size={13} className="text-gold shrink-0" />
            <span className="text-white text-sm font-semibold truncate">
              {image.business.name}
            </span>
          </div>
          {createdAt && (
            <div className="flex items-center gap-1.5">
              <Clock size={11} className="text-white/40 shrink-0" />
              <span
                className="text-white/40 text-xs"
                title={new Date(createdAt).toLocaleString('es-VE')}
              >
                Subida {formatRelativeTime(createdAt)}
              </span>
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex gap-2 mt-auto">
          <Button
            onClick={onApprove}
            disabled={busy}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold border border-emerald-400/20 disabled:opacity-50"
          >
            {isApproving ? (
              <Loader2 size={14} className="mr-1.5 animate-spin" />
            ) : (
              <Check size={14} className="mr-1.5" />
            )}
            Aprobar
          </Button>
          <Button
            onClick={onReject}
            disabled={busy}
            variant="outline"
            className="flex-1 border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:border-red-500/60 font-semibold disabled:opacity-50"
          >
            {isRejecting ? (
              <Loader2 size={14} className="mr-1.5 animate-spin" />
            ) : (
              <X size={14} className="mr-1.5" />
            )}
            Rechazar
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── RejectDialog ────────────────────────────────────────────
// Dialog pequeño con un textarea opcional para el motivo del
// rechazo. El motivo se envía al backend y se incluye en la
// notificación que recibe el dueño.
function RejectDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  businessName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
  businessName: string;
}) {
  const [reason, setReason] = useState('');

  // Reset al cerrar/abrir
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      // Limpiar después de la animación de cierre
      setTimeout(() => setReason(''), 150);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-obsidian border-red-500/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center">
              <X className="text-red-300" size={16} />
            </div>
            Rechazar foto
          </DialogTitle>
          <DialogDescription className="text-white/60">
            La foto de{' '}
            <span className="text-white font-medium">{businessName}</span> no
            será visible al público. El dueño recibirá una notificación.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <label
            htmlFor="reject-reason"
            className="text-xs font-semibold text-white/70 uppercase tracking-wider"
          >
            Motivo <span className="text-white/40 normal-case font-normal">(opcional)</span>
          </label>
          <Textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: la imagen no corresponde al negocio, calidad muy baja, contenido inapropiado…"
            maxLength={200}
            className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:border-red-500/50 focus-visible:ring-red-500/20 min-h-20"
          />
          <p className="text-[10px] text-white/40 text-right">
            {reason.length}/200
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
            className="border-white/15 text-white hover:bg-white/5"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(reason)}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-500 text-white border border-red-400/20"
          >
            {isPending ? (
              <Loader2 size={14} className="mr-1.5 animate-spin" />
            ) : (
              <X size={14} className="mr-1.5" />
            )}
            Confirmar rechazo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Componente principal ───────────────────────────────────
export function PendingPhotosTab() {
  const addNotification = useAppStore((s) => s.addNotification);
  const queryClient = useQueryClient();

  // Estado del dialog de rechazo: imageId + businessName del
  // target. null → dialog cerrado.
  const [rejectTarget, setRejectTarget] = useState<{
    imageId: string;
    businessName: string;
  } | null>(null);

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery<PendingResponse>({
    queryKey: QK_PENDING_IMAGES,
    queryFn: fetchPendingImages,
    staleTime: 30_000,
  });

  // Id que se está procesando (aprobando o rechazando) para
  // deshabilitar botones y mostrar spinner en esa tarjeta.
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    'approve' | 'reject' | null
  >(null);

  // ─── Mutation: aprobar ───
  const approveMutation = useMutation({
    mutationFn: (imageId: string) => approveImage(imageId),
    onMutate: (imageId) => {
      setPendingId(imageId);
      setPendingAction('approve');
    },
    onSuccess: (_data, imageId) => {
      // Remover la imagen aprobada del cache (optimista)
      queryClient.setQueryData<PendingResponse>(QK_PENDING_IMAGES, (old) => {
        if (!old) return old;
        return {
          images: old.images.filter((img) => img.id !== imageId),
          count: Math.max(0, old.count - 1),
        };
      });
      addNotification('Foto aprobada y publicada', 'success');
      // Refrescar en background para asegurar consistencia con el backend
      queryClient.invalidateQueries({ queryKey: QK_PENDING_IMAGES });
    },
    onError: (err: Error) => {
      addNotification(err.message ?? 'Error al aprobar foto', 'info');
    },
    onSettled: () => {
      setPendingId(null);
      setPendingAction(null);
    },
  });

  // ─── Mutation: rechazar ───
  const rejectMutation = useMutation({
    mutationFn: ({ imageId, reason }: { imageId: string; reason?: string }) =>
      rejectImage(imageId, reason),
    onMutate: ({ imageId }) => {
      setPendingId(imageId);
      setPendingAction('reject');
    },
    onSuccess: (_data, { imageId }) => {
      queryClient.setQueryData<PendingResponse>(QK_PENDING_IMAGES, (old) => {
        if (!old) return old;
        return {
          images: old.images.filter((img) => img.id !== imageId),
          count: Math.max(0, old.count - 1),
        };
      });
      addNotification('Foto rechazada', 'success');
      queryClient.invalidateQueries({ queryKey: QK_PENDING_IMAGES });
    },
    onError: (err: Error) => {
      addNotification(err.message ?? 'Error al rechazar foto', 'info');
    },
    onSettled: () => {
      setPendingId(null);
      setPendingAction(null);
      setRejectTarget(null);
    },
  });

  const handleApprove = (imageId: string) => {
    approveMutation.mutate(imageId);
  };

  const handleOpenReject = (image: PendingImage) => {
    setRejectTarget({ imageId: image.id, businessName: image.business.name });
  };

  const handleConfirmReject = (reason: string) => {
    if (!rejectTarget) return;
    rejectMutation.mutate({
      imageId: rejectTarget.imageId,
      reason: reason.trim() || undefined,
    });
  };

  const images = data?.images ?? [];
  const count = data?.count ?? 0;

  return (
    <div className="space-y-5">
      {/* ─── Header ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center">
            <Camera className="text-gold" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Fotos pendientes de aprobación
            </h2>
            <p className="text-white/50 text-xs">
              {count === 0
                ? 'Sin pendientes ahora mismo'
                : `${count} ${count === 1 ? 'foto esperando' : 'fotos esperando'} revisión`}
            </p>
          </div>
        </div>
        {count > 0 && (
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-white/15 text-white/70 hover:bg-white/5 hover:text-white"
          >
            <RotateCcw
              size={14}
              className={`mr-1.5 ${isFetching ? 'animate-spin' : ''}`}
            />
            Actualizar
          </Button>
        )}
      </div>

      {/* ─── Loading ─────────────────────────────────────── */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <PhotoCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* ─── Error ───────────────────────────────────────── */}
      {isError && !isLoading && <ErrorState onRetry={() => refetch()} />}

      {/* ─── Empty ───────────────────────────────────────── */}
      {!isLoading && !isError && images.length === 0 && <EmptyState />}

      {/* ─── Lista de fotos ──────────────────────────────── */}
      {!isLoading && !isError && images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {images.map((image) => (
              <PhotoCard
                key={image.id}
                image={image}
                onApprove={() => handleApprove(image.id)}
                onReject={() => handleOpenReject(image)}
                isApproving={
                  pendingId === image.id && pendingAction === 'approve'
                }
                isRejecting={
                  pendingId === image.id && pendingAction === 'reject'
                }
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ─── Ayuda contextual ────────────────────────────── */}
      {!isLoading && !isError && images.length > 0 && (
        <div className="glass-card rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <ImageIcon className="text-white/50" size={14} />
          </div>
          <div className="text-xs text-white/60 leading-relaxed">
            <span className="text-white/80 font-semibold">Cómo funciona:</span>{' '}
            al aprobar, la foto se hace visible inmediatamente en la ficha
            pública del negocio. Al rechazar, queda oculta y el dueño recibe
            una notificación con tu motivo (si lo incluiste).
          </div>
        </div>
      )}

      {/* ─── Dialog de rechazo ───────────────────────────── */}
      <RejectDialog
        open={rejectTarget !== null}
        onOpenChange={(next) => {
          if (!next) setRejectTarget(null);
        }}
        onConfirm={handleConfirmReject}
        isPending={rejectMutation.isPending}
        businessName={rejectTarget?.businessName ?? ''}
      />
    </div>
  );
}

export default PendingPhotosTab;
