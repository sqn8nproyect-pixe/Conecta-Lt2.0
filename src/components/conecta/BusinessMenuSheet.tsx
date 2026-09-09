'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT — BusinessMenuSheet
//
// Visor público de la carta digital (menú) de un local, en un
// sheet inferior (~85vh) pensado para leerse desde el teléfono
// en la mesa. Estilo dark nocturno con acentos dorados, igual
// que el resto de la ficha (EstablishmentPage).
//
// Contrato: GET /api/businesses/[slug]/menu →
//   { visible, sections, menuFiles? }.
//   - visible:false → sections viene [] → mensaje "Esta carta no
//     está disponible" (el botón "Ver Menú" ni siquiera debería
//     mostrarse cuando menuVisible es false, pero se maneja).
//   - menuFiles (opcional): fotos/PDF de la carta subidos por el
//     dueño y aprobados por moderación (máx 3) → pestaña
//     "Fotos de la carta" al final de las tabs de secciones.
// La carga es LAZY: el fetch se dispara al abrir el sheet
// (React Query con enabled: open), nunca al montar la ficha.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  BookOpen,
  FileText,
  RefreshCw,
  Star,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type {
  BusinessMenu,
  Establishment,
  MenuFileData,
  MenuItemData,
  MenuSectionData,
} from '@/lib/types';

/** Datos mínimos del local que necesita el visor. */
type MenuEstablishment = Pick<Establishment, 'name' | 'slug' | 'category'>;

interface BusinessMenuSheetProps {
  /** Controla si el sheet está abierto (la ficha lo monta siempre). */
  open: boolean;
  /** Cierre: radix lo invoca con false en Escape, overlay o botón cerrar. */
  onOpenChange: (open: boolean) => void;
  /** Local cuya carta se muestra (cabecera + slug para el fetch). */
  establishment: MenuEstablishment;
}

/** Identidad estable para el caso "sin secciones" (evita re-renders falsos). */
const EMPTY_SECTIONS: MenuSectionData[] = [];

/** Identidad estable para el caso "sin archivos de carta". */
const EMPTY_MENU_FILES: MenuFileData[] = [];

/** ID estable de la pseudo-sección "Fotos de la carta" (tabs + scroll-spy). */
const FILES_SECTION_ID = 'menu-files';

/**
 * Detecta si un archivo de carta es un PDF. La clave R2 conserva la
 * extensión original y la URL viaja por el proxy /api/images/..., así
 * que basta con mirar el sufijo.
 */
function isPdfFile(url: string): boolean {
  return url.toLowerCase().endsWith('.pdf');
}

/** Formato de precio de la carta: "$" + 2 decimales (ej. $4.50). */
function formatMenuPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

/** Estado vacío / error con icono circular dorado. */
function MenuEmptyState({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
      <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
        {icon}
      </div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-xs text-white/50 max-w-[280px] leading-relaxed">
        {hint}
      </p>
    </div>
  );
}

