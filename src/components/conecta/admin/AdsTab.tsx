'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT — AdsTab (Sprint 8.12)
//
// Tab "Publicidad" del AdminDashboard: ABM de los anuncios del
// carrusel de la portada (Advertisement) SIN tocar código.
//
// Por anuncio se define:
//  - Arte (imagen subida a R2 vía presign imageType AD — solo admin).
//  - Destino del clic: ficha del local (/local/<slug>, select del
//    directorio) o URL externa del anunciante (WhatsApp, IG, web).
//  - Ventana opcional de campaña (inicio/fin) y orden.
//  - Activo/inactivo con un clic (ojo).
//
// Métricas (vistas y clics) por anuncio y en el resumen superior:
// el argumento de venta ante el anunciante.
//
// Datos: GET/POST /api/admin/ads · PATCH/DELETE /api/admin/ads/[id]
// (funciones en src/lib/api.ts). La portada consume /api/ads en
// vivo, así que los cambios se reflejan al recargar la SPA.
// ─────────────────────────────────────────────────────────────

import { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  MousePointerClick,
  ExternalLink,
  Store,
  AlertCircle,
  ImagePlus,
} from 'lucide-react';
import {
  fetchAdminAds,
  fetchAdminBusinesses,
  createAdminAd,
  updateAdminAd,
  deleteAdminAd,
  presignUpload,
} from '@/lib/api';
import { useAppStore } from '@/lib/store';
import type { AdminAd, AdminAdInput } from '@/lib/types';
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

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const IMAGE_MAX = 5 * 1024 * 1024; // 5 MB

/** ISO → valor de <input type="datetime-local"> en hora local. */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface FormState {
  id: string | null;
  title: string;
  imageUrl: string | null;
  imageKey: string | null;
  linkType: 'interno' | 'externo';
  businessSlug: string; // linkType=interno
  externalUrl: string; // linkType=externo
  sortOrder: string;
  active: boolean;
  startsAt: string; // datetime-local (vacío = sin límite)
  endsAt: string;
}

const emptyForm: FormState = {
  id: null,
  title: '',
  imageUrl: null,
  imageKey: null,
  linkType: 'interno',
  businessSlug: '',
  externalUrl: '',
  sortOrder: '0',
  active: true,
  startsAt: '',
  endsAt: '',
};

// ── Campo de imagen (presign AD → PUT R2 → ruta del proxy) ─────

function AdImageField({
  imageUrl,
  onChange,
}: {
  imageUrl: string | null;
  onChange: (url: string | null, key: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setLocalError(null);
    if (!IMAGE_TYPES.includes(file.type)) {
      setLocalError('Formato no soportado. Usa JPG, PNG o WebP.');
      return;
    }
    if (file.size > IMAGE_MAX) {
      setLocalError('La imagen excede el límite de 5 MB.');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);
    try {
      // 1) presign (imageType AD — solo admin) → 2) PUT directo a R2.
      // La URL pública es la ruta relativa del proxy /api/images/ads/…
      const presign = await presignUpload('', file.type, 'AD');
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
  };

  const displayUrl = preview ?? imageUrl;

  return (
    <div className="grid gap-1.5">
      <Label className="text-white/80 text-xs">Arte del anuncio</Label>

      {displayUrl ? (
        <div className="flex items-start gap-3">
          <div className="relative flex-1 h-28 rounded-xl overflow-hidden border border-white/15 bg-white/5">
            <img
              src={displayUrl}
              alt="Arte del anuncio"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              className="border-white/25 text-white hover:bg-white/10"
            >
              <Pencil size={13} className="mr-1.5" /> Cambiar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange(null, null)}
              className="border-white/25 text-red-300 hover:bg-red-500/10"
            >
              <Trash2 size={13} className="mr-1.5" /> Quitar
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void handleFile(file);
          }}
          className={`flex flex-col items-center justify-center gap-1.5 h-28 rounded-xl border-2 border-dashed transition-colors ${
            dragOver
              ? 'border-gold bg-gold/10'
              : 'border-white/20 bg-white/5 hover:border-white/40'
          }`}
        >
          <ImagePlus size={20} className="text-white/50" />
          <span className="text-xs text-white/60">
            Arrastra la imagen o haz clic para subir (JPG/PNG/WebP · 5 MB)
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />

      {uploading && (
        <p className="text-xs text-gold">Subiendo imagen…</p>
      )}
      {localError && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertCircle size={12} /> {localError}
        </p>
      )}
    </div>
  );
}

