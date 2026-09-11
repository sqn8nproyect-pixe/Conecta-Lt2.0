'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — EventsTab (Sprint 8.6)
//
// Tab "Eventos" del AdminDashboard: ABM completo de los flyers del
// fin de semana (BusinessEvent) SIN tocar código — alta, edición,
// publicar/despublicar y borrado, agrupados por semana.
//
// Convención clave (heredada del Sprint 8.7): los flyers se muestran
// con labels pre-renderizados (dayLabel "VIERNES", dateLabel "11 SEP",
// timeLabel "10:00 PM") construidos en wall clock America/Caracas
// (UTC-4, sin DST desde 2016). El formulario los DERIVA solos a partir
// de fecha + hora (con opción de personalizarlos), y weekOf (el
// sábado de la semana cubierta, que agrupa la portada /editorial)
// también se calcula solo. Así el dueño nunca escribe fechas dos veces
// ni puede introducir desfases de timezone.
//
// Datos: GET/POST /api/admin/events · PATCH/DELETE /api/admin/events/[id]
// (funciones en src/lib/api.ts). Mutaciones invalidan ['admin','events'];
// la portada pública se refresca sola vía ISR (revalidate 3600).
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Check,
  X,
  Clock3,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  PartyPopper,
} from 'lucide-react';
import {
  fetchAdminEvents,
  fetchAdminBusinesses,
  createAdminEvent,
  updateAdminEvent,
  deleteAdminEvent,
} from '@/lib/api';
import { EVENT_THEMES, EVENT_THEME_HEX } from '@/lib/event-themes';
import {
  caracasParts,
  deriveFrom,
  toTimeLabel,
  weekHeader,
} from '@/lib/event-labels';
import type {
  AdminEvent,
  AdminEventInput,
  BusinessEventStatus,
} from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const QK_EVENTS = ['admin', 'events'] as const;

// ── Timezone helpers — America/Caracas (UTC-4 fijo) ────────────
// Única fuente de verdad: src/lib/event-labels.ts (compartida con
// el panel del dueño — EventsOwnerTab — desde el Sprint 8.9).

// ── Form state ─────────────────────────────────────────────────

type FormState = {
  id: string | null; // null = crear
  businessId: string;
  title: string;
  tagline: string;
  emoji: string;
  theme: string;
  date: string; // 'YYYY-MM-DD' (input date)
  time: string; // 'HH:MM' (input time)
  dayLabel: string;
  dateLabel: string;
  timeLabel: string;
  labelsUnlocked: boolean; // "personalizar etiquetas" — deja de auto-derivar
  priceNote: string;
  promoNote: string;
  sortOrder: string;
  status: BusinessEventStatus;
};

function emptyForm(): FormState {
  return {
    id: null,
    businessId: '',
    title: '',
    tagline: '',
    emoji: '🎉',
    theme: 'gold',
    date: '',
    time: '',
    dayLabel: '',
    dateLabel: '',
    timeLabel: '',
    labelsUnlocked: false,
    priceNote: '',
    promoNote: '',
    sortOrder: '0',
    status: 'PUBLISHED',
  };
}

function formFromEvent(ev: AdminEvent): FormState {
  const parts = caracasParts(ev.startsAt);
  return {
    id: ev.id,
    businessId: ev.businessId,
    title: ev.title,
    tagline: ev.tagline,
    emoji: ev.emoji,
    theme: ev.theme,
    date: parts.date,
    time: parts.time,
    dayLabel: ev.dayLabel,
    dateLabel: ev.dateLabel,
    timeLabel: ev.timeLabel,
    labelsUnlocked: false,
    priceNote: ev.priceNote ?? '',
    promoNote: ev.promoNote ?? '',
    sortOrder: String(ev.sortOrder),
    status: ev.status,
  };
}

// ── Componente principal ───────────────────────────────────────

