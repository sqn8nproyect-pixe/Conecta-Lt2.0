'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — OwnerDashboard (Etapa 7.C.2)
//
// The business-owner panel — surfaced when a BUSINESS_OWNER clicks
// "Mis Locales" in the Navbar (only visible to that role).
//
// Layout: a sticky header with title + business selector + tab bar
// + "Salir" button, followed by a tabbed content area:
//
//   1. Info        — edit basic info / hours / socials (3 form cards)
//   2. Reservas    — list reservations for the business, change
//                    status (PENDING → CONFIRMED → COMPLETED/NO_SHOW)
//   3. Promociones — list all promotions, create / publish / pause /
//                    resume / edit
//
// Access control: the view itself is gated by a role check at the
// top — a non-BUSINESS_OWNER/ADMIN user who lands here sees an
// AccessDenied card. The Navbar also hides the "Mis Locales" entry
// for non-business-owners, so this is defense-in-depth.
//
// Mutations: each form/table uses useMutation with optimistic update
// + rollback on error. After success, we invalidate the relevant
// query keys so the public-facing pages stay in sync.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Store,
  CalendarClock,
  Ticket,
  Lock,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  Pencil,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import {
  fetchBusinesses,
  fetchOwnerBusiness,
  updateOwnerBusiness,
  updateOwnerHours,
  updateOwnerSocials,
  fetchOwnerReservations,
  updateOwnerReservationStatus,
  fetchOwnerPromotions,
  createOwnerPromotion,
  updateOwnerPromotion,
} from '@/lib/api';
import type {
  OwnerBusiness,
  OwnerPromotion,
  OwnerReservation,
  PromotionStatus,
  ReservationStatus,
} from '@/lib/types';
import { formatRelativeTime } from '@/lib/utils';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

// Query keys — kept here because they're only consumed by this component.
const QK_OWNER_BUSINESSES = ['owner', 'businesses'] as const;
const QK_OWNER_BUSINESS = (slug: string) => ['owner', 'business', slug] as const;
const QK_OWNER_RESERVATIONS = (slug: string, status: string, date: string) =>
  ['owner', 'reservations', slug, status, date] as const;
const QK_OWNER_PROMOTIONS = (slug: string) =>
  ['owner', 'promotions', slug] as const;

// ─── Day-of-week helpers ──────────────────────────────────────
// Schema: 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
// UI: Monday-first ordering (Lun, Mar, Mié, Jue, Vie, Sáb, Dom)
const DAY_LABELS: Array<{ dayOfWeek: number; label: string }> = [
  { dayOfWeek: 1, label: 'Lunes' },
  { dayOfWeek: 2, label: 'Martes' },
  { dayOfWeek: 3, label: 'Miércoles' },
  { dayOfWeek: 4, label: 'Jueves' },
  { dayOfWeek: 5, label: 'Viernes' },
  { dayOfWeek: 6, label: 'Sábado' },
  { dayOfWeek: 0, label: 'Domingo' },
];

const SOCIAL_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'TWITTER', label: 'Twitter' },
  { value: 'WEBSITE', label: 'Sitio web' },
  { value: 'PHONE', label: 'Teléfono' },
];

// ─── AccessDenied ──────────────────────────────────────────────
function AccessDenied() {
  const setView = useAppStore((s) => s.setView);
  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-32 text-center">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card rounded-3xl p-8 sm:p-10"
      >
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
          <Lock className="text-red-400" size={28} />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-3">
          Acceso restringido
        </h1>
        <p className="text-white/60 text-sm leading-relaxed mb-8">
          No tienes permisos para ver esta página. Esta área está reservada
          para dueños de negocio.
        </p>
        <button
          onClick={() => setView('home')}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-obsidian font-bold hover:bg-gold hover:text-obsidian active:scale-95 transition-all text-sm tracking-wider glow-gold"
        >
          <Briefcase size={16} /> IR AL INICIO
        </button>
      </motion.div>
    </div>
  );
}

// ─── Skeleton helpers ──────────────────────────────────────────
function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 rounded-lg" />
      ))}
    </div>
  );
}

// ─── Status badges ─────────────────────────────────────────────

