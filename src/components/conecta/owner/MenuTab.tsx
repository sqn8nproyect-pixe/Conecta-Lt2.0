'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT — MenuTab (Etapa Menú digital)
//
// Pestaña "Menú" del panel de dueño: gestión de la carta digital
// para tascas y licobares. El OwnerDashboard solo la monta cuando
// la categoría del local lo permite.
//
// Estructura: Business → MenuSection[] → MenuItem[].
//   - Switch de visibilidad pública (PATCH /menu/visibility)
//   - Secciones: crear, renombrar, reordenar (↑/↓), borrar
//   - Ítems: crear, editar, disponible / destacado (toggles),
//     reordenar (↑/↓), borrar
//   - Vista previa: render de la carta como la ve el público
//
// Feedback: addNotification del store global (mismo mecanismo que
// el resto del panel) + updates optimistas con rollback en error.
// Todos los fetch son relativos y same-origin (gateway Caddy).
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Save,
  Star,
  Trash2,
  Utensils,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { BusinessMenu, MenuItemData, MenuSectionData } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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

// ─── Constantes (espejo de los límites del backend) ──────────

const QK_OWNER_MENU = (slug: string) => ['owner', 'menu', slug] as const;

/** Nombre de sección/ítem: 1–60 caracteres (valida también el backend). */
const NAME_MAX = 60;
/** Descripción de ítem: máx 200 caracteres. */
const DESC_MAX = 200;
/** Precio: 0–999.99 USD. */
const PRICE_MAX = 999.99;
/** Límites anti-abuso del backend (menu.service.ts). */
const MAX_SECTIONS = 20;
const MAX_ITEMS_PER_SECTION = 60;

type MoveDirection = -1 | 1;

// ─── Helpers ──────────────────────────────────────────────────

/** $12.5 → "$12.50" */
function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

/**
 * Parsea el precio del input (acepta coma o punto decimal) y
 * redondea a 2 decimales. Devuelve null si es inválido.
 */
function parsePrice(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (normalized === '') return null;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value * 100) / 100;
  if (rounded < 0 || rounded > PRICE_MAX) return null;
  return rounded;
}

/**
 * Intercambio de sortOrder entre vecinos. Fallback defensivo si
 * ambos comparten el mismo valor (no debería pasar: el backend
 * asigna siempre max+1), empatando por dirección.
 */
function swapSortOrder(a: number, b: number, dir: MoveDirection): [number, number] {
  if (a === b) {
    return dir === 1 ? [b + 1, b] : [Math.max(0, b - 1), b];
  }
  return [b, a];
}

/**
 * fetch relativo same-origin + parseo del JSON de error del backend
 * ({ error: string }). Lanza Error con el mensaje del server para
 * mostrarlo directo en el toast.
 */
async function menuRequest<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Tu sesión expiró. Recarga la página e inicia sesión de nuevo.');
    }
    const data: unknown = await res.json().catch(() => null);
    const serverError =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : null;
    throw new Error(serverError ?? 'No se pudo completar la operación. Intenta de nuevo.');
  }
  return (await res.json()) as T;
}

/** Aplica un patch de ítem a la carta cacheada (para updates optimistas). */
function applyItemPatch(
  menu: BusinessMenu,
  itemId: string,
  patch: Partial<Pick<MenuItemData, 'name' | 'description' | 'price' | 'available' | 'featured'>>,
): BusinessMenu {
  return {
    ...menu,
    sections: menu.sections.map((section) => ({
      ...section,
      items: section.items.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      ),
    })),
  };
}

// ─── Acciones que el dueño puede disparar sobre un ítem ───────

type MenuItemActions = {
  onToggleAvailable: (item: MenuItemData, available: boolean) => void;
  onToggleFeatured: (item: MenuItemData) => void;
  onEdit: (item: MenuItemData) => void;
  onDelete: (item: MenuItemData) => void;
  onMove: (item: MenuItemData, dir: MoveDirection) => void;
};

// ─── Fila de ítem ─────────────────────────────────────────────

type MenuItemRowProps = {
  item: MenuItemData;
  canMoveUp: boolean;
  canMoveDown: boolean;
  busy: boolean;
  actions: MenuItemActions;
};