// ── Fila de anuncio ────────────────────────────────────────────

function AdRow({
  ad,
  onEdit,
  onDelete,
  onToggle,
  busy,
}: {
  ad: AdminAd;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  busy: boolean;
}) {
  const internal = ad.linkUrl.startsWith('/');
  const ctr =
    ad.views > 0 ? ((ad.clicks / ad.views) * 100).toFixed(1) : null;

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-3 transition-colors ${
        ad.active
          ? 'border-white/10 bg-white/5'
          : 'border-white/5 bg-white/[0.02] opacity-70'
      }`}
    >
      {/* Miniatura */}
      <div className="relative w-28 sm:w-40 shrink-0 h-16 sm:h-20 rounded-xl overflow-hidden border border-white/10 bg-white/5">
        <img
          src={ad.imageUrl}
          alt={ad.title}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="font-semibold text-white text-sm truncate max-w-[16rem]">
            {ad.title}
          </p>
          {ad.active ? (
            <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]">
              Activo
            </Badge>
          ) : (
            <Badge className="bg-white/10 text-white/60 border-white/15 text-[10px]">
              Pausado
            </Badge>
          )}
          <Badge className="bg-white/5 text-white/50 border-white/10 text-[10px]">
            Orden {ad.sortOrder}
          </Badge>
        </div>

        <p className="text-xs text-white/60 mt-1 flex items-center gap-1.5 min-w-0">
          {internal ? (
            <Store size={12} className="shrink-0 text-gold/80" />
          ) : (
            <ExternalLink size={12} className="shrink-0 text-gold/80" />
          )}
          <span className="truncate">
            {internal ? 'Ficha del local' : 'Enlace externo'}: {ad.linkUrl}
          </span>
        </p>

        {(ad.startsAt || ad.endsAt) && (
          <p className="text-[11px] text-white/40 mt-0.5">
            Campaña: {ad.startsAt ? new Date(ad.startsAt).toLocaleDateString('es-VE') : 'sin inicio'}
            {' → '}
            {ad.endsAt ? new Date(ad.endsAt).toLocaleDateString('es-VE') : 'sin fin'}
          </p>
        )}

        {/* Métricas */}
        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-white/60">
          <span className="inline-flex items-center gap-1">
            <Eye size={12} className="text-gold/80" /> {ad.views} vistas
          </span>
          <span className="inline-flex items-center gap-1">
            <MousePointerClick size={12} className="text-gold/80" /> {ad.clicks} clics
          </span>
          {ctr && (
            <span className="text-gold/70">CTR {ctr}%</span>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          disabled={busy}
          title={ad.active ? 'Pausar (ocultar del carrusel)' : 'Activar'}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          {ad.active ? <Eye size={16} /> : <EyeOff size={16} className="text-white/40" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          <Pencil size={16} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="text-red-300/80 hover:text-red-300 hover:bg-red-500/10"
        >
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────

export function AdsTab() {
  const qc = useQueryClient();
  const addNotification = useAppStore((s) => s.addNotification);

  const adsQ = useQuery({
    queryKey: ['admin', 'ads'],
    queryFn: fetchAdminAds,
    staleTime: 30_000,
  });
  const businessesQ = useQuery({
    queryKey: ['admin', 'businesses', 'ad-select'],
    queryFn: () => fetchAdminBusinesses(),
    staleTime: 60_000,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AdminAd | null>(null);

  const ads = adsQ.data ?? [];
  const totals = useMemo(
    () =>
      ads.reduce(
        (acc, a) => ({
          views: acc.views + a.views,
          clicks: acc.clicks + a.clicks,
          active: acc.active + (a.active ? 1 : 0),
        }),
        { views: 0, clicks: 0, active: 0 },
      ),
    [ads],
  );

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['admin', 'ads'] });

  const buildInput = (): AdminAdInput | null => {
    const title = form.title.trim();
    if (!title) {
      setFormError('Ponle un nombre interno al anuncio (solo para ti).');
      return null;
    }
    if (!form.imageUrl) {
      setFormError('Sube el arte del anuncio.');
      return null;
    }
    const linkUrl =
      form.linkType === 'interno'
        ? `/local/${form.businessSlug}`
        : form.externalUrl.trim();
    if (form.linkType === 'interno' && !form.businessSlug) {
      setFormError('Selecciona el local al que llevará el anuncio.');
      return null;
    }
    if (form.linkType === 'externo' && !/^https?:\/\//.test(linkUrl)) {
      setFormError('El link externo debe empezar por https://');
      return null;
    }
    return {
      title,
      imageUrl: form.imageUrl,
      imageKey: form.imageKey,
      linkUrl,
      active: form.active,
      sortOrder: Number(form.sortOrder) || 0,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    };
  };

  const saveMutation = useMutation({
    mutationFn: (input: AdminAdInput) =>
      form.id ? updateAdminAd(form.id, input) : createAdminAd(input),
    onSuccess: (_data, input) => {
      invalidate();
      setFormOpen(false);
      addNotification(
        form.id
          ? `Anuncio "${input.title}" actualizado.`
          : `Anuncio "${input.title}" creado. Ya rueda en la portada si está activo.`,
        'success',
      );
    },
    onError: (e: Error) => {
      setFormError(e.message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (ad: AdminAd) =>
      updateAdminAd(ad.id, { active: !ad.active }),
    onSuccess: (updated) => {
      invalidate();
      addNotification(
        updated.active
          ? `Anuncio "${updated.title}" activado.`
          : `Anuncio "${updated.title}" pausado.`,
        'info',
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (ad: AdminAd) => deleteAdminAd(ad.id),
    onSuccess: (_ok, ad) => {
      invalidate();
      setToDelete(null);
      addNotification(`Anuncio "${ad.title}" eliminado.`, 'success');
    },
  });

  const openCreate = () => {
    setForm(emptyForm);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (ad: AdminAd) => {
    const internal = ad.linkUrl.startsWith('/');
    const slug = internal ? ad.linkUrl.replace(/^\/local\//, '') : '';
    setForm({
      id: ad.id,
      title: ad.title,
      imageUrl: ad.imageUrl,
      imageKey: ad.imageKey,
      linkType: internal ? 'interno' : 'externo',
      businessSlug: slug,
      externalUrl: internal ? '' : ad.linkUrl,
      sortOrder: String(ad.sortOrder),
      active: ad.active,
      startsAt: isoToLocalInput(ad.startsAt),
      endsAt: isoToLocalInput(ad.endsAt),
    });
    setFormError(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Encabezado + resumen de métricas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Megaphone className="text-gold" size={20} />
          <div>
            <h3 className="text-sm font-bold tracking-wide text-white">
              Publicidad de la portada
            </h3>
            <p className="text-xs text-white/50">
              Vende láminas del carrusel y muestra estas métricas al anunciante
            </p>
          </div>
        </div>
        <Button
          onClick={openCreate}
          className="bg-gold text-obsidian font-bold hover:bg-[#e5bf4a]"
        >
          <Plus size={15} className="mr-1.5" /> Nuevo anuncio
        </Button>
      </div>

      {!adsQ.isLoading && ads.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-[10px] tracking-widest text-white/40 font-mono">
              ANUNCIOS
            </p>
            <p className="text-lg font-bold text-white">
              {ads.length}{' '}
              <span className="text-xs font-normal text-white/50">
                ({totals.active} activos)
              </span>
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-[10px] tracking-widest text-white/40 font-mono">
              VISTAS
            </p>
            <p className="text-lg font-bold text-white">{totals.views}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-[10px] tracking-widest text-white/40 font-mono">
              CLICS
            </p>
            <p className="text-lg font-bold text-white">{totals.clicks}</p>
          </div>
          <div className="rounded-xl border border-gold/25 bg-gold/10 px-3 py-2">
            <p className="text-[10px] tracking-widest text-gold/70 font-mono">
              CTR GLOBAL
            </p>
            <p className="text-lg font-bold text-gold">
              {totals.views > 0
                ? `${((totals.clicks / totals.views) * 100).toFixed(1)}%`
                : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Lista */}
      {adsQ.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : adsQ.isError ? (
        <p className="text-sm text-red-400 flex items-center gap-2">
          <AlertCircle size={14} /> No se pudieron cargar los anuncios.
        </p>
      ) : ads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-10 text-center">
          <Megaphone size={28} className="mx-auto text-white/30 mb-2" />
          <p className="text-sm text-white/70 font-medium">
            Todavía no hay anuncios
          </p>
          <p className="text-xs text-white/45 mt-1 max-w-md mx-auto">
            Crea el primero con «Nuevo anuncio»: sube el arte del anunciante,
            elige si lleva a su ficha del directorio o a su WhatsApp/Instagram,
            y rueda en la portada al instante.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {ads.map((ad) => (
            <AdRow
              key={ad.id}
              ad={ad}
              busy={toggleMutation.isPending}
              onEdit={() => openEdit(ad)}
              onDelete={() => setToDelete(ad)}
              onToggle={() => toggleMutation.mutate(ad)}
            />
          ))}
        </div>
      )}

      {/* Dialog de alta/edición */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-[#0d1220] border-white/15 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {form.id ? 'Editar anuncio' : 'Nuevo anuncio'}
            </DialogTitle>
            <DialogDescription className="text-white/50 text-xs">
              La lámina rueda en el carrusel de la portada. Si dejas las fechas
              vacías, el anuncio corre sin límite de campaña.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-1">
            <div className="grid gap-1.5">
              <Label className="text-white/80 text-xs">
                Nombre interno (solo para ti)
              </Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ej: Licobar JJ — banner 2x1"
                className="bg-white/5 border-white/15 text-white"
                maxLength={60}
              />
            </div>

            <AdImageField
              imageUrl={form.imageUrl}
              onChange={(url, key) =>
                setForm({ ...form, imageUrl: url, imageKey: key })
              }
            />

            <div className="grid gap-1.5">
              <Label className="text-white/80 text-xs">
                Destino al hacer clic
              </Label>
              <Select
                value={form.linkType}
                onValueChange={(v) =>
                  setForm({ ...form, linkType: v as 'interno' | 'externo' })
                }
              >
                <SelectTrigger className="bg-white/5 border-white/15 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0d1220] border-white/15 text-white">
                  <SelectItem value="interno">
                    Ficha del local en el directorio
                  </SelectItem>
                  <SelectItem value="externo">
                    Enlace externo (WhatsApp, Instagram, web…)
                  </SelectItem>
                </SelectContent>
              </Select>

              {form.linkType === 'interno' ? (
                <Select
                  value={form.businessSlug}
                  onValueChange={(v) => setForm({ ...form, businessSlug: v })}
                >
                  <SelectTrigger className="bg-white/5 border-white/15 text-white">
                    <SelectValue placeholder="Selecciona el local…" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0d1220] border-white/15 text-white max-h-72">
                    {(businessesQ.data ?? []).map((b) => (
                      <SelectItem key={b.slug} value={b.slug}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={form.externalUrl}
                  onChange={(e) =>
                    setForm({ ...form, externalUrl: e.target.value })
                  }
                  placeholder="https://wa.me/58412… o https://instagram.com/…"
                  className="bg-white/5 border-white/15 text-white"
                  maxLength={500}
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-white/80 text-xs">
                  Inicio de campaña (opcional)
                </Label>
                <Input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) =>
                    setForm({ ...form, startsAt: e.target.value })
                  }
                  className="bg-white/5 border-white/15 text-white"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-white/80 text-xs">
                  Fin de campaña (opcional)
                </Label>
                <Input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                  className="bg-white/5 border-white/15 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div className="grid gap-1.5">
                <Label className="text-white/80 text-xs">
                  Orden (menor = primero)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={999}
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: e.target.value })
                  }
                  className="bg-white/5 border-white/15 text-white"
                />
              </div>
              <label className="flex items-center gap-2 mt-2 sm:mt-5 cursor-pointer">
                <Checkbox
                  checked={form.active}
                  onCheckedChange={(v) =>
                    setForm({ ...form, active: v === true })
                  }
                />
                <span className="text-sm text-white/80">
                  Activo (visible en el carrusel)
                </span>
              </label>
            </div>

            {formError && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle size={12} /> {formError}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              className="border-white/25 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                const input = buildInput();
                if (input) saveMutation.mutate(input);
              }}
              disabled={saveMutation.isPending}
              className="bg-gold text-obsidian font-bold hover:bg-[#e5bf4a]"
            >
              {saveMutation.isPending
                ? 'Guardando…'
                : form.id
                  ? 'Guardar cambios'
                  : 'Crear anuncio'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmación de borrado */}
      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <AlertDialogContent className="bg-[#0d1220] border-white/15 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este anuncio?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              «{toDelete?.title}» saldrá del carrusel de la portada y su imagen
              se borrará del almacenamiento. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/25 text-white hover:bg-white/10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && deleteMutation.mutate(toDelete)}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {deleteMutation.isPending ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
