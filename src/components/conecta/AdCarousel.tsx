'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT — AdCarousel (Sprint 8.12)
//
// Carrusel de publicidad de la portada (home). Láminas vendidas
// por el admin desde el panel (tab "Publicidad").
//
// Comportamiento:
//  - Carga GET /api/ads (solo anuncios vivos). Si no hay, NO
//    renderiza nada (la portada queda intacta).
//  - Rotación automática cada 5 s (embla, loop) con flechas;
//    se pausa mientras el cursor está encima.
//  - VISTAS: al montar informa los ids en un solo POST batch
//    (/api/ads/views), deduplicado por sesión en sessionStorage
//    para que navegar dentro de la SPA no infle la métrica.
//  - CLICS: cada lámina es <a href="/api/ads/<id>/go"> — el
//    servidor cuenta el clic y redirige al destino (ficha del
//    local o URL externa del anunciante).
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { Megaphone } from 'lucide-react';
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { recordAdViews } from '@/lib/api';
import type { PublicAd } from '@/lib/types';

const AUTOPLAY_MS = 5000;
const VIEWS_DEDUPE_KEY = 'clt_ad_views_v1';

/** Ids aún no contados en esta sesión (para dedupe de impresiones). */
function filterUnseenIds(ids: string[]): string[] {
  try {
    const raw = sessionStorage.getItem(VIEWS_DEDUPE_KEY);
    const seen = new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
    const fresh = ids.filter((id) => !seen.has(id));
    if (fresh.length > 0) {
      for (const id of fresh) seen.add(id);
      sessionStorage.setItem(VIEWS_DEDUPE_KEY, JSON.stringify([...seen]));
    }
    return fresh;
  } catch {
    // sessionStorage bloqueado (privacidad) — contar siempre.
    return ids;
  }
}

export function AdCarousel() {
  const [ads, setAds] = useState<PublicAd[] | null>(null);
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [paused, setPaused] = useState(false);
  const countedRef = useRef(false);

  // ── Carga de anuncios vivos ────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetch('/api/ads')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { ads?: PublicAd[] }) => {
        if (!cancelled) setAds(data.ads ?? []);
      })
      .catch(() => {
        if (!cancelled) setAds([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Impresiones (batch, dedupe por sesión) ─────────────────
  useEffect(() => {
    if (!ads || ads.length === 0 || countedRef.current) return;
    countedRef.current = true;
    const fresh = filterUnseenIds(ads.map((a) => a.id));
    if (fresh.length > 0) void recordAdViews(fresh);
  }, [ads]);

  // ── Autoplay cada 5 s (pausa en hover) ─────────────────────
  useEffect(() => {
    if (!api || !ads || ads.length < 2 || paused) return;
    const timer = window.setInterval(() => {
      api.scrollNext();
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [api, ads, paused]);

  const onMouseEnter = useCallback(() => setPaused(true), []);
  const onMouseLeave = useCallback(() => setPaused(false), []);

  if (!ads || ads.length === 0) return null;

  return (
    <section
      aria-label="Publicidad"
      className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-8"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Carousel
        opts={{ loop: ads.length > 1 }}
        setApi={(e) => setApi(e)}
        className="w-full"
      >
        <CarouselContent>
          {ads.map((ad) => (
            <CarouselItem key={ad.id}>
              <a
                href={`/api/ads/${ad.id}/go`}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                aria-label={`Anuncio: ${ad.title}`}
              >
                <img
                  src={ad.imageUrl}
                  alt={ad.title}
                  loading="lazy"
                  draggable={false}
                  className="w-full h-[150px] sm:h-[190px] md:h-[230px] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
                {/* Etiqueta de transparencia publicitaria */}
                <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-sm px-2.5 py-1 text-[10px] font-mono tracking-widest text-white/75 border border-white/10">
                  <Megaphone size={10} />
                  PUBLICIDAD
                </span>
              </a>
            </CarouselItem>
          ))}
        </CarouselContent>

        {ads.length > 1 && (
          <>
            <CarouselPrevious className="left-2 border-white/25 bg-black/55 text-white hover:bg-black/75 hover:text-white backdrop-blur-sm" />
            <CarouselNext className="right-2 border-white/25 bg-black/55 text-white hover:bg-black/75 hover:text-white backdrop-blur-sm" />
          </>
        )}
      </Carousel>
    </section>
  );
}