export function EventsTab() {
  const qc = useQueryClient();
  const addNotification = useAppStore((s) => s.addNotification);

  const eventsQ = useQuery({
    queryKey: QK_EVENTS,
    queryFn: fetchAdminEvents,
    staleTime: 30_000,
  });
  const businessesQ = useQuery({
    queryKey: ['admin', 'businesses', 'event-select'],
    queryFn: () => fetchAdminBusinesses(),
    staleTime: 60_000,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AdminEvent | null>(null);
  // Sprint 8.9 — rechazo de propuestas con nota para el dueño.
  const [toReject, setToReject] = useState<AdminEvent | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const invalidate = () =>
    void qc.invalidateQueries({ queryKey: QK_EVENTS });

  const saveMutation = useMutation({
    mutationFn: (input: AdminEventInput) =>
      form.id
        ? updateAdminEvent(form.id, input)
        : createAdminEvent(input),
    onSuccess: (_data, input) => {
      invalidate();
      setFormOpen(false);
      addNotification(
        form.id
          ? `Evento "${input.title}" actualizado.`
          : `Evento "${input.title}" creado.`,
        'success',
      );
    },
    onError: (e: Error) => {
      setFormError(e.message);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (ev: AdminEvent) =>
      updateAdminEvent(ev.id, {
        status: ev.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED',
      }),
    onSuccess: (updated) => {
      invalidate();
      addNotification(
        updated.status === 'PUBLISHED'
          ? `Evento "${updated.title}" publicado.`
          : `Evento "${updated.title}" pasado a borrador.`,
        'info',
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminEvent(id),
    onSuccess: () => {
      invalidate();
      setToDelete(null);
      addNotification('Evento eliminado.', 'info');
    },
  });

  // ── Sprint 8.9 — aprobar / rechazar propuestas del dueño ──────
  const approveMutation = useMutation({
    mutationFn: (ev: AdminEvent) =>
      updateAdminEvent(ev.id, { status: 'PUBLISHED', reviewNote: null }),
    onSuccess: (updated) => {
      invalidate();
      addNotification(
        `Flyer "${updated.title}" aprobado y publicado en la portada.`,
        'success',
      );
    },
    onError: (e: Error) => addNotification(e.message, 'info'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ ev, note }: { ev: AdminEvent; note: string }) =>
      updateAdminEvent(ev.id, { status: 'REJECTED', reviewNote: note || null }),
    onSuccess: (updated) => {
      invalidate();
      setToReject(null);
      setRejectNote('');
      addNotification(
        `Propuesta "${updated.title}" rechazada — el dueño verá tu nota.`,
        'info',
      );
    },
    onError: (e: Error) => addNotification(e.message, 'info'),
  });

  // Agrupar por semana (la API ya viene ordenada por weekOf desc).
  // Las propuestas PENDING_REVIEW se muestran aparte, arriba — no en
  // las semanas (así la bandeja de revisión nunca se mezcla con el
  // calendario editorial).
  const weeks = useMemo(() => {
    const map = new Map<string, AdminEvent[]>();
    for (const ev of eventsQ.data ?? []) {
      if (ev.status === 'PENDING_REVIEW') continue;
      const arr = map.get(ev.weekOf) ?? [];
      arr.push(ev);
      map.set(ev.weekOf, arr);
    }
    return [...map.entries()];
  }, [eventsQ.data]);

  // Bandeja de propuestas del dueño esperando revisión.
  const pending = useMemo(
    () =>
      (eventsQ.data ?? [])
        .filter((e) => e.status === 'PENDING_REVIEW')
        // Las más recientes primero (el dueño suele proponer por orden).
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [eventsQ.data],
  );

  const openCreate = () => {
    setForm(emptyForm());
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (ev: AdminEvent) => {
    setForm(formFromEvent(ev));
    setFormError(null);
    setFormOpen(true);
  };

  /** Actualiza estado del form; si cambia fecha/hora y las etiquetas
   *  NO están personalizadas, re-deriva dayLabel/dateLabel/timeLabel. */
  const setField = (patch: Partial<FormState>) => {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if (
        (patch.date !== undefined || patch.time !== undefined) &&
        !next.labelsUnlocked
      ) {
        const derived = deriveFrom(next.date);
        next.dayLabel = derived?.dayLabel ?? '';
        next.dateLabel = derived?.dateLabel ?? '';
        next.timeLabel = next.time ? toTimeLabel(next.time) : '';
      }
      return next;
    });
  };

  const handleSubmit = () => {
    setFormError(null);
    if (!form.businessId) {
      setFormError('Selecciona el local del evento.');
      return;
    }
    if (!form.title.trim() || !form.tagline.trim()) {
      setFormError('El título y la frase del flyer son obligatorios.');
      return;
    }
    const derived = deriveFrom(form.date);
    if (!form.date || !derived) {
      setFormError('Selecciona una fecha válida.');
      return;
    }
    if (!form.time) {
      setFormError('Selecciona la hora de inicio.');
      return;
    }
    if (!form.dayLabel || !form.dateLabel || !form.timeLabel) {
      setFormError('Las etiquetas del flyer no pueden quedar vacías.');
      return;
    }
    const input: AdminEventInput = {
      businessId: form.businessId,
      title: form.title.trim(),
      tagline: form.tagline.trim(),
      emoji: form.emoji.trim() || '🎉',
      theme: form.theme,
      dayLabel: form.dayLabel,
      dateLabel: form.dateLabel,
      timeLabel: form.timeLabel,
      // Wall clock Caracas → instante (el server lo guarda y la
      // edición lo vuelve a traducir a Caracas con caracasParts()).
      startsAt: `${form.date}T${form.time}:00-04:00`,
      priceNote: form.priceNote.trim() || null,
      promoNote: form.promoNote.trim() || null,
      weekOf: derived.weekOf,
      sortOrder: Number(form.sortOrder) || 0,
      status: form.status,
    };
    saveMutation.mutate(input);
  };

  const businesses = useMemo(
    () =>
      [...(businessesQ.data ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name, 'es'),
      ),
    [businessesQ.data],
  );

  const total = eventsQ.data?.length ?? 0;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-serif text-lg text-white flex items-center gap-2">
            <CalendarDays size={18} className="text-gold" />
            Eventos & Flyers
            {total > 0 && (
              <span className="text-xs font-mono text-white/40">
                ({total})
              </span>
            )}
          </h3>
          <p className="text-xs text-white/50 mt-1 max-w-xl">
            Crea los flyers de la semana sin tocar código. La portada de{' '}
            <span className="text-gold/80">/editorial</span> muestra la
            semana más reciente; los cambios se reflejan ahí en menos de 1
            hora (ISR).
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-gold text-obsidian font-bold hover:bg-gold/90"
        >
          <Plus size={15} className="mr-1" />
          Nuevo evento
        </Button>
      </div>

      {/* Loading */}
      {eventsQ.isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl bg-white/5" />
          ))}
        </div>
      )}

      {/* Error */}
      {eventsQ.isError && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle size={16} />
          No se pudo cargar la lista de eventos. Intenta de nuevo.
        </div>
      )}

      {/* Empty */}
      {!eventsQ.isLoading && !eventsQ.isError && total === 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 flex flex-col items-center gap-3 text-center">
          <PartyPopper size={28} className="text-white/30" />
          <p className="text-sm text-white/60">
            Todavía no hay eventos cargados.
          </p>
          <p className="text-xs text-white/40 max-w-sm">
            Crea el primer flyer: elige el local, escribe el título y la
            frase corta, y selecciona fecha y hora — el resto se genera
            solo.
          </p>
          <Button
            onClick={openCreate}
            variant="outline"
            className="mt-1 border-gold/40 text-gold hover:bg-gold/10"
          >
            <Plus size={15} className="mr-1" />
            Crear el primer evento
          </Button>
        </div>
      )}

      {/* ── Sprint 8.9: bandeja de propuestas pendientes ──────── */}
      {pending.length > 0 && (
        <section
          aria-label="Propuestas pendientes de aprobación"
          className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.05] overflow-hidden mb-6"
        >
          <header className="flex items-center gap-2 px-4 py-3 border-b border-amber-500/20 bg-amber-500/[0.06]">
            <Clock3 size={14} className="text-amber-300" />
            <h4 className="text-sm font-semibold text-amber-200">
              Pendientes de aprobación
            </h4>
            <Badge className="bg-amber-500/15 text-amber-200 border border-amber-500/30 hover:bg-amber-500/15">
              {pending.length}
            </Badge>
            <span className="text-[11px] text-amber-200/50 ml-auto hidden sm:block">
              propuestas de los dueños — aprueba para publicar en la portada
            </span>
          </header>
          <ul>
            {pending.map((ev) => (
              <PendingEventRow
                key={ev.id}
                ev={ev}
                busy={approveMutation.isPending || rejectMutation.isPending}
                onApprove={() => approveMutation.mutate(ev)}
                onReject={() => {
                  setRejectNote('');
                  setToReject(ev);
                }}
                onEdit={() => openEdit(ev)}
              />
            ))}
          </ul>
        </section>
      )}

      {/* Semanas */}
      <div className="space-y-6">
        {weeks.map(([weekOf, events]) => {
          const drafts = events.filter((e) => e.status === 'DRAFT').length;
          return (
            <section
              key={weekOf}
              className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden"
            >
              <header className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.03]">
                <CalendarDays size={14} className="text-gold" />
                <h4 className="text-sm font-semibold text-white">
                  Semana del {weekHeader(weekOf)}
                </h4>
                <Badge className="bg-white/10 text-white/70 border border-white/10 hover:bg-white/10">
                  {events.length} flyer{events.length === 1 ? '' : 's'}
                </Badge>
                {drafts > 0 ? (
                  <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/15">
                    {drafts} borrador{drafts === 1 ? '' : 'es'}
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/15">
                    Publicada
                  </Badge>
                )}
              </header>
              <ul>
                {events.map((ev) => (
                  <EventRow
                    key={ev.id}
                    ev={ev}
                    onEdit={() => openEdit(ev)}
                    onToggle={() => toggleStatusMutation.mutate(ev)}
                    onDelete={() => setToDelete(ev)}
                    busy={toggleStatusMutation.isPending}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {/* ── Dialog: crear / editar ─────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto bg-[#0d1120] border-white/15">
          <DialogHeader>
            <DialogTitle className="font-serif text-gold">
              {form.id ? 'Editar evento' : 'Nuevo evento'}
            </DialogTitle>
            <DialogDescription>
              Fecha, hora y etiquetas se generan solas en horario de
              Venezuela. Solo el título y la frase son obligatorios.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Local */}
            <div className="grid gap-1.5">
              <Label className="text-white/80 text-xs">Local</Label>
              <Select
                value={form.businessId}
                onValueChange={(v) => setField({ businessId: v })}
              >
                <SelectTrigger className="bg-white/5 border-white/15 text-white">
                  <SelectValue placeholder="Selecciona el local…" />
                </SelectTrigger>
                <SelectContent className="bg-[#0d1120] border-white/15 max-h-64">
                  {businesses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Título + frase */}
            <div className="grid gap-1.5">
              <Label className="text-white/80 text-xs">
                Título del evento
              </Label>
              <Input
                value={form.title}
                onChange={(e) => setField({ title: e.target.value })}
                placeholder="Noche de DJ en vivo"
                maxLength={80}
                className="bg-white/5 border-white/15 text-white"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-white/80 text-xs">
                Frase corta del flyer
              </Label>
              <Input
                value={form.tagline}
                onChange={(e) => setField({ tagline: e.target.value })}
                placeholder="Salsa y merengue hasta tarde"
                maxLength={140}
                className="bg-white/5 border-white/15 text-white"
              />
            </div>

            {/* Fecha + hora */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-white/80 text-xs">Fecha</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setField({ date: e.target.value })}
                  className="bg-white/5 border-white/15 text-white [color-scheme:dark]"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-white/80 text-xs">Hora</Label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) => setField({ time: e.target.value })}
                  className="bg-white/5 border-white/15 text-white [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Tema + emoji + estado */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-white/80 text-xs">Tema de color</Label>
                <Select
                  value={form.theme}
                  onValueChange={(v) => setField({ theme: v })}
                >
                  <SelectTrigger className="bg-white/5 border-white/15 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0d1120] border-white/15">
                    {EVENT_THEMES.map((t) => (
                      <SelectItem key={t.key} value={t.key}>
                        <span className="inline-flex items-center gap-2">
                          <span
                            aria-hidden
                            className="inline-block w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: EVENT_THEME_HEX[t.key] }}
                          />
                          {t.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-white/80 text-xs">Emoji</Label>
                <Input
                  value={form.emoji}
                  onChange={(e) => setField({ emoji: e.target.value })}
                  maxLength={4}
                  className="bg-white/5 border-white/15 text-white"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-white/80 text-xs">Estado</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setField({ status: v as BusinessEventStatus })
                }
              >
                <SelectTrigger className="bg-white/5 border-white/15 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0d1120] border-white/15">
                  <SelectItem value="PUBLISHED">Publicado</SelectItem>
                  <SelectItem value="DRAFT">Borrador</SelectItem>
                  <SelectItem value="PENDING_REVIEW">En revisión (propuesta)</SelectItem>
                  <SelectItem value="REJECTED">Rechazada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Etiquetas auto + override manual */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 grid gap-2.5">
              <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer select-none">
                <Checkbox
                  checked={form.labelsUnlocked}
                  onCheckedChange={(v) => setField({ labelsUnlocked: v === true })}
                  className="border-white/30 data-[state=checked]:bg-gold data-[state=checked]:border-gold"
                />
                Personalizar etiquetas (por defecto se generan solas)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div className="grid gap-1">
                  <Label className="text-white/50 text-[10px] uppercase tracking-wide">
                    Día
                  </Label>
                  <Input
                    value={form.dayLabel}
                    onChange={(e) => setField({ dayLabel: e.target.value })}
                    disabled={!form.labelsUnlocked}
                    maxLength={20}
                    className="bg-white/5 border-white/15 text-white text-xs h-8 disabled:opacity-50"
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-white/50 text-[10px] uppercase tracking-wide">
                    Fecha
                  </Label>
                  <Input
                    value={form.dateLabel}
                    onChange={(e) => setField({ dateLabel: e.target.value })}
                    disabled={!form.labelsUnlocked}
                    maxLength={20}
                    className="bg-white/5 border-white/15 text-white text-xs h-8 disabled:opacity-50"
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-white/50 text-[10px] uppercase tracking-wide">
                    Hora
                  </Label>
                  <Input
                    value={form.timeLabel}
                    onChange={(e) => setField({ timeLabel: e.target.value })}
                    disabled={!form.labelsUnlocked}
                    maxLength={40}
                    className="bg-white/5 border-white/15 text-white text-xs h-8 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Notas opcionales */}
            <div className="grid grid-cols-1 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-white/80 text-xs">
                  Nota de precio (opcional)
                </Label>
                <Input
                  value={form.priceNote}
                  onChange={(e) => setField({ priceNote: e.target.value })}
                  placeholder="Cover: $5"
                  maxLength={80}
                  className="bg-white/5 border-white/15 text-white"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-white/80 text-xs">
                  Promoción (opcional)
                </Label>
                <Input
                  value={form.promoNote}
                  onChange={(e) => setField({ promoNote: e.target.value })}
                  placeholder="2x1 en nacionales · código BOTELLON24"
                  maxLength={140}
                  className="bg-white/5 border-white/15 text-white"
                />
              </div>
            </div>

            {/* Orden */}
            <div className="grid gap-1.5 max-w-[140px]">
              <Label className="text-white/80 text-xs">
                Orden (menor = primero)
              </Label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setField({ sortOrder: e.target.value })}
                className="bg-white/5 border-white/15 text-white"
              />
            </div>

            {/* Vista previa de las etiquetas que se mostrarán */}
            {!form.labelsUnlocked && (form.dayLabel || form.dateLabel) && (
              <p className="text-[11px] text-white/40 flex items-center gap-1.5">
                <Sparkles size={12} className="text-gold/60" />
                El flyer mostrará: {form.dayLabel} · {form.dateLabel} ·{' '}
                {form.timeLabel}
              </p>
            )}

            {(formError || saveMutation.isError) && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                <AlertCircle size={14} className="shrink-0" />
                {formError ??
                  ((saveMutation.error as Error)?.message ||
                    'No se pudo guardar el evento.')}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              className="border-white/20 text-white hover:bg-white/10"
              disabled={saveMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saveMutation.isPending}
              className="bg-gold text-obsidian font-bold hover:bg-gold/90"
            >
              {saveMutation.isPending
                ? 'Guardando…'
                : form.id
                  ? 'Guardar cambios'
                  : 'Crear evento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog: rechazar propuesta con nota ─────────── */}
      <AlertDialog
        open={toReject !== null}
        onOpenChange={(v) => !v && setToReject(null)}
      >
        <AlertDialogContent className="bg-[#0d1120] border-white/15">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              ¿Rechazar la propuesta?
            </AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{toReject?.title}&quot; de {toReject?.business.name} no se
              publicará. Puedes explicarle el motivo al dueño — verá tu nota en
              su panel y podrá corregir y reenviar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Ej: la fecha ya pasó / falta el horario de cierre / la promo no está autorizada…"
            maxLength={280}
            rows={3}
            className="bg-white/5 border-white/15 text-white text-sm"
          />
          <p className="text-[11px] text-white/40 text-right">
            {rejectNote.length}/280
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                toReject &&
                rejectMutation.mutate({ ev: toReject, note: rejectNote.trim() })
              }
              className="bg-red-600 text-white hover:bg-red-600/90"
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rechazando…' : 'Rechazar propuesta'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog: confirmar borrado ─────────────────────── */}
      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(v) => !v && setToDelete(null)}
      >
        <AlertDialogContent className="bg-[#0d1120] border-white/15">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              ¿Eliminar este evento?
            </AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{toDelete?.title}&quot; de {toDelete?.business.name} se
              quitará de la portada de forma permanente. Esta acción no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && deleteMutation.mutate(toDelete.id)}
              className="bg-red-600 text-white hover:bg-red-600/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Fila de propuesta pendiente (bandeja Sprint 8.9) ──────────

function PendingEventRow({
  ev,
  busy,
  onApprove,
  onReject,
  onEdit,
}: {
  ev: AdminEvent;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
}) {
  return (
    <li className="flex flex-wrap items-start gap-3 px-4 py-3 border-b border-amber-500/10 last:border-b-0 hover:bg-amber-500/[0.03] transition">
      <span
        aria-hidden
        className="text-2xl leading-none select-none w-9 h-9 shrink-0 flex items-center justify-center rounded-lg bg-white/5"
      >
        {ev.emoji}
      </span>

      <div className="flex-1 min-w-[180px]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-white">
            {ev.title}
          </span>
          <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/15">
            propuesta
          </Badge>
        </div>
        <p className="text-xs text-white/50 mt-0.5 truncate">
          {ev.tagline}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[11px]">
          <span className="text-gold/80 font-mono">
            {ev.business.name}
          </span>
          <span className="text-white/25">·</span>
          <span className="text-white/60 font-mono uppercase">
            {ev.dayLabel} {ev.dateLabel} · {ev.timeLabel}
          </span>
          <span
            aria-hidden
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: EVENT_THEME_HEX[ev.theme] ?? '#d4af37' }}
          />
        </div>
        {(ev.priceNote || ev.promoNote) && (
          <p className="text-[11px] text-white/45 mt-1">
            {ev.priceNote && <span>{ev.priceNote} </span>}
            {ev.promoNote && (
              <span className="text-gold/70">· {ev.promoNote}</span>
            )}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          onClick={onApprove}
          disabled={busy}
          className="h-8 bg-emerald-600 text-white hover:bg-emerald-600/90 text-xs"
        >
          <Check size={13} className="mr-1" />
          Aprobar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onReject}
          disabled={busy}
          className="h-8 border-red-500/30 text-red-300 hover:bg-red-500/10 text-xs"
        >
          <X size={13} className="mr-1" />
          Rechazar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          title="Editar antes de aprobar"
          className="h-8 w-8 p-0 text-white/60 hover:text-gold hover:bg-gold/10"
        >
          <Pencil size={14} />
        </Button>
      </div>
    </li>
  );
}

// ── Fila de evento ─────────────────────────────────────────────

function EventRow({
  ev,
  onEdit,
  onToggle,
  onDelete,
  busy,
}: {
  ev: AdminEvent;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  // Sprint 8.9 — 4 estados del ciclo editorial.
  const statusMeta: Record<
    BusinessEventStatus,
    { label: string; cls: string }
  > = {
    PUBLISHED: {
      label: 'Publicado',
      cls: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/15',
    },
    DRAFT: {
      label: 'Borrador',
      cls: 'bg-white/10 text-white/60 border border-white/15 hover:bg-white/10',
    },
    PENDING_REVIEW: {
      label: 'En revisión',
      cls: 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/15',
    },
    REJECTED: {
      label: 'Rechazada',
      cls: 'bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/15',
    },
  };
  const meta = statusMeta[ev.status];
  const published = ev.status === 'PUBLISHED';
  return (
    <li className="flex flex-wrap items-start gap-3 px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition">
      <span
        aria-hidden
        className="text-2xl leading-none select-none w-9 h-9 shrink-0 flex items-center justify-center rounded-lg bg-white/5"
      >
        {ev.emoji}
      </span>

      <div className="flex-1 min-w-[180px]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-white">
            {ev.title}
          </span>
          {meta && (
            <Badge className={meta.cls}>{meta.label}</Badge>
          )}
        </div>
        <p className="text-xs text-white/50 mt-0.5 truncate">
          {ev.tagline}
        </p>
        {ev.status === 'REJECTED' && ev.reviewNote && (
          <p className="text-[11px] text-red-300/80 mt-1">
            Motivo del rechazo: {ev.reviewNote}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[11px]">
          <span className="text-gold/80 font-mono">
            {ev.business.name}
          </span>
          <span className="text-white/25">·</span>
          <span className="text-white/60 font-mono uppercase">
            {ev.dayLabel} {ev.dateLabel} · {ev.timeLabel}
          </span>
          <span
            aria-hidden
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: EVENT_THEME_HEX[ev.theme] ?? '#d4af37' }}
          />
        </div>
        {(ev.priceNote || ev.promoNote) && (
          <p className="text-[11px] text-white/45 mt-1">
            {ev.priceNote && <span>{ev.priceNote} </span>}
            {ev.promoNote && (
              <span className="text-gold/70">· {ev.promoNote}</span>
            )}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {/* Publicar/despublicar solo aplica a DRAFT ⇄ PUBLISHED; las
            propuestas en revisión se aprueban desde la bandeja y las
            rechazadas se re-procesan desde su formulario. */}
        {(ev.status === 'PUBLISHED' || ev.status === 'DRAFT') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            disabled={busy}
            title={published ? 'Pasar a borrador' : 'Publicar'}
            className="h-8 w-8 p-0 text-white/60 hover:text-gold hover:bg-gold/10"
          >
            {published ? <EyeOff size={15} /> : <Eye size={15} />}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          title="Editar"
          className="h-8 w-8 p-0 text-white/60 hover:text-gold hover:bg-gold/10"
        >
          <Pencil size={15} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          title="Eliminar"
          className="h-8 w-8 p-0 text-white/60 hover:text-red-400 hover:bg-red-500/10"
        >
          <Trash2 size={15} />
        </Button>
      </div>
    </li>
  );
}
