'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — EventsOwnerTab (Sprint 8.9)
//
// Tab "Eventos" del OwnerDashboard: el dueño PROPONE flyers para
// la portada "Qué hacer este fin de semana en Los Teques"
// (/editorial). Flujo con aprobación:
//
//   dueño propone → PENDING_REVIEW → admin aprueba (PUBLISHED,
//   sale en la portada) o rechaza (REJECTED + nota visible aquí).
//
// El formulario replica al del admin (mismos campos y derivación
// automática de etiquetas en horario Venezuela) pero SIN los
// campos editoriales que el admin decide: estado, orden y local
// (fijo = este negocio). El dueño edita/cancela solo mientras la
// propuesta está pendiente o rechazada.
//
// Datos: GET/POST /api/owner/businesses/[slug]/events ·
// PATCH/DELETE …/[id] (src/lib/api.ts). Los ya aprobados son de
// la editorial del admin: ver solo.
// ─────────────────────────────────────────────────────────────

import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Clock3,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  AlertCircle,
  PartyPopper,
  Send,
  Upload,
  ImagePlus,
  Loader2,
  X,
} from 'lucide-react';
import {
  fetchOwnerEvents,
  createOwnerEvent,
  updateOwnerEvent,
  deleteOwnerEvent,
  presignUpload,
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
  BusinessEventStatus,
  OwnerEventInput,
} from '@/lib/types';
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

const QK_OWNER_EVENTS = (slug: string) => ['owner', 'events', slug] as const;

// ── Subida del flyer personalizado (Sprint 8.10) ───────────────

const FLYER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const FLYER_MAX = 5 * 1024 * 1024; // 5 MB (mismo límite que R2)

/**
 * Campo de imagen del flyer: dropzone + preview + quitar.
 * El archivo va DIRECTO a R2 vía presign (no registra BusinessImage);
 * la URL queda en el formulario y se adjunta al guardar la propuesta.
 */