/** Skeleton de líneas mientras llega la carta (anchos variados). */
function MenuSkeleton() {
  const widths = ['w-1/2', 'w-2/3', 'w-1/3', 'w-3/5', 'w-1/2', 'w-2/5', 'w-3/4'];
  return (
    <div className="px-5 sm:px-6 py-6 space-y-6" aria-hidden="true">
      <div className="h-3 w-28 rounded bg-white/10 animate-pulse" />
      {widths.map((w, i) => (
        <div key={i} className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className={cn('h-4 rounded bg-white/10 animate-pulse', w)} />
            <div className="h-3 w-3/4 rounded bg-white/5 animate-pulse" />
          </div>
          <div className="h-4 w-14 rounded bg-white/10 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/** Fila de ítem de la carta: nombre + descripción + precio a la derecha. */
function MenuItemRow({ item }: { item: MenuItemData }) {
  const unavailable = !item.available;
  return (
    <li
      className={cn(
        'flex items-start justify-between gap-4 py-3.5',
        unavailable && 'opacity-50',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Destacado → estrella dorada pequeña (accesible vía sr-only). */}
          {item.featured && (
            <>
              <Star
                size={12}
                className="text-gold shrink-0"
                fill="#D4AF37"
                aria-hidden="true"
              />
              <span className="sr-only">Destacado:</span>
            </>
          )}
          <h5
            className={cn(
              'text-sm sm:text-[15px] font-bold text-white leading-snug',
              unavailable && 'line-through decoration-white/60',
            )}
          >
            {item.name}
          </h5>
          {unavailable && (
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-[9px] font-black tracking-wider uppercase text-white/60">
              No disponible
            </span>
          )}
        </div>
        {item.description && (
          <p className="text-sm text-white/50 mt-0.5 leading-relaxed font-light">
            {item.description}
          </p>
        )}
      </div>
      <span className="shrink-0 mt-0.5 font-mono font-black tracking-tight text-gold text-base sm:text-lg">
        {formatMenuPrice(item.price)}
      </span>
    </li>
  );
}

/**
 * Tarjeta de PDF de la carta: no se renderiza inline (los visores
 * móviles son poco fiables dentro de un sheet) → se abre en pestaña
 * nueva con el visor nativo del sistema.
 */
function MenuPdfCard({
  file,
  businessName,
}: {
  file: MenuFileData;
  businessName: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="shrink-0 w-10 h-10 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center">
        <FileText size={18} className="text-gold" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white truncate">
          Documento PDF
        </p>
        <p className="text-xs text-white/50 mt-0.5">
          Toca “Abrir PDF” para verlo completo
        </p>
      </div>
      <button
        type="button"
        onClick={() => window.open(file.url, '_blank', 'noopener,noreferrer')}
        aria-label={`Abrir PDF de la carta de ${businessName}`}
        className="shrink-0 h-10 px-4 rounded-lg bg-gold text-obsidian text-xs font-bold hover:bg-gold/90 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
      >
        Abrir PDF
      </button>
    </div>
  );
}

/**
 * Bloque de sección (título dorado + divisor + lista de ítems).
 * `innerRef` registra el nodo para el scroll-spy / scroll por tab.
 */
function MenuSectionBlock({
  section,
  innerRef,
}: {
  section: MenuSectionData;
  innerRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div ref={innerRef} className="px-5 sm:px-6 pt-6 pb-2">
      <div className="flex items-center gap-3 mb-2">
        <h4 className="font-mono text-xs font-bold tracking-[3px] text-gold uppercase whitespace-nowrap">
          {section.name}
        </h4>
        <div className="flex-1 h-px bg-white/10" aria-hidden="true" />
      </div>
      {section.items.length === 0 ? (
        <p className="text-sm text-white/40 italic py-2">
          Sin ítems en esta sección por ahora.
        </p>
      ) : (
        <ul className="divide-y divide-white/5">
          {section.items.map((item) => (
            <MenuItemRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Pseudo-sección "Fotos de la carta": archivos (imágenes/PDF) que el
 * dueño subió y la moderación aprobó. Se registra en el scroll-spy
 * igual que una sección manual (mismo header, mismo ref). Las imágenes
 * van full-width (pinch-zoom / long-press nativos del navegador); los
 * PDF como tarjeta con botón "Abrir PDF".
 */
function MenuFilesBlock({
  files,
  businessName,
  innerRef,
}: {
  files: MenuFileData[];
  businessName: string;
  innerRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div ref={innerRef} className="px-5 sm:px-6 pt-6 pb-2">
      {/* Mismo header que MenuSectionBlock para consistencia visual. */}
      <div className="flex items-center gap-3 mb-4">
        <h4 className="font-mono text-xs font-bold tracking-[3px] text-gold uppercase whitespace-nowrap">
          Fotos de la carta
        </h4>
        <div className="flex-1 h-px bg-white/10" aria-hidden="true" />
      </div>

      <div className="space-y-4">
        {files.map((file, index) =>
          isPdfFile(file.url) ? (
            <MenuPdfCard key={file.id} file={file} businessName={businessName} />
          ) : (
            <figure key={file.id} className="m-0">
              <img
                src={file.url}
                alt={`Foto ${index + 1} de la carta de ${businessName}`}
                loading="lazy"
                className="w-full h-auto rounded-xl border border-white/10 bg-white/5"
              />
            </figure>
          ),
        )}
      </div>
    </div>
  );
}

export function BusinessMenuSheet({
  open,
  onOpenChange,
  establishment,
}: BusinessMenuSheetProps) {
  const { name, slug, category } = establishment;

  // ── Fetch lazy: solo se dispara cuando el sheet está abierto ──
  // staleTime corto: al reabrir enseguida muestra caché sin parpadeo;
  // pasado un rato, revalida en background al volver a abrir.
  const {
    data: menu,
    isLoading,
    isError,
    refetch,
  } = useQuery<BusinessMenu>({
    queryKey: ['business-menu', slug],
    queryFn: async () => {
      const res = await fetch(`/api/businesses/${slug}/menu`);
      if (!res.ok) throw new Error('No se pudo cargar la carta');
      return (await res.json()) as BusinessMenu;
    },
    enabled: open && !!slug,
    staleTime: 30 * 1000,
  });

  // Defensivo: el contrato dice sections[], pero blindamos la UI.
  const sections: MenuSectionData[] =
    menu && menu.visible && Array.isArray(menu.sections)
      ? menu.sections
      : EMPTY_SECTIONS;

  // Archivos de carta (fotos/PDF) aprobados — opcionales en el
  // contrato; blindamos igual que sections.
  const menuFiles: MenuFileData[] =
    menu && menu.visible && Array.isArray(menu.menuFiles)
      ? menu.menuFiles
      : EMPTY_MENU_FILES;
  const hasMenuFiles = menuFiles.length > 0;

  // Targets de tabs + scroll-spy: las secciones manuales y, al final,
  // la pseudo-sección "Fotos de la carta" (solo si hay archivos). Con
  // SOLO archivos → única tab y queda auto-seleccionada (el estado
  // vacío "Carta aún no disponible" solo aplica si no hay nada).
  const scrollTargets: Array<{ id: string; name: string }> = [
    ...sections.map((s) => ({ id: s.id, name: s.name })),
    ...(hasMenuFiles
      ? [{ id: FILES_SECTION_ID, name: 'Fotos de la carta' }]
      : []),
  ];

  // ── Scroll interno + tabs ─────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // Evita que el scroll-spy pise el resaltado durante el scroll
  // programático (smooth) disparado al tocar una tab.
  const programmaticUntil = useRef(0);
  // Sección resaltada por el usuario (tap o scroll). null → primera.
  const [activeOverride, setActiveOverride] = useState<string | null>(null);
  const activeSectionId = activeOverride ?? scrollTargets[0]?.id ?? null;

  // Al (re)abrir el sheet: scroll arriba + resalta la primera sección.
  // Deps solo [open]: una revalidación en background NO debe saltar
  // al usuario hacia arriba mientras lee la carta.
  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: 0 });
    setActiveOverride(null);
  }, [open]);

  /** Scroll-spy: marca la sección visible bajo las tabs. */
  const handleScroll = () => {
    const container = scrollRef.current;
    const first = scrollTargets[0];
    const last = scrollTargets[scrollTargets.length - 1];
    if (!container || !first || !last) return;
    if (Date.now() < programmaticUntil.current) return; // animación en curso

    const tabsHeight = tabsRef.current?.offsetHeight ?? 0;
    const pointer = container.scrollTop + tabsHeight + 48; // umbral
    let current = first.id;
    for (const t of scrollTargets) {
      const el = sectionRefs.current.get(t.id);
      if (el && el.offsetTop <= pointer) current = t.id;
    }
    // Con scroll posible: al llegar al fondo, activa la última sección
    // (con archivos aprobados, normalmente "Fotos de la carta").
    const scrollable = container.scrollHeight > container.clientHeight + 16;
    const atBottom =
      container.scrollTop + container.clientHeight >=
      container.scrollHeight - 8;
    if (scrollable && atBottom) current = last.id;

    setActiveOverride((prev) => (prev === current ? prev : current));
  };

  /** Tap en tab: resalta + scroll suave del CONTENIDO INTERNO del sheet. */
  const handleTabClick = (sectionId: string) => {
    setActiveOverride(sectionId);
    const container = scrollRef.current;
    const el = sectionRefs.current.get(sectionId);
    if (!container || !el) return;
    const tabsHeight = tabsRef.current?.offsetHeight ?? 0;
    programmaticUntil.current = Date.now() + 800;
    container.scrollTo({
      top: Math.max(0, el.offsetTop - tabsHeight - 8),
      behavior: 'smooth',
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          'h-[85vh] max-h-[85vh] rounded-t-3xl bg-obsidian border-t border-gold/30',
          'gap-0 p-0 mx-auto sm:max-w-2xl [padding-bottom:env(safe-area-inset-bottom)]',
          // Oculta el botón cerrar auto-generado del Sheet: usamos el
          // nuestro (aria en español + target táctil de 44px) en la
          // cabecera. El Close de shadcn es siempre el último hijo
          // directo <button> del contenido.
          '[&>button:last-child]:hidden',
        )}
      >
        {/* ── Cabecera: nombre + badge de categoría + botón cerrar ── */}
        <div className="shrink-0 border-b border-white/10 px-5 sm:px-6 py-4 pr-16">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-11 h-11 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center">
              <UtensilsCrossed
                size={20}
                className="text-gold"
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="font-serif text-xl sm:text-2xl font-black text-white leading-tight truncate">
                {name}
              </SheetTitle>
              <div className="mt-1.5">
                <span className="inline-block uppercase tracking-[3px] text-[10px] text-gold font-bold font-mono bg-gold/10 border border-gold/30 px-2.5 py-0.5 rounded-full">
                  {category}
                </span>
              </div>
            </div>
          </div>
          {/* Descripción accesible oculta (radix pide Title + Description). */}
          <SheetDescription className="sr-only">
            Carta digital de {name}
          </SheetDescription>
        </div>

        {/* Botón cerrar (44px, accesible en español) */}
        <SheetClose
          aria-label="Cerrar carta"
          className="absolute top-4 right-4 z-20 w-11 h-11 rounded-full bg-white/5 border border-white/15 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/30 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
        >
          <X size={18} aria-hidden="true" />
        </SheetClose>

        {/* ── Cuerpo según estado ── */}
        {isLoading ? (
          <div className="flex-1 min-h-0 overflow-y-auto conecta-scroll">
            <MenuSkeleton />
          </div>
        ) : isError ? (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <AlertTriangle
                className="w-7 h-7 text-red-400"
                aria-hidden="true"
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">
                No se pudo cargar la carta
              </p>
              <p className="text-xs text-white/50">
                Revisa tu conexión e inténtalo de nuevo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold text-obsidian text-sm font-semibold hover:bg-gold/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Reintentar
            </button>
          </div>
        ) : !menu || !menu.visible ? (
          // Contrato: visible:false → sin carta. El botón de la ficha ni
          // siquiera debería mostrarse; se cubre el caso por robustez.
          <MenuEmptyState
            icon={<BookOpen size={24} aria-hidden="true" />}
            title="Esta carta no está disponible"
            hint="El local todavía no ha publicado su carta."
          />
        ) : sections.length === 0 && !hasMenuFiles ? (
          // Ni secciones manuales ni archivos aprobados → sí vacío.
          <MenuEmptyState
            icon={<UtensilsCrossed size={24} aria-hidden="true" />}
            title="Carta aún no disponible"
            hint="Este local todavía no ha añadido secciones a su carta."
          />
        ) : (
          <>
            {/* ── Tabs de secciones: fijas bajo la cabecera (efecto
                sticky), scrolleables en horizontal con scrollbar oculto ── */}
            <div
              ref={tabsRef}
              className="shrink-0 bg-obsidian border-b border-white/10"
            >
              <nav
                aria-label="Secciones de la carta"
                className="flex gap-2 overflow-x-auto scrollbar-none px-5 sm:px-6 py-3"
              >
                {scrollTargets.map((target) => {
                  const isActive = target.id === activeSectionId;
                  return (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => handleTabClick(target.id)}
                      aria-current={isActive ? 'true' : undefined}
                      className={cn(
                        'shrink-0 whitespace-nowrap h-9 px-4 rounded-full border text-xs font-bold tracking-wide transition-all active:scale-95',
                        isActive
                          ? 'bg-gold text-obsidian border-gold glow-gold'
                          : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:border-white/30',
                      )}
                    >
                      {target.name}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* ── Contenido scrolleable: secciones + ítems ──
                relative → los offsetTop de las secciones se miden
                contra este contenedor para el scroll por tab. */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="relative flex-1 min-h-0 overflow-y-auto conecta-scroll"
            >
              {sections.map((section) => (
                <MenuSectionBlock
                  key={section.id}
                  section={section}
                  innerRef={(el) => {
                    if (el) sectionRefs.current.set(section.id, el);
                    else sectionRefs.current.delete(section.id);
                  }}
                />
              ))}
              {hasMenuFiles && (
                <MenuFilesBlock
                  files={menuFiles}
                  businessName={name}
                  innerRef={(el) => {
                    if (el) sectionRefs.current.set(FILES_SECTION_ID, el);
                    else sectionRefs.current.delete(FILES_SECTION_ID);
                  }}
                />
              )}
              {/* Respiro final + zona segura inferior */}
              <div className="h-8" aria-hidden="true" />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
