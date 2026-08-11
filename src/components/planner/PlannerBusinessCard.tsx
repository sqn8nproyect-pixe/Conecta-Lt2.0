'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — PlannerBusinessCard
//
// One recommendation in the planner results. Renders:
//   - Rank medal (🥇/🥈/🥉 for the top 3)
//   - Score ring (0–100 with circular progress)
//   - Availability badge (4 states with colors)
//   - Distance chip (formatted km)
//   - Active promotion chip (if any)
//   - Business name + category + rating
//   - Reasons list (max 5 — already ordered by the service)
//   - CTA row: Ver detalle + Añadir a favoritos
//
// The card itself is NOT clickable end-to-end — only the
// "VER DETALLE" button navigates. This avoids accidental
// navigation when the user taps a reason or the favorite
// button (the planner modal stays open until the user
// explicitly chooses a venue).
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import {
  Star,
  MapPin,
  ChevronRight,
  Heart,
  Tag,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useFavoriteActions } from '@/lib/hooks/use-favorite-actions';
import { useAnalytics } from '@/lib/hooks/use-analytics';
import { formatDistance } from '@/server/planner/planner.distance';
import type {
  PlannerAvailability,
  PlannerRecommendation,
} from '@/server/planner/types';

// ─── Rank medals (top 3 only) ────────────────────────────────
const RANK_MEDALS: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

// ─── Availability visual config ──────────────────────────────
//
// 4-state enum from blueprint FASE 10. Each state maps to a
// color + icon + label. NEVER claim "AVAILABLE" unless proven
// — the service already enforces this, the UI just visualizes.
const AVAILABILITY_CONFIG: Record<
  PlannerAvailability,
  { label: string; icon: LucideIcon; classes: string }
> = {
  AVAILABLE: {
    label: 'Disponible',
    icon: CheckCircle2,
    classes: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  LIKELY_AVAILABLE: {
    label: 'Probablemente disponible',
    icon: CheckCircle2,
    classes: 'bg-lime-500/15 text-lime-300 border-lime-500/30',
  },
  CHECK_REQUIRED: {
    label: 'Confirmar aforo',
    icon: AlertCircle,
    classes: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  UNAVAILABLE: {
    label: 'Sin disponibilidad',
    icon: XCircle,
    classes: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
};

// ─── Score ring (circular progress, 0–100) ──────────────────
//
// Inline SVG. The ring has two layers: a muted track and a
// gold arc that fills clockwise from 12 o'clock. The score
// number sits in the middle. Color shifts at thresholds:
//   < 50  → muted white (poor match — but the planner already
//           filters out very poor matches, so this is rare)
//   50–74 → gold (decent match)
//   75+   → bright gold with glow (great match)

interface ScoreRingProps {
  score: number; // 0–100
  size?: number; // px
}

function ScoreRing({ score, size = 56 }: ScoreRingProps) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  // Clamp 0..100 just in case the service ships something out of range.
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;
  const isGreat = clamped >= 75;
  const isDecent = clamped >= 50;

  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isGreat ? '#d4af37' : isDecent ? '#d4af37' : 'rgba(255,255,255,0.4)'}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={isGreat ? 'drop-shadow-[0_0_4px_rgba(212,175,55,0.6)]' : ''}
          style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={[
            'font-mono font-bold tabular-nums leading-none',
            isGreat ? 'text-gold text-base' : 'text-white text-sm',
          ].join(' ')}
        >
          {Math.round(clamped)}
        </span>
        <span className="text-[8px] text-white/40 leading-none mt-0.5">%</span>
      </div>
    </div>
  );
}

// ─── Main card ───────────────────────────────────────────────

interface PlannerBusinessCardProps {
  recommendation: PlannerRecommendation;
  /** 1-indexed position in the sorted results (1, 2, 3). */
  rank: number;
  /** Called when the user clicks "VER DETALLE" — the parent
   *  closes the planner modal and navigates to the detail page. */
  onView: (slug: string) => void;
  /** Stagger index for the entrance animation (0, 1, 2). */
  index?: number;
}

