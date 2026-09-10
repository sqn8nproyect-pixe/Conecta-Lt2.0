// ─────────────────────────────────────────────────────────────
// CONECTA-LT — Grid de flyers del fin de semana (Sprint 8.7)
//
// Portada visual de la editorial: cada evento de los dueños de
// locales se renderiza como un FLYER (poco texto, mucha color).
// Clic en el flyer → modal con el detalle del evento, la promo,
// el teléfono del local y acceso a su ficha /local/[slug].
//
// El flyer es un <Link href="/local/..."> real (SEO + navegación
// sin JS); el onClick lo intercepta para abrir el modal.
//
// Los themes van como clases literales en un mapa: Tailwind v4
// escanea el archivo y genera todas las variantes (jamás
// construir clases dinámicamente).
// ─────────────────────────────────────────────────────────────

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, MapPin, PartyPopper, Phone, Tag, X } from 'lucide-react';

export type FlyerEvent = {
  id: string;
  title: string;
  tagline: string;
  emoji: string;
  theme: string;
  dayLabel: string;
  dateLabel: string;
  timeLabel: string;
  priceNote: string | null;
  promoNote: string | null;
  business: {
    name: string;
    slug: string;
    zone: string | null;
    address: string | null;
    phone: string | null;
  };
};

type ThemeSpec = {
  /** Fondo del flyer (gradiente vertical). */
  bg: string;
  /** Color del texto de acento (hora, pill del día). */
  accent: string;
  /** Blob difuminado decorativo. */
  glow: string;
  /** Chip de promo dentro del flyer. */
  chip: string;
  /** Botón primario del modal. */
  cta: string;
};

