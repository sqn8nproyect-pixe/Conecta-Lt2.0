'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT — PublicReservationCard
//
// Componente cliente que muestra la info de una reserva pública.
// Si el visitante está autenticado como BUSINESS_OWNER del negocio
// de la reserva (o ADMIN), muestra datos completos + botón
// "Confirmar llegada" (marca COMPLETED).
//
// Recibe la data server-side (info pública). Para mostrar datos del
// cliente o el botón de confirmación, hace un fetch a
// /api/reservations/lookup/[code] que respeta ownership.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  CheckCircle2,
  Clock,
  MapPin,
  Users,
  Calendar,
  XCircle,
  Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { QRCode } from '@/components/ui/qrcode';

interface PublicReservationData {
  id: string;
  confirmationCode: string;
  status: string;
  date: string;
  time: string;
  guests: number;
  notes: string | null;
  name: string;
  phone: string;
  email: string | null;
  rejectionReason: string | null;
  business: {
    id: string;
    name: string;
    slug: string;
    address: string;
    coverImage: string | null;
    phone: string | null;
  };
}

interface LookupFullData {
  reservation: {
    id: string;
    confirmationCode: string;
    status: string;
    date: string;
    time: string;
    guests: number;
    notes: string | null;
    name: string;
    phone: string;
    email: string | null;
    rejectionReason: string | null;
    business: {
      id: string;
      name: string;
      slug: string;
      address: string;
      coverImage: string | null;
    };
  };
  authenticated: boolean;
  hasOwnership: boolean;
}

const STATUS_META: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: 'Pendiente', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30', icon: Clock },
  CONFIRMED: { label: 'Confirmada', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: CheckCircle2 },
  REJECTED: { label: 'Rechazada', color: 'bg-red-500/15 text-red-300 border-red-500/30', icon: XCircle },
  CANCELLED: { label: 'Cancelada', color: 'bg-white/5 text-white/40 border-white/10', icon: XCircle },
  COMPLETED: { label: 'Completada', color: 'bg-sky-500/15 text-sky-300 border-sky-500/30', icon: CheckCircle2 },
  NO_SHOW: { label: 'No asistió', color: 'bg-red-500/15 text-red-300 border-red-500/30', icon: XCircle },
};