export function PlannerBusinessCard({
  recommendation,
  rank,
  onView,
  index = 0,
}: PlannerBusinessCardProps) {
  const { business, score, reasons, distanceKm, availability, activePromotion } =
    recommendation;

  const favorites = useAppStore((s) => s.favorites);
  const { toggle: toggleFavorite } = useFavoriteActions();
  const { track } = useAnalytics();
  const isFav = favorites.includes(business.slug);

  const avail = AVAILABILITY_CONFIG[availability];
  const AvailIcon = avail.icon;
  const medal = RANK_MEDALS[rank];

  const handleView = () => {
    track('PLANNER_RECOMMENDATION_SELECTED', {
      businessSlug: business.slug,
      metadata: { rank, score, availability },
    });
    onView(business.slug);
  };

  const handleFav = () => {
    toggleFavorite(business.slug, business.name);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      className={[
        'relative rounded-2xl border p-4 sm:p-5 transition-colors',
        rank === 1
          ? 'bg-gold/[0.06] border-gold/40'
          : 'bg-white/5 border-white/10',
      ].join(' ')}
    >
      {/* Top row: rank medal + score ring + availability badge */}
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex-shrink-0 flex flex-col items-center gap-1">
          <span className="text-2xl leading-none" aria-hidden="true">
            {medal}
          </span>
          <span className="text-[9px] font-mono text-white/40 tracking-widest">
            #{rank}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-serif text-base sm:text-lg font-bold text-white truncate">
                {business.name}
              </h4>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-white/60">
                <span className="uppercase tracking-wider">{business.category}</span>
                <span className="text-white/20">•</span>
                <span className="inline-flex items-center gap-0.5">
                  <Star size={11} fill="#d4af37" className="text-gold" />
                  <span className="font-mono font-bold text-white">
                    {business.avgRating.toFixed(1)}
                  </span>
                  <span className="text-white/40">
                    ({business.reviewCount})
                  </span>
                </span>
              </div>
            </div>

            <ScoreRing score={score} />
          </div>

          {/* Availability + distance + promo chips */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-semibold ${avail.classes}`}
            >
              <AvailIcon size={11} />
              {avail.label}
            </span>

            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/70 font-mono">
              <MapPin size={11} className="text-white/50" />
              {formatDistance(distanceKm)}
            </span>

            {business.scheduleLabel && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/70 font-mono">
                <Clock size={11} className="text-white/50" />
                {business.scheduleLabel}
              </span>
            )}

            {activePromotion && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gold/15 border border-gold/40 text-[10px] text-gold font-bold">
                <Tag size={11} />
                {activePromotion.discount ?? activePromotion.title}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Reasons list */}
      {reasons.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {reasons.slice(0, 5).map((reason, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-xs text-white/75"
            >
              <span
                aria-hidden="true"
                className="mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center text-gold"
              >
                •
              </span>
              <span className="leading-relaxed">{reason}</span>
            </li>
          ))}
        </ul>
      )}

      {/* CTA row */}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={handleView}
          className="flex-1 h-11 rounded-xl bg-gold text-obsidian font-bold text-xs tracking-wider hover:bg-[#e5bf4a] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
        >
          VER DETALLE
          <ChevronRight size={14} />
        </button>
        <button
          type="button"
          onClick={handleFav}
          aria-label={isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          aria-pressed={isFav}
          className={[
            'h-11 w-11 rounded-xl border transition-all flex items-center justify-center',
            isFav
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
              : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white',
          ].join(' ')}
        >
          <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
        </button>
      </div>
    </motion.div>
  );
}

// Re-export for callers that need the loading skeleton shape.
export function PlannerBusinessCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded bg-white/10" />
          <div className="h-3 w-1/3 rounded bg-white/10" />
          <div className="flex gap-2 mt-3">
            <div className="h-5 w-24 rounded-full bg-white/10" />
            <div className="h-5 w-16 rounded-full bg-white/10" />
          </div>
        </div>
        <div className="h-14 w-14 rounded-full bg-white/10" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full rounded bg-white/10" />
        <div className="h-3 w-4/5 rounded bg-white/10" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="flex-1 h-11 rounded-xl bg-white/10" />
        <div className="h-11 w-11 rounded-xl bg-white/10" />
      </div>
    </div>
  );
}