const THEMES: Record<string, ThemeSpec> = {
  gold: {
    bg: 'from-[#2a2108] via-[#1a1406] to-[#0d0a03]',
    accent: 'text-[#f0c93f]',
    glow: 'bg-[#f0c93f]',
    chip: 'bg-[#f0c93f]/15 border-[#f0c93f]/40 text-[#f5d76a]',
    cta: 'bg-[#f0c93f]/20 border-[#f0c93f]/50 text-[#f5d76a] hover:bg-[#f0c93f]/30',
  },
  purple: {
    bg: 'from-[#241238] via-[#180c26] to-[#0c0614]',
    accent: 'text-[#c084fc]',
    glow: 'bg-[#a855f7]',
    chip: 'bg-[#c084fc]/15 border-[#c084fc]/40 text-[#d8b4fe]',
    cta: 'bg-[#c084fc]/20 border-[#c084fc]/50 text-[#d8b4fe] hover:bg-[#c084fc]/30',
  },
  red: {
    bg: 'from-[#2d0f12] via-[#1d0a0c] to-[#0e0506]',
    accent: 'text-[#f87171]',
    glow: 'bg-[#ef4444]',
    chip: 'bg-[#f87171]/15 border-[#f87171]/40 text-[#fca5a5]',
    cta: 'bg-[#f87171]/20 border-[#f87171]/50 text-[#fca5a5] hover:bg-[#f87171]/30',
  },
  orange: {
    bg: 'from-[#2e1808] via-[#1e1006] to-[#100803]',
    accent: 'text-[#fb923c]',
    glow: 'bg-[#f97316]',
    chip: 'bg-[#fb923c]/15 border-[#fb923c]/40 text-[#fdba74]',
    cta: 'bg-[#fb923c]/20 border-[#fb923c]/50 text-[#fdba74] hover:bg-[#fb923c]/30',
  },
  pink: {
    bg: 'from-[#2d0f24] via-[#1d0a18] to-[#0e050c]',
    accent: 'text-[#f472b6]',
    glow: 'bg-[#ec4899]',
    chip: 'bg-[#f472b6]/15 border-[#f472b6]/40 text-[#f9a8d4]',
    cta: 'bg-[#f472b6]/20 border-[#f472b6]/50 text-[#f9a8d4] hover:bg-[#f472b6]/30',
  },
  teal: {
    bg: 'from-[#082a2a] via-[#061c1c] to-[#030e0e]',
    accent: 'text-[#2dd4bf]',
    glow: 'bg-[#14b8a6]',
    chip: 'bg-[#2dd4bf]/15 border-[#2dd4bf]/40 text-[#5eead4]',
    cta: 'bg-[#2dd4bf]/20 border-[#2dd4bf]/50 text-[#5eead4] hover:bg-[#2dd4bf]/30',
  },
  amber: {
    bg: 'from-[#2d2008] via-[#1d1506] to-[#100b03]',
    accent: 'text-[#fbbf24]',
    glow: 'bg-[#f59e0b]',
    chip: 'bg-[#fbbf24]/15 border-[#fbbf24]/40 text-[#fcd34d]',
    cta: 'bg-[#fbbf24]/20 border-[#fbbf24]/50 text-[#fcd34d] hover:bg-[#fbbf24]/30',
  },
  sky: {
    bg: 'from-[#0a2135] via-[#061523] to-[#030b12]',
    accent: 'text-[#38bdf8]',
    glow: 'bg-[#0ea5e9]',
    chip: 'bg-[#38bdf8]/15 border-[#38bdf8]/40 text-[#7dd3fc]',
    cta: 'bg-[#38bdf8]/20 border-[#38bdf8]/50 text-[#7dd3fc] hover:bg-[#38bdf8]/30',
  },
  lime: {
    bg: 'from-[#1c2a08] via-[#121c06] to-[#090e03]',
    accent: 'text-[#a3e635]',
    glow: 'bg-[#84cc16]',
    chip: 'bg-[#a3e635]/15 border-[#a3e635]/40 text-[#bef264]',
    cta: 'bg-[#a3e635]/20 border-[#a3e635]/50 text-[#bef264] hover:bg-[#a3e635]/30',
  },
  crimson: {
    bg: 'from-[#2d0a1a] via-[#1d0611] to-[#0e0308]',
    accent: 'text-[#fb7185]',
    glow: 'bg-[#f43f5e]',
    chip: 'bg-[#fb7185]/15 border-[#fb7185]/40 text-[#fda4af]',
    cta: 'bg-[#fb7185]/20 border-[#fb7185]/50 text-[#fda4af] hover:bg-[#fb7185]/30',
  },
  violet: {
    bg: 'from-[#1a0f3a] via-[#110a27] to-[#080515]',
    accent: 'text-[#a78bfa]',
    glow: 'bg-[#8b5cf6]',
    chip: 'bg-[#a78bfa]/15 border-[#a78bfa]/40 text-[#c4b5fd]',
    cta: 'bg-[#a78bfa]/20 border-[#a78bfa]/50 text-[#c4b5fd] hover:bg-[#a78bfa]/30',
  },
  blue: {
    bg: 'from-[#0a1633] via-[#060f23] to-[#030812]',
    accent: 'text-[#60a5fa]',
    glow: 'bg-[#3b82f6]',
    chip: 'bg-[#60a5fa]/15 border-[#60a5fa]/40 text-[#93c5fd]',
    cta: 'bg-[#60a5fa]/20 border-[#60a5fa]/50 text-[#93c5fd] hover:bg-[#60a5fa]/30',
  },
};

function themeOf(key: string): ThemeSpec {
  return THEMES[key] ?? THEMES.gold;
}

function whatsappHref(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length >= 10 ? `https://wa.me/${digits}` : null;
}

/** "11 SEP" → "11" (número gigante translúcido del fondo). */
function dayNumber(dateLabel: string): string {
  return dateLabel.split(' ')[0] ?? dateLabel;
}