function MenuItemRow({ item, canMoveUp, canMoveDown, busy, actions }: MenuItemRowProps) {
  return (
    <div
      className={`rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 transition-opacity ${
        item.available ? '' : 'opacity-50'
      }`}
    >
      {/* Línea 1: nombre (+ estrella / badge) y precio */}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {item.featured && (
              <Star size={12} className="shrink-0 fill-amber-400 text-amber-400" aria-hidden />
            )}
            <span className="text-sm font-medium leading-tight text-white">{item.name}</span>
            {!item.available && (
              <Badge
                variant="outline"
                className="border-zinc-500/30 bg-zinc-500/15 px-1.5 py-0 text-[9px] font-bold tracking-widest text-zinc-300"
              >
                NO DISPONIBLE
              </Badge>
            )}
          </div>
          {item.description && (
            <p className="mt-1 text-xs leading-relaxed text-white/45">{item.description}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="whitespace-nowrap font-mono text-sm font-semibold text-gold">
            {formatPrice(item.price)}
          </span>
          {/* Reordenar */}
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white/40 hover:bg-white/5 hover:text-white"
              onClick={() => actions.onMove(item, -1)}
              disabled={busy || !canMoveUp}
              aria-label={`Subir "${item.name}"`}
              title="Subir"
            >
              <ChevronUp size={14} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white/40 hover:bg-white/5 hover:text-white"
              onClick={() => actions.onMove(item, 1)}
              disabled={busy || !canMoveDown}
              aria-label={`Bajar "${item.name}"`}
              title="Bajar"
            >
              <ChevronDown size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* Línea 2: toggles + editar/borrar */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2">
        <div className="flex items-center gap-2">
          <Switch
            checked={item.available}
            onCheckedChange={(v) => actions.onToggleAvailable(item, v)}
            disabled={busy}
            aria-label={`Marcar "${item.name}" como disponible`}
          />
          <span className="text-[11px] text-white/50">Disponible</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`h-7 w-7 ${
              item.featured
                ? 'text-amber-400 hover:bg-amber-400/10 hover:text-amber-300'
                : 'text-white/30 hover:bg-white/5 hover:text-white/60'
            }`}
            onClick={() => actions.onToggleFeatured(item)}
            disabled={busy}
            aria-pressed={item.featured}
            aria-label={
              item.featured ? `Quitar destacado de "${item.name}"` : `Destacar "${item.name}"`
            }
            title={item.featured ? 'Quitar destacado' : 'Destacar'}
          >
            <Star size={14} className={item.featured ? 'fill-amber-400' : ''} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/40 hover:bg-white/5 hover:text-white"
            onClick={() => actions.onEdit(item)}
            disabled={busy}
            aria-label={`Editar "${item.name}"`}
            title="Editar"
          >
            <Pencil size={13} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/40 hover:bg-red-500/10 hover:text-red-300"
            onClick={() => actions.onDelete(item)}
            disabled={busy}
            aria-label={`Eliminar "${item.name}"`}
            title="Eliminar"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Card de sección ──────────────────────────────────────────

type MenuSectionCardProps = {
  section: MenuSectionData;
  canMoveUp: boolean;
  canMoveDown: boolean;
  busy: boolean;
  onRename: () => void;
  onDelete: () => void;
  onMove: (dir: MoveDirection) => void;
  onAddItem: () => void;
  itemActions: MenuItemActions;
};

function MenuSectionCard({
  section,
  canMoveUp,
  canMoveDown,
  busy,
  onRename,
  onDelete,
  onMove,
  onAddItem,
  itemActions,
}: MenuSectionCardProps) {
  return (
    <section className="glass-card rounded-2xl p-4 sm:p-5">
      {/* Encabezado: nombre + contador + acciones */}
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate font-serif text-lg text-white">
          {section.name}
        </h3>
        <span className="shrink-0 font-mono text-[11px] text-white/35">
          {section.items.length} ítems
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/40 hover:bg-white/5 hover:text-white"
            onClick={() => onMove(-1)}
            disabled={busy || !canMoveUp}
            aria-label={`Subir sección "${section.name}"`}
            title="Subir sección"
          >
            <ChevronUp size={15} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/40 hover:bg-white/5 hover:text-white"
            onClick={() => onMove(1)}
            disabled={busy || !canMoveDown}
            aria-label={`Bajar sección "${section.name}"`}
            title="Bajar sección"
          >
            <ChevronDown size={15} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/40 hover:bg-white/5 hover:text-white"
            onClick={onRename}
            disabled={busy}
            aria-label={`Renombrar sección "${section.name}"`}
            title="Renombrar"
          >
            <Pencil size={13} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/40 hover:bg-red-500/10 hover:text-red-300"
            onClick={onDelete}
            disabled={busy}
            aria-label={`Eliminar sección "${section.name}"`}
            title="Eliminar sección"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      <Separator className="my-3 bg-white/10" />

      {/* Ítems (con scroll si la sección es muy larga) */}
      {section.items.length === 0 ? (
        <p className="mb-3 text-xs italic text-white/40">
          Sección vacía — agrega el primer ítem de &quot;{section.name}&quot;.
        </p>
      ) : (
        <div className="conecta-scroll mb-3 max-h-96 space-y-2 overflow-y-auto pr-1">
          {section.items.map((item, idx) => (
            <MenuItemRow
              key={item.id}
              item={item}
              canMoveUp={idx > 0}
              canMoveDown={idx < section.items.length - 1}
              busy={busy}
              actions={itemActions}
            />
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onAddItem}
        disabled={busy || section.items.length >= MAX_ITEMS_PER_SECTION}
        className="border-dashed border-white/15 text-xs text-white/70 hover:border-gold/40 hover:bg-white/5 hover:text-white"
      >
        <Plus size={12} className="mr-1" /> Agregar ítem
      </Button>
    </section>
  );
}

// ─── Vista previa (render estilo público) ─────────────────────

function MenuPreviewContent({ sections }: { sections: MenuSectionData[] }) {
  if (sections.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-white/40">
        Tu carta aún no tiene secciones — la vista previa se llenará cuando agregues ítems.
      </p>
    );
  }
  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <div key={section.id}>
          {/* Encabezado de sección con línea punteada, estilo carta física */}
          <div className="mb-2 flex items-baseline gap-2">
            <h3 className="font-serif text-lg text-gold">{section.name}</h3>
            <div className="flex-1 border-b border-dotted border-white/15" aria-hidden />
          </div>
          {section.items.length === 0 ? (
            <p className="text-xs italic text-white/35">Sin ítems todavía</p>
          ) : (
            <ul className="space-y-1.5">
              {section.items.map((item) => (
                <li
                  key={item.id}
                  className={`flex items-start justify-between gap-3 ${
                    item.available ? '' : 'opacity-40'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.featured && (
                        <Star
                          size={11}
                          className="shrink-0 fill-amber-400 text-amber-400"
                          aria-hidden
                        />
                      )}
                      <span className="text-sm text-white/90">{item.name}</span>
                      {!item.available && (
                        <Badge
                          variant="outline"
                          className="border-zinc-500/30 bg-zinc-500/15 px-1.5 py-0 text-[9px] font-bold tracking-widest text-zinc-300"
                        >
                          No disponible
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs leading-relaxed text-white/45">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <span className="whitespace-nowrap font-mono text-sm text-gold/90">
                    {formatPrice(item.price)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Formularios de los dialogs ───────────────────────────────

type ItemFormState = {
  name: string;
  description: string;
  price: string;
  featured: boolean;
};

const EMPTY_ITEM_FORM: ItemFormState = {
  name: '',
  description: '',
  price: '',
  featured: false,
};

/** Dialog de ítem: crear (sección destino) o editar (ítem existente). */
type ItemDialogState =
  | { mode: 'create'; section: MenuSectionData }
  | { mode: 'edit'; item: MenuItemData };

/** Dialog de sección: crear o renombrar. */
type SectionDialogState =
  | { mode: 'create' }
  | { mode: 'edit'; section: MenuSectionData };

// ─── Pestaña principal ────────────────────────────────────────

type MenuTabProps = {
  slug: string;
  /** Nombre del local — solo para el encabezado de la vista previa. */
  businessName?: string;
};

export function MenuTab({ slug, businessName }: MenuTabProps) {
  const queryClient = useQueryClient();
  const addNotification = useAppStore((s) => s.addNotification);

  const menuQueryKey = QK_OWNER_MENU(slug);

  // ── GET: carta completa (siempre visible para el dueño) ─────
  const {
    data: menu,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: menuQueryKey,
    queryFn: () =>
      menuRequest<BusinessMenu>(`/api/owner/businesses/${slug}/menu`, 'GET'),
    staleTime: 15_000,
  });

  // ── Estado local de dialogs y formularios ───────────────────
  const [sectionDialog, setSectionDialog] = useState<SectionDialogState | null>(null);
  const [sectionName, setSectionName] = useState('');
  const [sectionError, setSectionError] = useState<string | null>(null);

  const [itemDialog, setItemDialog] = useState<ItemDialogState | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormState>(EMPTY_ITEM_FORM);
  const [itemFormError, setItemFormError] = useState<string | null>(null);

  const [deleteSectionTarget, setDeleteSectionTarget] = useState<MenuSectionData | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<MenuItemData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const visible = menu?.visible ?? false;
  const sections = menu?.sections ?? [];
  const sectionCount = sections.length;
  const itemCount = sections.reduce((acc, s) => acc + s.items.length, 0);

  // ── Mutación: switch de visibilidad pública (optimista) ─────
  const visibilityMutation = useMutation({
    mutationFn: (next: boolean) =>
      menuRequest<{ visible: boolean }>(
        `/api/owner/businesses/${slug}/menu/visibility`,
        'PATCH',
        { menuVisible: next },
      ),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: menuQueryKey });
      const prev = queryClient.getQueryData<BusinessMenu>(menuQueryKey);
      queryClient.setQueryData<BusinessMenu>(menuQueryKey, (old) =>
        old ? { ...old, visible: next } : old,
      );
      return { prev };
    },
    onSuccess: (data) => {
      // Confirmar con lo que el server devolvió + mantener la ficha
      // pública sincronizada (el botón "Ver Menú" depende de esto).
      queryClient.setQueryData<BusinessMenu>(menuQueryKey, (old) =>
        old ? { ...old, visible: data.visible } : old,
      );
      void queryClient.invalidateQueries({ queryKey: ['business', slug] });
      void queryClient.invalidateQueries({ queryKey: ['businesses'] });
      addNotification(
        data.visible
          ? 'Menú visible al público — ya pueden ver tu carta en la ficha del local'
          : 'Menú oculto al público',
        'success',
      );
    },
    onError: (err, _next, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(menuQueryKey, ctx.prev);
      }
      addNotification(
        err instanceof Error ? err.message : 'Error al cambiar la visibilidad del menú',
        'info',
      );
    },
  });

  // ── Mutación: crear / renombrar sección ─────────────────────
  const sectionSaveMutation = useMutation({
    mutationFn: (input: { mode: 'create'; name: string } | { mode: 'edit'; sectionId: string; name: string }) =>
      input.mode === 'create'
        ? menuRequest<MenuSectionData>(
            `/api/owner/businesses/${slug}/menu/sections`,
            'POST',
            { name: input.name },
          )
        : menuRequest<MenuSectionData>(
            `/api/owner/businesses/${slug}/menu/sections/${input.sectionId}`,
            'PATCH',
            { name: input.name },
          ),
    onSuccess: (section, input) => {
      addNotification(
        input.mode === 'create' ? `Sección "${section.name}" agregada` : 'Sección actualizada',
        'success',
      );
      void queryClient.invalidateQueries({ queryKey: menuQueryKey });
      setSectionDialog(null);
    },
    onError: (err) => {
      addNotification(
        err instanceof Error ? err.message : 'Error al guardar la sección',
        'info',
      );
    },
  });

  // ── Mutación: borrar sección (y sus ítems, en cascada) ──────
  const sectionDeleteMutation = useMutation({
    mutationFn: (section: MenuSectionData) =>
      menuRequest<{ ok: true }>(
        `/api/owner/businesses/${slug}/menu/sections/${section.id}`,
        'DELETE',
      ),
    onSuccess: (_data, section) => {
      addNotification(`Sección "${section.name}" eliminada`, 'success');
      void queryClient.invalidateQueries({ queryKey: menuQueryKey });
    },
    onError: (err) => {
      addNotification(
        err instanceof Error ? err.message : 'Error al eliminar la sección',
        'info',
      );
    },
  });

  // ── Mutación: reordenar secciones (swap de sortOrder) ───────
  const sectionMoveMutation = useMutation({
    mutationFn: async ({ index, dir }: { index: number; dir: MoveDirection }) => {
      const current = queryClient.getQueryData<BusinessMenu>(menuQueryKey);
      const a = current?.sections[index];
      const b = current?.sections[index + dir];
      if (!a || !b) throw new Error('No se pudo reordenar la sección');
      const [aOrder, bOrder] = swapSortOrder(a.sortOrder, b.sortOrder, dir);
      await menuRequest(
        `/api/owner/businesses/${slug}/menu/sections/${a.id}`,
        'PATCH',
        { sortOrder: aOrder },
      );
      await menuRequest(
        `/api/owner/businesses/${slug}/menu/sections/${b.id}`,
        'PATCH',
        { sortOrder: bOrder },
      );
    },
    onMutate: async ({ index, dir }) => {
      await queryClient.cancelQueries({ queryKey: menuQueryKey });
      const prev = queryClient.getQueryData<BusinessMenu>(menuQueryKey);
      queryClient.setQueryData<BusinessMenu>(menuQueryKey, (old) => {
        if (!old) return old;
        const j = index + dir;
        const a = old.sections[index];
        const b = old.sections[j];
        if (a === undefined || b === undefined) return old;
        const next = [...old.sections];
        next[index] = b;
        next[j] = a;
        return { ...old, sections: next };
      });
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(menuQueryKey, ctx.prev);
      }
      addNotification(
        err instanceof Error ? err.message : 'Error al reordenar las secciones',
        'info',
      );
    },
    onSettled: () => {
      // El orden canónico lo define el server → resincronizar.
      void queryClient.invalidateQueries({ queryKey: menuQueryKey });
    },
  });

  // ── Mutación: crear ítem ────────────────────────────────────
  const itemCreateMutation = useMutation({
    mutationFn: (input: {
      sectionId: string;
      name: string;
      description: string | null;
      price: number;
      featured: boolean;
    }) =>
      menuRequest<MenuItemData>(`/api/owner/businesses/${slug}/menu/items`, 'POST', input),
    onSuccess: (item) => {
      addNotification(`"${item.name}" agregado a la carta`, 'success');
      void queryClient.invalidateQueries({ queryKey: menuQueryKey });
      setItemDialog(null);
    },
    onError: (err) => {
      addNotification(err instanceof Error ? err.message : 'Error al agregar el ítem', 'info');
    },
  });

  // ── Mutación: editar ítem (dialog nombre/desc/precio/destacado) ──
  const itemEditMutation = useMutation({
    mutationFn: (input: {
      itemId: string;
      patch: {
        name?: string;
        description?: string | null;
        price?: number;
        featured?: boolean;
      };
    }) =>
      menuRequest<MenuItemData>(
        `/api/owner/businesses/${slug}/menu/items/${input.itemId}`,
        'PATCH',
        input.patch,
      ),
    onSuccess: (item) => {
      addNotification(`"${item.name}" actualizado`, 'success');
      void queryClient.invalidateQueries({ queryKey: menuQueryKey });
      setItemDialog(null);
    },
    onError: (err) => {
      addNotification(
        err instanceof Error ? err.message : 'Error al actualizar el ítem',
        'info',
      );
    },
  });

  // ── Mutación: toggles disponibles/destacado (optimista) ─────
  const itemToggleMutation = useMutation({
    mutationFn: (input: {
      itemId: string;
      patch: { available?: boolean; featured?: boolean };
      successMsg: string;
    }) =>
      menuRequest<MenuItemData>(
        `/api/owner/businesses/${slug}/menu/items/${input.itemId}`,
        'PATCH',
        input.patch,
      ),
    onMutate: async ({ itemId, patch }) => {
      await queryClient.cancelQueries({ queryKey: menuQueryKey });
      const prev = queryClient.getQueryData<BusinessMenu>(menuQueryKey);
      if (prev) {
        queryClient.setQueryData<BusinessMenu>(
          menuQueryKey,
          applyItemPatch(prev, itemId, patch),
        );
      }
      return { prev };
    },
    onSuccess: (_item, { successMsg }) => {
      addNotification(successMsg, 'success');
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(menuQueryKey, ctx.prev);
      }
      addNotification(
        err instanceof Error ? err.message : 'Error al actualizar el ítem',
        'info',
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: menuQueryKey });
    },
  });

  // ── Mutación: reordenar ítems dentro de una sección ─────────
  const itemMoveMutation = useMutation({
    mutationFn: async ({
      itemId,
      dir,
    }: {
      itemId: string;
      dir: MoveDirection;
    }) => {
      const current = queryClient.getQueryData<BusinessMenu>(menuQueryKey);
      const section = current?.sections.find((s) =>
        s.items.some((it) => it.id === itemId),
      );
      const index = section?.items.findIndex((it) => it.id === itemId) ?? -1;
      const a = index >= 0 ? section?.items[index] : undefined;
      const b = index >= 0 ? section?.items[index + dir] : undefined;
      if (!section || !a || !b) throw new Error('No se pudo reordenar el ítem');
      const [aOrder, bOrder] = swapSortOrder(a.sortOrder, b.sortOrder, dir);
      await menuRequest(
        `/api/owner/businesses/${slug}/menu/items/${a.id}`,
        'PATCH',
        { sortOrder: aOrder },
      );
      await menuRequest(
        `/api/owner/businesses/${slug}/menu/items/${b.id}`,
        'PATCH',
        { sortOrder: bOrder },
      );
    },
    onMutate: async ({ itemId, dir }) => {
      await queryClient.cancelQueries({ queryKey: menuQueryKey });
      const prev = queryClient.getQueryData<BusinessMenu>(menuQueryKey);
      queryClient.setQueryData<BusinessMenu>(menuQueryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          sections: old.sections.map((section) => {
            const index = section.items.findIndex((it) => it.id === itemId);
            const j = index + dir;
            if (index < 0 || j < 0 || j >= section.items.length) return section;
            const a = section.items[index];
            const b = section.items[j];
            if (a === undefined || b === undefined) return section;
            const items = [...section.items];
            items[index] = b;
            items[j] = a;
            return { ...section, items };
          }),
        };
      });
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(menuQueryKey, ctx.prev);
      }
      addNotification(
        err instanceof Error ? err.message : 'Error al reordenar los ítems',
        'info',
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: menuQueryKey });
    },
  });

  // ── Mutación: borrar ítem (optimista, con rollback) ─────────
  const itemDeleteMutation = useMutation({
    mutationFn: (item: MenuItemData) =>
      menuRequest<{ ok: true }>(
        `/api/owner/businesses/${slug}/menu/items/${item.id}`,
        'DELETE',
      ),
    onMutate: async (item) => {
      await queryClient.cancelQueries({ queryKey: menuQueryKey });
      const prev = queryClient.getQueryData<BusinessMenu>(menuQueryKey);
      if (prev) {
        queryClient.setQueryData<BusinessMenu>(menuQueryKey, {
          ...prev,
          sections: prev.sections.map((section) => ({
            ...section,
            items: section.items.filter((it) => it.id !== item.id),
          })),
        });
      }
      return { prev };
    },
    onSuccess: (_data, item) => {
      addNotification(`"${item.name}" eliminado`, 'success');
    },
    onError: (err, _item, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(menuQueryKey, ctx.prev);
      }
      addNotification(
        err instanceof Error ? err.message : 'Error al eliminar el ítem',
        'info',
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: menuQueryKey });
    },
  });

  // ── Busy global: deshabilita acciones mientras hay una en vuelo ──
  const busy =
    visibilityMutation.isPending ||
    sectionSaveMutation.isPending ||
    sectionDeleteMutation.isPending ||
    sectionMoveMutation.isPending ||
    itemCreateMutation.isPending ||
    itemEditMutation.isPending ||
    itemToggleMutation.isPending ||
    itemMoveMutation.isPending ||
    itemDeleteMutation.isPending;

  // ── Handlers de los formularios ─────────────────────────────

  const openCreateSection = () => {
    setSectionName('');
    setSectionError(null);
    setSectionDialog({ mode: 'create' });
  };

  const openRenameSection = (section: MenuSectionData) => {
    setSectionName(section.name);
    setSectionError(null);
    setSectionDialog({ mode: 'edit', section });
  };

  const submitSection = () => {
    const name = sectionName.trim();
    if (name.length === 0) {
      setSectionError('El nombre de la sección es obligatorio');
      return;
    }
    if (name.length > NAME_MAX) {
      setSectionError(`El nombre no puede pasar de ${NAME_MAX} caracteres`);
      return;
    }
    const dialog = sectionDialog;
    if (!dialog) return;
    sectionSaveMutation.mutate(
      dialog.mode === 'create'
        ? { mode: 'create', name }
        : { mode: 'edit', sectionId: dialog.section.id, name },
    );
  };

  const openCreateItem = (section: MenuSectionData) => {
    setItemForm(EMPTY_ITEM_FORM);
    setItemFormError(null);
    setItemDialog({ mode: 'create', section });
  };

  const openEditItem = (item: MenuItemData) => {
    setItemForm({
      name: item.name,
      description: item.description ?? '',
      price: item.price.toFixed(2),
      featured: item.featured,
    });
    setItemFormError(null);
    setItemDialog({ mode: 'edit', item });
  };

  const submitItem = () => {
    const dialog = itemDialog;
    if (!dialog) return;

    const name = itemForm.name.trim();
    const description = itemForm.description.trim();
    const price = parsePrice(itemForm.price);

    // Validación en cliente (el backend re-valida igual).
    if (name.length === 0) {
      setItemFormError('El nombre del ítem es obligatorio');
      return;
    }
    if (name.length > NAME_MAX) {
      setItemFormError(`El nombre no puede pasar de ${NAME_MAX} caracteres`);
      return;
    }
    if (description.length > DESC_MAX) {
      setItemFormError(`La descripción no puede pasar de ${DESC_MAX} caracteres`);
      return;
    }
    if (price === null) {
      setItemFormError(`Ingresa un precio válido entre 0 y ${PRICE_MAX}`);
      return;
    }

    if (dialog.mode === 'create') {
      itemCreateMutation.mutate({
        sectionId: dialog.section.id,
        name,
        description: description === '' ? null : description,
        price,
        featured: itemForm.featured,
      });
    } else {
      itemEditMutation.mutate({
        itemId: dialog.item.id,
        patch: {
          name,
          description: description === '' ? null : description,
          price,
          featured: itemForm.featured,
        },
      });
    }
  };

  // Acciones de ítem que se pasan a las filas.
  const itemActions: MenuItemActions = {
    onToggleAvailable: (item, available) => {
      itemToggleMutation.mutate({
        itemId: item.id,
        patch: { available },
        successMsg: available
          ? `"${item.name}" disponible de nuevo`
          : `"${item.name}" marcado como no disponible`,
      });
    },
    onToggleFeatured: (item) => {
      itemToggleMutation.mutate({
        itemId: item.id,
        patch: { featured: !item.featured },
        successMsg: item.featured
          ? `"${item.name}" dejó de estar destacado`
          : `"${item.name}" destacado con estrella`,
      });
    },
    onEdit: openEditItem,
    onDelete: (item) => setDeleteItemTarget(item),
    onMove: (item, dir) => itemMoveMutation.mutate({ itemId: item.id, dir }),
  };

  // ── Estados de carga / error ────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
      </div>
    );
  }

  if (isError || !menu) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <AlertCircle size={32} className="mx-auto mb-4 text-red-400/60" />
        <h2 className="mb-2 font-serif text-xl text-white">
          No se pudo cargar tu menú
        </h2>
        <p className="mx-auto mb-6 max-w-md text-sm text-white/50">
          Ocurrió un error al traer la carta. Revisa tu conexión e intenta de nuevo.
        </p>
        <Button
          onClick={() => void refetch()}
          className="bg-gold text-obsidian hover:bg-gold/80"
        >
          Reintentar
        </Button>
      </div>
    );
  }

  // ── Render principal ────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ─── Cabecera: switch de visibilidad + resumen + acciones ─── */}
      <section className="glass-card rounded-2xl p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen size={16} className="text-gold" />
          <h2 className="text-xs font-mono font-bold tracking-[3px] text-gold">
            CARTA DIGITAL
          </h2>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Switch de visibilidad (la petición central del dueño) */}
          <div className="flex items-start gap-3">
            <Switch
              checked={visible}
              onCheckedChange={(next) => visibilityMutation.mutate(next)}
              disabled={visibilityMutation.isPending}
              aria-label="Menú visible al público"
              className="mt-0.5 data-[state=checked]:bg-gold"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">Menú visible al público</p>
              <p className="mt-0.5 text-xs leading-relaxed text-white/50">
                {visible
                  ? 'El público puede ver tu carta en la ficha del local'
                  : 'Tu carta está oculta — actívala cuando quieras'}
              </p>
              {visible && sectionCount === 0 && (
                <p className="mt-1 text-[11px] leading-relaxed text-amber-300/80">
                  Ojo: tu carta está vacía — agrega secciones e ítems para que el
                  público vea algo.
                </p>
              )}
            </div>
          </div>

          {/* Resumen + acciones */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-white/50">
              <span className="font-bold text-gold">{sectionCount}</span> secciones ·{' '}
              <span className="font-bold text-gold">{itemCount}</span> ítems
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              className="border-white/15 text-xs text-white hover:border-gold/40 hover:bg-white/5"
            >
              <Eye size={13} className="mr-1.5" /> Vista previa
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={openCreateSection}
              disabled={busy || sectionCount >= MAX_SECTIONS}
              className="bg-gold text-xs text-obsidian hover:bg-gold/80"
            >
              <Plus size={13} className="mr-1" /> Agregar sección
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Secciones (o empty state) ─── */}
      {sectionCount === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <Utensils size={32} className="mx-auto mb-4 text-white/20" />
          <h2 className="mb-2 font-serif text-xl text-white">Tu menú está vacío</h2>
          <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-white/50">
            Agrega tu primera sección (ej. Cervezas, Rones y Whisky, Parrilla) y
            empieza a cargar lo que ofreces. Cuando esté lista, activa el switch
            para que el público la vea.
          </p>
          <Button
            onClick={openCreateSection}
            className="bg-gold text-obsidian hover:bg-gold/80"
          >
            <Plus size={14} className="mr-1.5" /> Agregar sección
          </Button>
        </div>
      ) : (
        sections.map((section, index) => (
          <MenuSectionCard
            key={section.id}
            section={section}
            canMoveUp={index > 0}
            canMoveDown={index < sections.length - 1}
            busy={busy}
            onRename={() => openRenameSection(section)}
            onDelete={() => setDeleteSectionTarget(section)}
            onMove={(dir) => sectionMoveMutation.mutate({ index, dir })}
            onAddItem={() => openCreateItem(section)}
            itemActions={itemActions}
          />
        ))
      )}

      {/* ─── Dialog: crear / renombrar sección ─── */}
      <Dialog
        open={sectionDialog !== null}
        onOpenChange={(open) => {
          if (!open) setSectionDialog(null);
        }}
      >
        <DialogContent className="max-w-sm border-white/10 bg-zinc-900 text-white">
          <DialogHeader>
            <DialogTitle>
              {sectionDialog?.mode === 'edit' ? 'Editar sección' : 'Nueva sección'}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {sectionDialog?.mode === 'edit'
                ? 'Cambia el nombre de la sección.'
                : 'Ejemplos: Cervezas, Rones y Whisky, Parrilla, Picadas.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-1">
            <Label className="text-xs text-white/70">Nombre *</Label>
            <Input
              value={sectionName}
              onChange={(e) => {
                setSectionName(e.target.value);
                if (sectionError) setSectionError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitSection();
              }}
              maxLength={NAME_MAX}
              placeholder="Cervezas"
              className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
            />
            {sectionError && <p className="text-xs text-red-300">{sectionError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSectionDialog(null)}
              className="border-white/15 text-white hover:bg-white/5"
            >
              Cancelar
            </Button>
            <Button
              onClick={submitSection}
              disabled={sectionSaveMutation.isPending}
              className="bg-gold text-obsidian hover:bg-gold/80"
            >
              <Save size={14} className="mr-1" />
              {sectionSaveMutation.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: crear / editar ítem ─── */}
      <Dialog
        open={itemDialog !== null}
        onOpenChange={(open) => {
          if (!open) setItemDialog(null);
        }}
      >
        <DialogContent className="max-w-lg border-white/10 bg-zinc-900 text-white">
          <DialogHeader>
            <DialogTitle>
              {itemDialog?.mode === 'edit' ? 'Editar ítem' : 'Nuevo ítem'}
              {itemDialog?.mode === 'create' && (
                <span className="ml-1.5 text-sm font-normal text-gold">
                  en {itemDialog.section.name}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              El precio se muestra en la carta con dos decimales (ej. $3.50).
            </DialogDescription>
          </DialogHeader>

          <div
            className="grid max-h-[60vh] grid-cols-1 gap-3 overflow-y-auto py-2 conecta-scroll"
            style={{ scrollbarWidth: 'thin' }}
          >
            <div className="space-y-1.5">
              <Label className="text-xs text-white/70">Nombre *</Label>
              <Input
                value={itemForm.name}
                onChange={(e) => {
                  setItemForm((f) => ({ ...f, name: e.target.value }));
                  if (itemFormError) setItemFormError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitItem();
                }}
                maxLength={NAME_MAX}
                placeholder="Polar en lata"
                className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-white/70">Descripción (opcional)</Label>
              <Textarea
                value={itemForm.description}
                onChange={(e) => {
                  setItemForm((f) => ({ ...f, description: e.target.value }));
                  if (itemFormError) setItemFormError(null);
                }}
                maxLength={DESC_MAX}
                placeholder="600 ml, bien fría"
                className="min-h-16 border-white/10 bg-white/5 text-white placeholder:text-white/40"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-white/70">Precio (USD) *</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={itemForm.price}
                onChange={(e) => {
                  setItemForm((f) => ({ ...f, price: e.target.value }));
                  if (itemFormError) setItemFormError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitItem();
                }}
                placeholder="2.50"
                className="border-white/10 bg-white/5 font-mono text-white placeholder:text-white/40"
              />
              <p className="text-[11px] text-white/40">
                Entre 0 y 999.99 — acepta coma o punto decimal.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="menu-item-featured"
                checked={itemForm.featured}
                onCheckedChange={(v) => setItemForm((f) => ({ ...f, featured: v === true }))}
              />
              <Label
                htmlFor="menu-item-featured"
                className="cursor-pointer text-xs text-white/70"
              >
                Destacado (aparece con estrella en la carta)
              </Label>
            </div>
            {itemFormError && <p className="text-xs text-red-300">{itemFormError}</p>}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setItemDialog(null)}
              className="border-white/15 text-white hover:bg-white/5"
            >
              Cancelar
            </Button>
            <Button
              onClick={submitItem}
              disabled={itemCreateMutation.isPending || itemEditMutation.isPending}
              className="bg-gold text-obsidian hover:bg-gold/80"
            >
              <Save size={14} className="mr-1" />
              {itemCreateMutation.isPending || itemEditMutation.isPending
                ? 'Guardando…'
                : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: vista previa pública ─── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl border-white/10 bg-zinc-900 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye size={16} className="text-gold" /> Vista previa de la carta
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Así la ve el público en la ficha de{' '}
              {businessName ? `"${businessName}"` : 'tu local'}.
            </DialogDescription>
          </DialogHeader>
          {!visible && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
              <EyeOff size={14} className="mt-0.5 shrink-0 text-amber-300" />
              <p className="text-xs leading-relaxed text-amber-200/90">
                Tu menú está oculto — el público no lo ve hasta que actives el
                switch &quot;Menú visible al público&quot;.
              </p>
            </div>
          )}
          <div className="conecta-scroll max-h-[60vh] overflow-y-auto pr-1">
            <MenuPreviewContent sections={menu.sections} />
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── AlertDialog: borrar sección (cascada de ítems) ─── */}
      <AlertDialog
        open={deleteSectionTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteSectionTarget(null);
        }}
      >
        <AlertDialogContent className="border-white/10 bg-zinc-900 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar la sección &quot;{deleteSectionTarget?.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Se borrarán también sus{' '}
              <span className="font-bold text-gold">
                {deleteSectionTarget?.items.length ?? 0}
              </span>{' '}
              ítems. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-white/5 text-white hover:bg-white/10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500/90 text-white hover:bg-red-500"
              onClick={() => {
                if (deleteSectionTarget) {
                  sectionDeleteMutation.mutate(deleteSectionTarget);
                }
              }}
            >
              <Trash2 size={14} className="mr-1" /> Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── AlertDialog: borrar ítem ─── */}
      <AlertDialog
        open={deleteItemTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteItemTarget(null);
        }}
      >
        <AlertDialogContent className="border-white/10 bg-zinc-900 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar &quot;{deleteItemTarget?.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              El ítem desaparecerá de tu carta. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-white/5 text-white hover:bg-white/10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500/90 text-white hover:bg-red-500"
              onClick={() => {
                if (deleteItemTarget) {
                  itemDeleteMutation.mutate(deleteItemTarget);
                }
              }}
            >
              <Trash2 size={14} className="mr-1" /> Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