export function PublicReservationCard({ reservation }: { reservation: PublicReservationData }) {
  const { data: session } = useSession();
  const [fullData, setFullData] = useState<LookupFullData | null>(null);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Si el visitante está autenticado, intentar cargar datos completos
  // (con ownership check del backend)
  useEffect(() => {
    if (session?.user) {
      setLoadingLookup(true);
      fetch(`/api/reservations/lookup/${encodeURIComponent(reservation.confirmationCode)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && data.hasOwnership) {
            setFullData(data);
          }
        })
        .catch(() => {
          // Ignorar — se queda con la info pública
        })
        .finally(() => setLoadingLookup(false));
    }
  }, [session, reservation.confirmationCode]);

  // Datos a mostrar: si el visitante es dueño/admin con ownership,
  // usar los datos completos; si no, usar la info pública del SSR.
  const display = fullData?.reservation ?? reservation;
  const hasOwnership = fullData?.hasOwnership === true;
  const statusInfo = STATUS_META[reservation.status] ?? STATUS_META.PENDING;
  const StatusIcon = statusInfo.icon;

  // ¿Mostrar el botón "Confirmar llegada"?
  // Solo si el visitante es dueño con ownership Y la reserva está CONFIRMED
  // (no PENDING — primero hay que confirmar la reserva, luego la llegada)
  const canConfirmArrival =
    hasOwnership &&
    reservation.status === 'CONFIRMED' &&
    !confirmed;

  const handleConfirmArrival = async () => {
    if (!display.business.slug || !display.id) return;
    setConfirming(true);
    try {
      const res = await fetch(
        `/api/owner/businesses/${display.business.slug}/reservations/${display.id}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'COMPLETED' }),
        },
      );
      if (res.ok) {
        setConfirmed(true);
      }
    } catch {
      // ignore
    } finally {
      setConfirming(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('es-VE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card rounded-3xl overflow-hidden"
      >
        {/* Header con cover del negocio */}
        {reservation.business.coverImage && (
          <div className="relative h-32 overflow-hidden">
            <img
              src={reservation.business.coverImage}
              alt={reservation.business.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/60 to-transparent" />
          </div>
        )}

        <div className="p-6 -mt-8 relative">
          {/* Badge de status */}
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${statusInfo.color}`}>
            <StatusIcon size={12} />
            {statusInfo.label}
          </div>

          {/* Nombre del negocio */}
          <h1 className="font-serif text-2xl text-gold mt-3 mb-1">
            {reservation.business.name}
          </h1>

          {/* Dirección */}
          {reservation.business.address && (
            <div className="flex items-start gap-1.5 text-white/60 text-xs mb-4">
              <MapPin size={12} className="mt-0.5 shrink-0" />
              <span>{reservation.business.address}</span>
            </div>
          )}

          {/* Código de confirmación + QR */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="bg-white p-2 rounded-lg shrink-0">
                <QRCode value={reservation.confirmationCode} size={96} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-white/40 font-mono tracking-widest uppercase mb-1">
                  Código de reserva
                </div>
                <div className="text-xl text-gold font-bold font-mono break-all">
                  {reservation.confirmationCode}
                </div>
                <div className="text-[10px] text-white/40 mt-1">
                  Muestra este código en la entrada
                </div>
              </div>
            </div>
          </div>

          {/* Detalles de la reserva */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <Calendar size={16} className="mx-auto text-gold mb-1" />
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Fecha</div>
              <div className="text-xs text-white font-medium capitalize">
                {formatDate(reservation.date)}
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <Clock size={16} className="mx-auto text-gold mb-1" />
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Hora</div>
              <div className="text-xs text-white font-medium">
                {reservation.time}
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <Users size={16} className="mx-auto text-gold mb-1" />
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Personas</div>
              <div className="text-xs text-white font-medium">
                {reservation.guests}
              </div>
            </div>
          </div>

          {/* Motivo del rechazo (si aplica) */}
          {reservation.status === 'REJECTED' && reservation.rejectionReason && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
              <div className="text-[10px] text-red-300/80 uppercase tracking-wider mb-1 flex items-center gap-1">
                <XCircle size={10} /> Motivo del rechazo
              </div>
              <p className="text-xs text-red-200">{reservation.rejectionReason}</p>
            </div>
          )}

          {/* Datos del cliente (SOLO si el visitante es dueño con ownership) */}
          {hasOwnership && (
            <div className="bg-gold/5 border border-gold/20 rounded-xl p-3 mb-4">
              <div className="text-[10px] text-gold/80 uppercase tracking-wider mb-2 flex items-center gap-1">
                <CheckCircle2 size={10} /> Datos del cliente (dueño)
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/40">Nombre:</span>
                  <span className="text-white font-medium">{display.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Teléfono:</span>
                  <span className="text-white font-mono">{display.phone}</span>
                </div>
                {display.email && (
                  <div className="flex justify-between">
                    <span className="text-white/40">Email:</span>
                    <span className="text-white font-mono truncate ml-2">{display.email}</span>
                  </div>
                )}
                {display.notes && (
                  <div className="pt-2 border-t border-white/10 mt-2">
                    <span className="text-white/40 block mb-1">Notas:</span>
                    <span className="text-white/80">{display.notes}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botón "Confirmar llegada" (SOLO dueño + status CONFIRMED) */}
          {canConfirmArrival && (
            <button
              onClick={handleConfirmArrival}
              disabled={confirming}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50"
            >
              {confirming ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Confirmando...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Confirmar llegada
                </>
              )}
            </button>
          )}

          {/* Mensaje de llegada confirmada */}
          {confirmed && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
              <CheckCircle2 size={24} className="mx-auto text-emerald-300 mb-1" />
              <div className="text-sm text-emerald-200 font-semibold">Llegada confirmada</div>
              <div className="text-xs text-white/60 mt-1">La reserva fue marcada como completada</div>
            </div>
          )}

          {/* Loading state para dueño */}
          {loadingLookup && (
            <div className="text-center text-xs text-white/40 py-2">
              <Loader2 size={14} className="animate-spin inline mr-1" />
              Verificando permisos...
            </div>
          )}

          {/* CTA al negocio */}
          <a
            href="/"
            className="block text-center text-xs text-white/40 hover:text-gold mt-4 transition-colors"
          >
            ← Volver a CONECTA-LT
          </a>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="text-center mt-6">
        <div className="text-[10px] text-white/30 font-mono tracking-widest uppercase">
          CONECTA-LT · Los Teques
        </div>
      </div>
    </div>
  );
}