export default function WeekendFlyersGrid({ events }: { events: FlyerEvent[] }) {
  const [selected, setSelected] = useState<FlyerEvent | null>(null);

  // Escape cierra el modal + bloquea el scroll de fondo.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [selected]);

  return (
    <>
      <ul
        aria-label="Flyers de los eventos del fin de semana"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        {events.map((ev) => {
          const t = themeOf(ev.theme);
          return (
            <li key={ev.id}>
              <Link
                href={`/local/${ev.business.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  setSelected(ev);
                }}
                aria-label={`${ev.title} en ${ev.business.name}, ${ev.dayLabel} ${ev.dateLabel} ${ev.timeLabel}`}
                className={`group relative block aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b ${t.bg} transition-all duration-200 hover:-translate-y-1 hover:border-white/25 hover:shadow-xl hover:shadow-black/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold`}
              >
                {/* Blob decorativo */}
                <span
                  aria-hidden
                  className={`absolute -top-10 -right-10 h-28 w-28 rounded-full blur-3xl opacity-30 ${t.glow}`}
                />
                {/* Número del día translúcido */}
                <span
                  aria-hidden
                  className="absolute -bottom-5 -left-2 font-serif text-[6.5rem] leading-none text-white/[0.05] select-none"
                >
                  {dayNumber(ev.dateLabel)}
                </span>

                {/* Pill día */}
                <span
                  className={`absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/40 border border-white/10 text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm ${t.accent}`}
                >
                  {ev.dayLabel} · {ev.dateLabel}
                </span>

                {/* Cuerpo */}
                <span className="absolute inset-0 flex flex-col p-3 sm:p-4">
                  <span aria-hidden className="block mt-6 sm:mt-8 text-center text-4xl sm:text-5xl drop-shadow-lg group-hover:scale-110 transition-transform duration-200">
                    {ev.emoji}
                  </span>
                  <span className="mt-3 font-serif text-base sm:text-lg leading-tight text-white text-center line-clamp-2">
                    {ev.title}
                  </span>
                  <span className="mt-1.5 text-[11px] sm:text-xs leading-snug text-white/55 text-center line-clamp-2">
                    {ev.tagline}
                  </span>

                  <span className="mt-auto block">
                    {ev.promoNote && (
                      <span
                        className={`mb-2 inline-flex max-w-full items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold truncate ${t.chip}`}
                      >
                        <Tag size={9} className="shrink-0" />
                        {ev.promoNote}
                      </span>
                    )}
                    <span className="block truncate text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white/90">
                      {ev.business.name}
                    </span>
                    <span className="flex items-center justify-between gap-1 mt-0.5">
                      <span className="truncate text-[10px] text-white/45 flex items-center gap-1">
                        <MapPin size={9} className="shrink-0" />
                        {ev.business.zone ?? 'Los Teques'}
                      </span>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold ${t.accent}`}
                      >
                        <Clock size={10} />
                        {ev.timeLabel}
                      </span>
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* ── Modal de detalle ─────────────────────────────── */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Detalle del evento: ${selected.title}`}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <EventModalCard event={selected} onClose={() => setSelected(null)} />
        </div>
      )}
    </>
  );
}

function EventModalCard({ event, onClose }: { event: FlyerEvent; onClose: () => void }) {
  const t = themeOf(event.theme);
  const wa = whatsappHref(event.business.phone);

  // Sin cierre por backdrop cuando el clic empieza dentro de la card.
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl border border-white/15 bg-gradient-to-b ${t.bg} p-6 shadow-2xl shadow-black/60`}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar detalle del evento"
        className="absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/40 border border-white/15 text-white/70 hover:text-white hover:bg-black/60 transition-colors"
      >
        <X size={16} />
      </button>

      <div className="flex items-center gap-2 mb-4">
        <span
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/40 border border-white/10 text-[10px] font-bold uppercase tracking-widest ${t.accent}`}
        >
          {event.dayLabel} · {event.dateLabel}
        </span>
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/40 border border-white/10 text-[11px] font-semibold text-white/85">
          <Clock size={11} className={t.accent} />
          {event.timeLabel}
        </span>
      </div>

      <p aria-hidden className="text-6xl text-center my-4 drop-shadow-xl">
        {event.emoji}
      </p>

      <h3 className="font-serif text-2xl text-white text-center leading-tight">
        {event.title}
      </h3>
      <p className="mt-2 text-sm text-white/65 text-center">{event.tagline}</p>

      {(event.promoNote || event.priceNote) && (
        <div className="mt-4 space-y-2">
          {event.promoNote && (
            <p
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold text-center ${t.chip}`}
            >
              <Tag size={12} className="shrink-0" />
              {event.promoNote}
            </p>
          )}
          {event.priceNote && (
            <p className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-xs font-semibold text-white/80 text-center">
              <PartyPopper size={12} className={t.accent} />
              {event.priceNote}
            </p>
          )}
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-white/10">
        <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
          El evento es en
        </p>
        <p className="font-serif text-lg text-gold">{event.business.name}</p>
        <p className="text-xs text-white/55 mt-0.5">
          {event.business.address ?? event.business.zone ?? 'Los Teques'}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2">
        <Link
          href={`/local/${event.business.slug}`}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gold text-obsidian text-sm font-bold hover:brightness-110 transition"
        >
          Ver ficha del local
        </Link>
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${t.cta}`}
          >
            <Phone size={14} />
            Contactar por WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