function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  const map: Record<ReservationStatus, string> = {
    PENDING: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    CONFIRMED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    COMPLETED: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    NO_SHOW: 'bg-red-500/15 text-red-300 border-red-500/30',
    CANCELLED: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
  };
  const labels: Record<ReservationStatus, string> = {
    PENDING: 'PENDIENTE',
    CONFIRMED: 'CONFIRMADA',
    COMPLETED: 'COMPLETADA',
    NO_SHOW: 'NO ASISTIÓ',
    CANCELLED: 'CANCELADA',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest border ${map[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function PromotionStatusBadge({ status }: { status: PromotionStatus }) {
  const map: Record<PromotionStatus, string> = {
    ACTIVE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    DRAFT: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    PAUSED: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    EXPIRED: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
  };
  const labels: Record<PromotionStatus, string> = {
    ACTIVE: 'ACTIVA',
    DRAFT: 'BORRADOR',
    PAUSED: 'PAUSADA',
    EXPIRED: 'EXPIRADA',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest border ${map[status]}`}
    >
      {labels[status]}
    </span>
  );
}

// ─── Tab 1: Info ───────────────────────────────────────────────

function InfoTab({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const addNotification = useAppStore((s) => s.addNotification);

  const { data: business, isLoading, isError } = useQuery({
    queryKey: QK_OWNER_BUSINESS(slug),
    queryFn: () => fetchOwnerBusiness(slug),
    staleTime: 30_000,
  });

  // Local form state — initialized from the fetched business. We
  // keep the state separate from the cache so the user can edit
  // freely without the cache being polluted mid-edit.
  const [basicInfo, setBasicInfo] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    priceRange: '$$',
    coverImage: '',
    specialty: '',
    valueProposition: '',
  });
  const [hours, setHours] = useState<
    Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>
  >([]);
  const [socials, setSocials] = useState<Array<{ type: string; value: string }>>([]);
  const [initialized, setInitialized] = useState(false);

  // Hydrate form state when business data arrives.
  if (business && !initialized) {
    setBasicInfo({
      name: business.name,
      description: business.description,
      address: business.address,
      phone: business.phone,
      priceRange: business.priceRange,
      coverImage: business.coverImage,
      specialty: business.specialty,
      valueProposition: business.valueProposition,
    });
    // Build a 7-day hours array (Monday-first ordering), defaulting
    // to "09:00 - 22:00, open" if no row exists for that day.
    const filled = DAY_LABELS.map(({ dayOfWeek }) => {
      const existing = business.hours.find((h) => h.dayOfWeek === dayOfWeek);
      return existing
        ? {
            dayOfWeek: existing.dayOfWeek,
            openTime: existing.openTime,
            closeTime: existing.closeTime,
            isClosed: existing.isClosed,
          }
        : {
            dayOfWeek,
            openTime: '09:00',
            closeTime: '22:00',
            isClosed: false,
          };
    });
    setHours(filled);
    setSocials(business.socials.map((s) => ({ type: s.type, value: s.value })));
    setInitialized(true);
  }

  // ── Mutations ─────────────────────────────────────────────────
  const infoMutation = useMutation({
    mutationFn: (data: typeof basicInfo) => updateOwnerBusiness(slug, data),
    onSuccess: () => {
      addNotification('Cambios guardados', 'success');
      void queryClient.invalidateQueries({ queryKey: QK_OWNER_BUSINESS(slug) });
      void queryClient.invalidateQueries({ queryKey: ['businesses'] });
      void queryClient.invalidateQueries({ queryKey: ['business', slug] });
    },
    onError: (err) => {
      addNotification(
        err instanceof Error ? err.message : 'Error al guardar los cambios',
        'info',
      );
    },
  });

  const hoursMutation = useMutation({
    mutationFn: (data: typeof hours) => updateOwnerHours(slug, data),
    onSuccess: () => {
      addNotification('Horarios guardados', 'success');
      void queryClient.invalidateQueries({ queryKey: QK_OWNER_BUSINESS(slug) });
      void queryClient.invalidateQueries({ queryKey: ['business', slug] });
    },
    onError: (err) => {
      addNotification(
        err instanceof Error ? err.message : 'Error al guardar los horarios',
        'info',
      );
    },
  });

  const socialsMutation = useMutation({
    mutationFn: (data: typeof socials) => updateOwnerSocials(slug, data),
    onSuccess: () => {
      addNotification('Redes sociales guardadas', 'success');
      void queryClient.invalidateQueries({ queryKey: QK_OWNER_BUSINESS(slug) });
      void queryClient.invalidateQueries({ queryKey: ['business', slug] });
    },
    onError: (err) => {
      addNotification(
        err instanceof Error ? err.message : 'Error al guardar las redes',
        'info',
      );
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }
  if (isError || !business) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-white/60">
        Error al cargar la información del negocio. Intenta de nuevo.
      </div>
    );
  }

  // ── Handlers ──────────────────────────────────────────────────
  const updateHour = (
    dayOfWeek: number,
    field: 'openTime' | 'closeTime' | 'isClosed',
    value: string | boolean,
  ) => {
    setHours((prev) =>
      prev.map((h) =>
        h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h,
      ),
    );
  };

  const addSocial = () => {
    setSocials((prev) => [...prev, { type: 'INSTAGRAM', value: '' }]);
  };

  const updateSocial = (index: number, field: 'type' | 'value', value: string) => {
    setSocials((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  };

  const removeSocial = (index: number) => {
    setSocials((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* ─── Section 1: Datos básicos ────────────────────────── */}
      <section className="glass-card rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Store size={16} className="text-gold" />
          <h2 className="text-gold tracking-[3px] text-xs font-mono font-bold">
            DATOS BÁSICOS
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Nombre</Label>
            <Input
              value={basicInfo.name}
              onChange={(e) => setBasicInfo({ ...basicInfo, name: e.target.value })}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              placeholder="Nombre del negocio"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Teléfono</Label>
            <Input
              value={basicInfo.phone}
              onChange={(e) => setBasicInfo({ ...basicInfo, phone: e.target.value })}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              placeholder="+58 412 9999999"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-white/70 text-xs">Descripción</Label>
            <Textarea
              value={basicInfo.description}
              onChange={(e) => setBasicInfo({ ...basicInfo, description: e.target.value })}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40 min-h-24"
              placeholder="Descripción del negocio"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-white/70 text-xs">Dirección</Label>
            <Input
              value={basicInfo.address}
              onChange={(e) => setBasicInfo({ ...basicInfo, address: e.target.value })}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              placeholder="Dirección física"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Rango de precio</Label>
            <Select
              value={basicInfo.priceRange}
              onValueChange={(v) => setBasicInfo({ ...basicInfo, priceRange: v })}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="$">$ — Económico</SelectItem>
                <SelectItem value="$$">$$ — Moderado</SelectItem>
                <SelectItem value="$$$">$$$ — Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Imagen de portada (URL)</Label>
            <Input
              value={basicInfo.coverImage}
              onChange={(e) => setBasicInfo({ ...basicInfo, coverImage: e.target.value })}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Especialidad</Label>
            <Input
              value={basicInfo.specialty}
              onChange={(e) => setBasicInfo({ ...basicInfo, specialty: e.target.value })}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              placeholder="Coctelería de autor, whiskies añejos…"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-white/70 text-xs">Propuesta de valor</Label>
            <Textarea
              value={basicInfo.valueProposition}
              onChange={(e) => setBasicInfo({ ...basicInfo, valueProposition: e.target.value })}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40 min-h-20"
              placeholder="Frase gancho que diferencia tu negocio"
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button
            onClick={() => infoMutation.mutate(basicInfo)}
            disabled={infoMutation.isPending}
            className="bg-gold text-obsidian hover:bg-gold/80"
          >
            <Save size={14} className="mr-1" />
            {infoMutation.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </section>

      {/* ─── Section 2: Horarios ─────────────────────────────── */}
      <section className="glass-card rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock size={16} className="text-gold" />
          <h2 className="text-gold tracking-[3px] text-xs font-mono font-bold">
            HORARIOS
          </h2>
        </div>
        <div className="space-y-2">
          {hours.map((h) => {
            const dayLabel = DAY_LABELS.find((d) => d.dayOfWeek === h.dayOfWeek)?.label ?? '';
            return (
              <div
                key={h.dayOfWeek}
                className="flex flex-col sm:flex-row sm:items-center gap-3 py-2 border-b border-white/5 last:border-b-0"
              >
                <div className="w-32 shrink-0 text-white font-medium text-sm">
                  {dayLabel}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Checkbox
                    checked={!h.isClosed}
                    onCheckedChange={(v) =>
                      updateHour(h.dayOfWeek, 'isClosed', !v)
                    }
                    id={`closed-${h.dayOfWeek}`}
                  />
                  <Label
                    htmlFor={`closed-${h.dayOfWeek}`}
                    className="text-white/70 text-xs cursor-pointer"
                  >
                    Abierto
                  </Label>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="time"
                    value={h.openTime}
                    disabled={h.isClosed}
                    onChange={(e) => updateHour(h.dayOfWeek, 'openTime', e.target.value)}
                    className="bg-white/5 border-white/10 text-white w-32 disabled:opacity-40"
                  />
                  <span className="text-white/40 text-xs">—</span>
                  <Input
                    type="time"
                    value={h.closeTime}
                    disabled={h.isClosed}
                    onChange={(e) => updateHour(h.dayOfWeek, 'closeTime', e.target.value)}
                    className="bg-white/5 border-white/10 text-white w-32 disabled:opacity-40"
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex justify-end">
          <Button
            onClick={() => hoursMutation.mutate(hours)}
            disabled={hoursMutation.isPending}
            className="bg-gold text-obsidian hover:bg-gold/80"
          >
            <Save size={14} className="mr-1" />
            {hoursMutation.isPending ? 'Guardando…' : 'Guardar horarios'}
          </Button>
        </div>
      </section>

      {/* ─── Section 3: Redes sociales ──────────────────────── */}
      <section className="glass-card rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Ticket size={16} className="text-gold" />
          <h2 className="text-gold tracking-[3px] text-xs font-mono font-bold">
            REDES SOCIALES
          </h2>
        </div>
        <div className="space-y-2">
          {socials.length === 0 && (
            <p className="text-white/40 text-sm py-4 text-center">
              Aún no has agregado redes sociales.
            </p>
          )}
          {socials.map((s, i) => (
            <div key={i} className="flex flex-col sm:flex-row gap-2">
              <Select
                value={s.type}
                onValueChange={(v) => updateSocial(i, 'type', v)}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white w-full sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOCIAL_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={s.value}
                onChange={(e) => updateSocial(i, 'value', e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 flex-1"
                placeholder="URL, handle o teléfono"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeSocial(i)}
                className="text-red-300 hover:bg-red-500/10 hover:text-red-300 shrink-0"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-between gap-2">
          <Button
            variant="outline"
            onClick={addSocial}
            className="border-white/15 text-white hover:bg-white/5 hover:border-gold/40"
          >
            <Plus size={14} className="mr-1" /> Agregar red
          </Button>
          <Button
            onClick={() => socialsMutation.mutate(socials)}
            disabled={socialsMutation.isPending}
            className="bg-gold text-obsidian hover:bg-gold/80"
          >
            <Save size={14} className="mr-1" />
            {socialsMutation.isPending ? 'Guardando…' : 'Guardar redes'}
          </Button>
        </div>
      </section>
    </div>
  );
}

// ─── Tab 2: Reservas ───────────────────────────────────────────

function ReservasTab({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const addNotification = useAppStore((s) => s.addNotification);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: reservations = [], isLoading, isError } = useQuery({
    queryKey: QK_OWNER_RESERVATIONS(slug, statusFilter, dateFilter),
    queryFn: () =>
      fetchOwnerReservations(slug, {
        status: statusFilter === 'ALL' ? undefined : (statusFilter as ReservationStatus),
        date: dateFilter.trim() || undefined,
      }),
    staleTime: 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: ReservationStatus;
    }) => updateOwnerReservationStatus(slug, id, status),
    onMutate: async ({ id, status }) => {
      const queryKey = QK_OWNER_RESERVATIONS(slug, statusFilter, dateFilter);
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<OwnerReservation[]>(queryKey);
      if (prev) {
        queryClient.setQueryData<OwnerReservation[]>(
          queryKey,
          prev.map((r) => (r.id === id ? { ...r, status } : r)),
        );
      }
      return { prev, queryKey };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(ctx.queryKey, ctx.prev);
      }
      addNotification(
        err instanceof Error ? err.message : 'Error al actualizar la reserva',
        'info',
      );
    },
    onSuccess: () => {
      addNotification('Reserva actualizada', 'success');
      void queryClient.invalidateQueries({ queryKey: ['owner', 'reservations', slug] });
    },
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-56 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas</SelectItem>
            <SelectItem value="PENDING">Pendientes</SelectItem>
            <SelectItem value="CONFIRMED">Confirmadas</SelectItem>
            <SelectItem value="COMPLETED">Completadas</SelectItem>
            <SelectItem value="NO_SHOW">No asistieron</SelectItem>
            <SelectItem value="CANCELLED">Canceladas</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="bg-white/5 border-white/10 text-white sm:w-48"
          placeholder="YYYY-MM-DD"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : isError ? (
        <div className="glass-card rounded-2xl p-8 text-center text-white/60">
          Error al cargar las reservas. Intenta de nuevo.
        </div>
      ) : reservations.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-white/60">
          No hay reservas para mostrar.
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    Código
                  </th>
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    Comensales
                  </th>
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => {
                  const isExpanded = expandedId === r.id;
                  return (
                    <>
                      <tr
                        key={r.id}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : r.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-gold font-bold">
                              {r.confirmationCode}
                            </span>
                            {isExpanded ? (
                              <ChevronUp size={12} className="text-white/40" />
                            ) : (
                              <ChevronDown size={12} className="text-white/40" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <div className="text-white text-sm">{r.date}</div>
                          <div className="text-[10px] text-white/40 font-mono">
                            {r.time}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-white font-mono">{r.guests}</span>
                        </td>
                        <td className="px-4 py-3 min-w-[160px]">
                          <div className="text-white text-sm truncate">
                            {r.user?.name ?? r.name}
                          </div>
                          <div className="text-[10px] text-white/40 truncate">
                            {r.user?.phone ?? r.phone}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <ReservationStatusBadge status={r.status} />
                        </td>
                        <td
                          className="px-4 py-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(r.status === 'PENDING' || r.status === 'CONFIRMED') && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-white/80 hover:text-gold hover:bg-gold/10"
                                  disabled={statusMutation.isPending}
                                >
                                  Acciones
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="bg-zinc-900 border-white/10 text-white"
                              >
                                <DropdownMenuLabel className="text-white/50 text-[10px] uppercase tracking-widest">
                                  Cambiar estado
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-white/10" />
                                {r.status === 'PENDING' && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      statusMutation.mutate({
                                        id: r.id,
                                        status: 'CONFIRMED',
                                      })
                                    }
                                    className="hover:bg-emerald-500/10 hover:text-emerald-300 cursor-pointer"
                                  >
                                    <CheckCircle2 size={14} className="mr-2" />
                                    Confirmar
                                  </DropdownMenuItem>
                                )}
                                {r.status === 'CONFIRMED' && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        statusMutation.mutate({
                                          id: r.id,
                                          status: 'COMPLETED',
                                        })
                                      }
                                      className="hover:bg-sky-500/10 hover:text-sky-300 cursor-pointer"
                                    >
                                      <CheckCircle2 size={14} className="mr-2" />
                                      Marcar completada
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        statusMutation.mutate({
                                          id: r.id,
                                          status: 'NO_SHOW',
                                        })
                                      }
                                      className="hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
                                    >
                                      <XCircle size={14} className="mr-2" />
                                      Marcar no asistió
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          {r.status !== 'PENDING' && r.status !== 'CONFIRMED' && (
                            <span className="text-white/30 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-white/[0.02]">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                              <div>
                                <div className="text-white/40 mb-1 uppercase tracking-wider text-[10px]">
                                  Notas
                                </div>
                                <p className="text-white/80 whitespace-pre-wrap">
                                  {r.notes ?? 'Sin notas'}
                                </p>
                              </div>
                              <div>
                                <div className="text-white/40 mb-1 uppercase tracking-wider text-[10px]">
                                  Contacto
                                </div>
                                <p className="text-white/80">
                                  {r.user?.email ?? r.email ?? '—'}
                                </p>
                                <p className="text-white/60 mt-1">
                                  Creada {formatRelativeTime(r.createdAt)}
                                </p>
                              </div>
                              <div>
                                <div className="text-white/40 mb-1 uppercase tracking-wider text-[10px]">
                                  Cupón
                                </div>
                                {r.coupon ? (
                                  <div>
                                    <p className="text-gold font-mono font-bold">
                                      {r.coupon.code ?? '—'}
                                    </p>
                                    <p className="text-white/70 text-[11px]">
                                      {r.coupon.title}
                                    </p>
                                    {r.coupon.discount && (
                                      <p className="text-emerald-300 text-[11px]">
                                        {r.coupon.discount}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-white/40">Sin cupón</p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Promociones ────────────────────────────────────────

type PromotionFormState = {
  title: string;
  description: string;
  price: string;
  discount: string;
  image: string;
  code: string;
  startDate: string;
  endDate: string;
  maxRedemptions: string; // string for the input, parsed on save
};

function emptyPromotionForm(): PromotionFormState {
  return {
    title: '',
    description: '',
    price: '',
    discount: '',
    image: '',
    code: '',
    startDate: '',
    endDate: '',
    maxRedemptions: '',
  };
}

function PromotionsTab({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const addNotification = useAppStore((s) => s.addNotification);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<OwnerPromotion | null>(null);
  const [form, setForm] = useState<PromotionFormState>(emptyPromotionForm());

  const { data: promotions = [], isLoading, isError } = useQuery({
    queryKey: QK_OWNER_PROMOTIONS(slug),
    queryFn: () => fetchOwnerPromotions(slug),
    staleTime: 30_000,
  });

  // ── Mutations ─────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: PromotionFormState) =>
      createOwnerPromotion(slug, {
        title: data.title,
        description: data.description,
        price: data.price || undefined,
        discount: data.discount || undefined,
        image: data.image || undefined,
        code: data.code || undefined,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        maxRedemptions: data.maxRedemptions
          ? Number.parseInt(data.maxRedemptions, 10)
          : undefined,
      }),
    onSuccess: () => {
      addNotification('Promoción creada', 'success');
      void queryClient.invalidateQueries({ queryKey: QK_OWNER_PROMOTIONS(slug) });
      void queryClient.invalidateQueries({ queryKey: ['business', slug] });
      setModalOpen(false);
    },
    onError: (err) => {
      addNotification(
        err instanceof Error ? err.message : 'Error al crear la promoción',
        'info',
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: PromotionFormState;
    }) =>
      updateOwnerPromotion(slug, id, {
        title: data.title || undefined,
        description: data.description || undefined,
        price: data.price || undefined,
        discount: data.discount || undefined,
        image: data.image || undefined,
        code: data.code || undefined,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        maxRedemptions: data.maxRedemptions
          ? Number.parseInt(data.maxRedemptions, 10)
          : undefined,
      }),
    onSuccess: () => {
      addNotification('Promoción actualizada', 'success');
      void queryClient.invalidateQueries({ queryKey: QK_OWNER_PROMOTIONS(slug) });
      void queryClient.invalidateQueries({ queryKey: ['business', slug] });
      setModalOpen(false);
    },
    onError: (err) => {
      addNotification(
        err instanceof Error ? err.message : 'Error al actualizar la promoción',
        'info',
      );
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: PromotionStatus;
    }) => updateOwnerPromotion(slug, id, { status }),
    onMutate: async ({ id, status }) => {
      const queryKey = QK_OWNER_PROMOTIONS(slug);
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<OwnerPromotion[]>(queryKey);
      if (prev) {
        queryClient.setQueryData<OwnerPromotion[]>(
          queryKey,
          prev.map((p) => (p.id === id ? { ...p, status } : p)),
        );
      }
      return { prev, queryKey };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(ctx.queryKey, ctx.prev);
      }
      addNotification(
        err instanceof Error ? err.message : 'Error al actualizar el estado',
        'info',
      );
    },
    onSuccess: () => {
      addNotification('Estado actualizado', 'success');
      void queryClient.invalidateQueries({ queryKey: QK_OWNER_PROMOTIONS(slug) });
      void queryClient.invalidateQueries({ queryKey: ['business', slug] });
    },
  });

  // ── Modal helpers ────────────────────────────────────────────
  const openCreateModal = () => {
    setEditingPromo(null);
    setForm(emptyPromotionForm());
    setModalOpen(true);
  };

  const openEditModal = (promo: OwnerPromotion) => {
    setEditingPromo(promo);
    setForm({
      title: promo.title,
      description: promo.description,
      price: promo.price,
      discount: promo.discount,
      image: promo.image,
      code: promo.code,
      startDate: promo.startDate ? promo.startDate.slice(0, 10) : '',
      endDate: promo.endDate ? promo.endDate.slice(0, 10) : '',
      maxRedemptions:
        promo.maxRedemptions !== null ? String(promo.maxRedemptions) : '',
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.description.trim()) {
      addNotification('Título y descripción son requeridos', 'info');
      return;
    }
    if (editingPromo) {
      updateMutation.mutate({ id: editingPromo.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with create button */}
      <div className="flex justify-end">
        <Button
          onClick={openCreateModal}
          className="bg-gold text-obsidian hover:bg-gold/80"
        >
          <Plus size={14} className="mr-1" /> Nueva promoción
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : isError ? (
        <div className="glass-card rounded-2xl p-8 text-center text-white/60">
          Error al cargar las promociones. Intenta de nuevo.
        </div>
      ) : promotions.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-white/60">
          No hay promociones para mostrar.
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    Título
                  </th>
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    Código
                  </th>
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    Descuento
                  </th>
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    Canjes
                  </th>
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    Vigencia
                  </th>
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 min-w-[200px]">
                      <div className="text-white font-medium truncate">
                        {p.title}
                      </div>
                      <div className="text-[10px] text-white/40 line-clamp-1">
                        {p.description}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gold">
                        {p.code || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white/80 text-xs">
                        {p.discount || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <PromotionStatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-white/80">
                        {p.redemptionCount}
                        {p.maxRedemptions !== null && (
                          <span className="text-white/40">/{p.maxRedemptions}</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 min-w-[140px]">
                      <div className="text-[10px] text-white/60 font-mono">
                        {p.startDate ? p.startDate.slice(0, 10) : '—'}
                        {' → '}
                        {p.endDate ? p.endDate.slice(0, 10) : '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-white/80 hover:text-gold hover:bg-gold/10"
                            disabled={statusMutation.isPending}
                          >
                            Acciones
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-zinc-900 border-white/10 text-white"
                        >
                          <DropdownMenuLabel className="text-white/50 text-[10px] uppercase tracking-widest">
                            Acciones
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-white/10" />
                          {p.status === 'DRAFT' && (
                            <DropdownMenuItem
                              onClick={() =>
                                statusMutation.mutate({
                                  id: p.id,
                                  status: 'ACTIVE',
                                })
                              }
                              className="hover:bg-emerald-500/10 hover:text-emerald-300 cursor-pointer"
                            >
                              <Play size={14} className="mr-2" />
                              Publicar
                            </DropdownMenuItem>
                          )}
                          {p.status === 'ACTIVE' && (
                            <DropdownMenuItem
                              onClick={() =>
                                statusMutation.mutate({
                                  id: p.id,
                                  status: 'PAUSED',
                                })
                              }
                              className="hover:bg-sky-500/10 hover:text-sky-300 cursor-pointer"
                            >
                              <Pause size={14} className="mr-2" />
                              Pausar
                            </DropdownMenuItem>
                          )}
                          {p.status === 'PAUSED' && (
                            <DropdownMenuItem
                              onClick={() =>
                                statusMutation.mutate({
                                  id: p.id,
                                  status: 'ACTIVE',
                                })
                              }
                              className="hover:bg-emerald-500/10 hover:text-emerald-300 cursor-pointer"
                            >
                              <Play size={14} className="mr-2" />
                              Reanudar
                            </DropdownMenuItem>
                          )}
                          {p.status !== 'EXPIRED' && (
                            <DropdownMenuItem
                              onClick={() => openEditModal(p)}
                              className="hover:bg-gold/10 hover:text-gold cursor-pointer"
                            >
                              <Pencil size={14} className="mr-2" />
                              Editar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPromo ? 'Editar promoción' : 'Nueva promoción'}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {editingPromo
                ? 'Actualiza los campos de la promoción.'
                : 'Crea una nueva promoción. Empieza en estado BORRADOR — puedes publicarla después.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto py-2" style={{ scrollbarWidth: 'thin' }}>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-white/70 text-xs">Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                placeholder="2x1 en cócteles"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-white/70 text-xs">Descripción *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 min-h-20"
                placeholder="Detalles de la promoción"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Precio</Label>
              <Input
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                placeholder="$89"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Descuento</Label>
              <Input
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                placeholder="20% OFF"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-white/70 text-xs">Imagen (URL)</Label>
              <Input
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Código</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 font-mono"
                placeholder="SANCHO18"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Máx. canjes</Label>
              <Input
                type="number"
                value={form.maxRedemptions}
                onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                placeholder="100 (vacío = ilimitado)"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Inicio</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Fin</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="border-white/15 text-white hover:bg-white/5"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-gold text-obsidian hover:bg-gold/80"
            >
              <Save size={14} className="mr-1" />
              {createMutation.isPending || updateMutation.isPending
                ? 'Guardando…'
                : editingPromo
                  ? 'Guardar cambios'
                  : 'Crear promoción'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main OwnerDashboard ──────────────────────────────────────

export function OwnerDashboard() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [tab, setTab] = useState<string>('info');

  // Fetch all businesses + filter client-side for the ones owned by
  // the current user. Reuses the public /api/businesses endpoint so
  // we don't need a separate owner-list endpoint — the OWNER role
  // check happens per-business on the mutation routes anyway.
  const { data: allBusinesses = [], isLoading: businessesLoading } = useQuery({
    queryKey: QK_OWNER_BUSINESSES,
    queryFn: () => fetchBusinesses(),
    staleTime: 60_000,
  });

  const ownedBusinesses = allBusinesses.filter(
    (b) => b.ownerId === user?.id,
  );

  // Auto-select the first owned business if none is selected.
  if (selectedSlug === null && ownedBusinesses.length > 0) {
    setSelectedSlug(ownedBusinesses[0]!.slug);
  }

  // Defense-in-depth: the Navbar hides the "Mis Locales" entry for
  // non-business-owners, but if one lands here via store mutation
  // we render the AccessDenied card.
  if (user?.role !== 'BUSINESS_OWNER' && user?.role !== 'ADMIN') {
    return <AccessDenied />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12"
    >
      {/* Header */}
      <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-gold/40 bg-gold/10 text-gold text-[10px] font-bold tracking-widest mb-2">
            <Briefcase size={10} /> PANEL DE DUEÑO
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">
            Mis Locales
          </h1>
          <p className="text-white/50 text-xs mt-1">
            Conecta-LT · Dueño de negocio · {user?.email}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setView('home')}
          className="border-white/15 text-white hover:bg-white/5 hover:border-gold/40"
        >
          Salir
        </Button>
      </header>

      {/* Business selector */}
      {businessesLoading ? (
        <Skeleton className="h-12 rounded-xl mb-6" />
      ) : ownedBusinesses.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <Briefcase size={32} className="mx-auto text-white/30 mb-4" />
          <h2 className="font-serif text-xl text-white mb-2">
            Aún no has reclamado ningún local
          </h2>
          <p className="text-white/50 text-sm mb-6 max-w-md mx-auto">
            Visita el directorio y haz clic en &quot;Reclamar este local&quot;
            en la página del negocio para empezar a gestionarlo.
          </p>
          <Button
            onClick={() => setView('home')}
            className="bg-gold text-obsidian hover:bg-gold/80"
          >
            Explorar directorio
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
            <Label className="text-white/50 text-[10px] font-mono tracking-widest uppercase">
              Negocio:
            </Label>
            {ownedBusinesses.length === 1 ? (
              <div className="text-white font-medium text-lg">
                {ownedBusinesses[0]!.name}
              </div>
            ) : (
              <Select
                value={selectedSlug ?? undefined}
                onValueChange={(v) => setSelectedSlug(v)}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white w-full sm:w-72">
                  <SelectValue placeholder="Selecciona un negocio" />
                </SelectTrigger>
                <SelectContent>
                  {ownedBusinesses.map((b) => (
                    <SelectItem key={b.slug} value={b.slug}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedSlug && (
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList className="bg-white/5 border border-white/10 p-1 h-auto flex-wrap">
                <TabsTrigger
                  value="info"
                  className="data-[state=active]:bg-gold data-[state=active]:text-obsidian text-white/70 hover:text-white"
                >
                  Info
                </TabsTrigger>
                <TabsTrigger
                  value="reservas"
                  className="data-[state=active]:bg-gold data-[state=active]:text-obsidian text-white/70 hover:text-white"
                >
                  Reservas
                </TabsTrigger>
                <TabsTrigger
                  value="promociones"
                  className="data-[state=active]:bg-gold data-[state=active]:text-obsidian text-white/70 hover:text-white"
                >
                  Promociones
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-6">
                <InfoTab slug={selectedSlug} />
              </TabsContent>
              <TabsContent value="reservas" className="mt-6">
                <ReservasTab slug={selectedSlug} />
              </TabsContent>
              <TabsContent value="promociones" className="mt-6">
                <PromotionsTab slug={selectedSlug} />
              </TabsContent>
            </Tabs>
          )}
        </>
      )}
    </motion.div>
  );
}