function FlyerImageField({
  slug,
  imageUrl,
  onChange,
}: {
  slug: string;
  imageUrl: string | null;
  onChange: (url: string | null, key: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setLocalError(null);
      if (!FLYER_TYPES.includes(file.type)) {
        setLocalError('Formato no soportado. Usa JPG, PNG o WebP.');
        return;
      }
      if (file.size > FLYER_MAX) {
        setLocalError('La imagen excede el límite de 5 MB.');
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      setUploading(true);
      try {
        // 1) presign → 2) PUT directo a R2. La URL pública es una
        // ruta relativa del proxy /api/images/… que el server valida.
        const presign = await presignUpload(slug, file.type, 'EVENT');
        const put = await fetch(presign.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });
        if (!put.ok) {
          setLocalError(
            `No se pudo subir la imagen (código ${put.status}). Revisa tu conexión e intenta de nuevo.`,
          );
          return;
        }
        onChange(presign.publicUrl, presign.key);
      } catch (err) {
        setLocalError(
          err instanceof Error
            ? err.message
            : 'No se pudo subir la imagen. Intenta de nuevo.',
        );
      } finally {
        URL.revokeObjectURL(objectUrl);
        setPreview(null);
        setUploading(false);
      }
    },
    [slug, onChange],
  );

  const displayUrl = preview ?? imageUrl;

  return (
    <div className="grid gap-1.5">
      <Label className="text-white/80 text-xs">
        Flyer personalizado (opcional)
      </Label>

      {displayUrl ? (
        // Imagen ya subida (o subiendo): miniatura + acciones.
        <div className="flex items-start gap-3">
          <div className="relative w-24 aspect-[3/4] shrink-0 rounded-xl overflow-hidden border border-white/15 bg-white/5">
            <img
              src={displayUrl}
              alt="Flyer personalizado"
              className="h-full w-full object-cover"
            />
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 size={20} className="animate-spin text-gold" />
              </div>
            )}
          </div>
          <div className="grid gap-1.5 text-xs">
            <p className="text-white/50">
              La portada mostrará tu arte tal cual. Igual pasa por revisión
              del administrador.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="h-7 border-white/20 text-white hover:bg-white/10 text-xs"
              >
                <Upload size={12} className="mr-1" />
                Cambiar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onChange(null, null)}
                disabled={uploading}
                className="h-7 border-red-500/30 text-red-300 hover:bg-red-500/10 text-xs"
              >
                <X size={12} className="mr-1" />
                Quitar
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // Sin imagen: dropzone (clic o arrastrar).
        <div
          role="button"
          tabIndex={0}
          aria-label="Subir imagen del flyer"
          onClick={() => !uploading && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) void handleFile(file);
          }}
          className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors select-none
            ${dragOver ? 'border-gold/60 bg-gold/10' : 'border-white/15 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.06]'}
            ${uploading ? 'pointer-events-none opacity-70' : 'cursor-pointer'}`}
        >
          {uploading ? (
            <Loader2 size={22} className="animate-spin text-gold" />
          ) : (
            <ImagePlus size={22} className="text-white/40" />
          )}
          <p className="text-xs text-white/60">
            {uploading
              ? 'Subiendo imagen…'
              : 'Arrastra tu flyer aquí o haz clic para elegirlo'}
          </p>
          {!uploading && (
            <p className="text-[11px] text-white/35">
              JPG, PNG o WebP · máx. 5 MB · ideal vertical (ej. 1080×1440)
            </p>
          )}
        </div>
      )}

      {/* Sin imagen la portada dibuja el flyer con tema + emoji. */}
      {!displayUrl && (
        <p className="text-[11px] text-white/35 flex items-center gap-1">
          <Sparkles size={11} className="text-gold/50" />
          Si no subes imagen, el flyer se genera solo con tu tema de color y
          emoji.
        </p>
      )}

      {localError && (
        <p className="text-[11px] text-red-300 flex items-center gap-1">
          <AlertCircle size={11} className="shrink-0" />
          {localError}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = ''; // permite re-seleccionar el mismo archivo
        }}
      />
    </div>
  );}

// ── Form state (mismo espíritu que EventsTab admin) ────────────

type FormState = {
  id: string | null; // null = proponer nuevo
  title: string;
  tagline: string;
  emoji: string;
  theme: string;
  date: string; // 'YYYY-MM-DD' (input date)
  time: string; // 'HH:MM' (input time)
  dayLabel: string;
  dateLabel: string;
  timeLabel: string;
  labelsUnlocked: boolean;
  priceNote: string;
  promoNote: string;
  // Sprint 8.10 — flyer personalizado (imagen opcional en R2).
  imageUrl: string | null;
  imageKey: string | null;
};

function emptyForm(): FormState {
  return {
    id: null,
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
    imageUrl: null,
    imageKey: null,
  };
}

function formFromEvent(ev: AdminEvent): FormState {
  const parts = caracasParts(ev.startsAt);
  return {
    id: ev.id,
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
    imageUrl: ev.imageUrl ?? null,
    imageKey: ev.imageKey ?? null,
  };
}

const STATUS_META: Record<
  BusinessEventStatus,
  { label: string; cls: string; editable: boolean }
> = {
  PENDING_REVIEW: {
    label: 'En revisión',
    cls: 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/15',
    editable: true,
  },
  PUBLISHED: {
    label: 'Publicado',
    cls: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/15',
    editable: false,
  },
  DRAFT: {
    label: 'En preparación (admin)',
    cls: 'bg-white/10 text-white/60 border border-white/15 hover:bg-white/10',
    editable: false,
  },
  REJECTED: {
    label: 'Rechazada',
    cls: 'bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/15',
    editable: true,
  },
};

// ── Componente principal ───────────────────────────────────────

export function EventsOwnerTab({
  slug,
  businessName,
}: {
  slug: string;
  businessName?: string;
}) {
  const qc = useQueryClient();
  const addNotification = useAppStore((s) => s.addNotification);

  const eventsQ = useQuery({
    queryKey: QK_OWNER_EVENTS(slug),
    queryFn: () => fetchOwnerEvents(slug),
    staleTime: 30_000,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AdminEvent | null>(null);

  const invalidate = () =>
    void qc.invalidateQueries({ queryKey: QK_OWNER_EVENTS(slug) });

  const saveMutation = useMutation({
    mutationFn: (input: OwnerEventInput) =>
      form.id
        ? updateOwnerEvent(slug, form.id, input)
        : createOwnerEvent(slug, input),
    onSuccess: (_data, input) => {
      invalidate();
      setFormOpen(false);
      addNotification(
        form.id
          ? `Propuesta "${input.title}" reenviada a revisión.`
          : `Propuesta "${input.title}" enviada — queda en revisión del administrador.`,
        'success',
      );
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOwnerEvent(slug, id),
    onSuccess: () => {
      invalidate();
      setToDelete(null);
      addNotification('Propuesta cancelada.', 'info');
    },
    onError: (e: Error) => addNotification(e.message, 'info'),
  });

  // Agrupar por semana (la API ya viene ordenada por weekOf desc).
  const weeks = useMemo(() => {
    const map = new Map<string, AdminEvent[]>();
    for (const ev of eventsQ.data ?? []) {
      const arr = map.get(ev.weekOf) ?? [];
      arr.push(ev);
      map.set(ev.weekOf, arr);
    }
    return [...map.entries()];
  }, [eventsQ.data]);

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

  /** Re-deriva etiquetas salvo que estén personalizadas. */
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
    const input: OwnerEventInput = {
      title: form.title.trim(),
      tagline: form.tagline.trim(),
      emoji: form.emoji.trim() || '🎉',
      theme: form.theme,
      dayLabel: form.dayLabel,
      dateLabel: form.dateLabel,
      timeLabel: form.timeLabel,
      // Wall clock Caracas → instante (mismo criterio que el admin).
      startsAt: `${form.date}T${form.time}:00-04:00`,
      priceNote: form.priceNote.trim() || null,
      promoNote: form.promoNote.trim() || null,
      weekOf: derived.weekOf,
      // Flyer personalizado (Sprint 8.10) — el server valida que la
      // ruta pertenezca a la carpeta R2 de este local.
      imageUrl: form.imageUrl,
      imageKey: form.imageKey,
    };
    saveMutation.mutate(input);
  };

  const total = eventsQ.data?.length ?? 0;
  const pendientes =
    eventsQ.data?.filter((e) => e.status === 'PENDING_REVIEW').length ?? 0;

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
            {pendientes > 0 && (
              <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/15">
                {pendientes} en revisión
              </Badge>
            )}
          </h3>
          <p className="text-xs text-white/50 mt-1 max-w-xl">
            Propón los flyers de tu local para la portada{' '}
            <span className="text-gold/80">/editorial</span>. El administrador
            los revisa antes de publicar — aquí ves el estado de cada uno.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-gold text-obsidian font-bold hover:bg-gold/90"
        >
          <Plus size={15} className="mr-1" />
          Proponer flyer
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
            Todavía no has propuesto ningún flyer.
          </p>
          <p className="text-xs text-white/40 max-w-sm">
            Crea tu primera propuesta: título, frase corta, fecha y hora. Puedes
            adjuntar el arte de tu flyer (imagen) o dejar que se genere solo
            con tema de color y emoji — el administrador lo publica en la
            portada de la semana.
          </p>
          <Button
            onClick={openCreate}
            variant="outline"
            className="mt-1 border-gold/40 text-gold hover:bg-gold/10"
          >
            <Plus size={15} className="mr-1" />
            Proponer el primer flyer
          </Button>
        </div>
      )}

      {/* Semanas */}
      <div className="space-y-6">
        {weeks.map(([weekOf, events]) => (
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
            </header>
            <ul>
              {events.map((ev) => (
                <OwnerEventRow
                  key={ev.id}
                  ev={ev}
                  onEdit={
                    STATUS_META[ev.status].editable
                      ? () => openEdit(ev)
                      : undefined
                  }
                  onDelete={
                    STATUS_META[ev.status].editable
                      ? () => setToDelete(ev)
                      : undefined
                  }
                />
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* ── Dialog: proponer / editar ─────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto bg-[#0d1120] border-white/15">
          <DialogHeader>
            <DialogTitle className="font-serif text-gold">
              {form.id ? 'Editar propuesta' : 'Proponer flyer'}
            </DialogTitle>
            <DialogDescription>
              {form.id
                ? 'Al guardar, tu propuesta vuelve a revisión del administrador.'
                : `Flyer para ${businessName ?? 'tu local'} — fecha, hora y etiquetas se generan solas en horario de Venezuela. El administrador lo revisa antes de publicarlo.`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
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

            {/* Flyer personalizado (Sprint 8.10) — opcional. */}
            <FlyerImageField
              slug={slug}
              imageUrl={form.imageUrl}
              onChange={(url, key) => setField({ imageUrl: url, imageKey: key })}
            />

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

            {/* Tema + emoji */}
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
                placeholder="2x1 en nacionales · código FIESTA24"
                maxLength={140}
                className="bg-white/5 border-white/15 text-white"
              />
            </div>

            {/* Vista previa de etiquetas */}
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
                    'No se pudo enviar la propuesta.')}
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
              <Send size={14} className="mr-1" />
              {saveMutation.isPending
                ? 'Enviando…'
                : form.id
                  ? 'Guardar y reenviar'
                  : 'Enviar a revisión'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog: cancelar propuesta ───────────────────── */}
      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(v) => !v && setToDelete(null)}
      >
        <AlertDialogContent className="bg-[#0d1120] border-white/15">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              ¿Cancelar esta propuesta?
            </AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{toDelete?.title}&quot; se quitará de la revisión del
              administrador. Podrás proponerla de nuevo cuando quieras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">
              No, dejarla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && deleteMutation.mutate(toDelete.id)}
              className="bg-red-600 text-white hover:bg-red-600/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Cancelando…' : 'Sí, cancelar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Fila de propuesta del dueño ────────────────────────────────

function OwnerEventRow({
  ev,
  onEdit,
  onDelete,
}: {
  ev: AdminEvent;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const meta = STATUS_META[ev.status];
  return (
    <li className="flex flex-wrap items-start gap-3 px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition">
      {ev.imageUrl ? (
        // Miniatura del flyer personalizado (3:4, como en la portada).
        <span className="relative w-12 aspect-[3/4] shrink-0 rounded-lg overflow-hidden border border-white/10 bg-white/5">
          <img
            src={ev.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </span>
      ) : (
        <span
          aria-hidden
          className="text-2xl leading-none select-none w-9 h-9 shrink-0 flex items-center justify-center rounded-lg bg-white/5"
        >
          {ev.emoji}
        </span>
      )}

      <div className="flex-1 min-w-[180px]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-white">
            {ev.title}
          </span>
          <Badge className={meta.cls}>{meta.label}</Badge>
        </div>
        <p className="text-xs text-white/50 mt-0.5 truncate">
          {ev.tagline}
        </p>
        {ev.status === 'REJECTED' && ev.reviewNote && (
          <p className="text-[11px] text-red-300/80 mt-1">
            <Clock3 size={11} className="inline mr-1 -mt-px" />
            El administrador indicó: {ev.reviewNote}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[11px]">
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

      {(onEdit || onDelete) && (
        <div className="flex items-center gap-1 shrink-0">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              title={
                ev.status === 'REJECTED'
                  ? 'Corregir y reenviar'
                  : 'Editar propuesta'
              }
              className="h-8 w-8 p-0 text-white/60 hover:text-gold hover:bg-gold/10"
            >
              <Pencil size={15} />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              title="Cancelar propuesta"
              className="h-8 w-8 p-0 text-white/60 hover:text-red-400 hover:bg-red-500/10"
            >
              <Trash2 size={15} />
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
