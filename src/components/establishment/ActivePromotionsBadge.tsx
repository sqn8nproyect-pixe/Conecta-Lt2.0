'use client';

import { Flame } from 'lucide-react';
import type { ActivePromotion } from '@/lib/types';

interface ActivePromotionsBadgeProps {
  promotion: ActivePromotion;
  /** Set true to render the small corner version (used on home cards). */
  variant?: 'card' | 'inline';
}

/**
 * Pulsing "PROMO ACTIVA" badge. Two variants:
 *
 * - `card` (default): tiny pill in the top-right corner of a home card.
 *   Uses the .conecta-promo-badge keyframe for a pulsing glow.
 *
 * - `inline`: slightly larger, used inside the detail page header.
 *
 * Both render the promo label and a "valid until" hint.
 */
export function ActivePromotionsBadge({
  promotion,
  variant = 'card',
}: ActivePromotionsBadgeProps) {
  if (variant === 'card') {
    return (
      <span
        className="conecta-promo-badge absolute top-4 right-16 sm:right-16 z-10 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber text-obsidian text-[9px] font-black tracking-wider uppercase border border-amber/50"
        title={`Promo activa: ${promotion.label} · válida hasta el ${formatDate(promotion.validUntil)}`}
      >
        <Flame size={11} className="shrink-0" />
        Promo
      </span>
    );
  }

  // Inline variant (detail page)
  return (
    <span className="conecta-promo-badge inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber/20 border border-amber/50 text-amber text-[10px] font-black tracking-wider uppercase">
      <Flame size={12} className="shrink-0" />
      Promo Activa · {promotion.label}
    </span>
  );
}

/** Format an ISO date (YYYY-MM-DD) into "31 Ago" style Spanish short form. */
export function formatDate(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('es-VE', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return iso;
  }
}

/** Compute days remaining until `iso` from "now" (clamped at 0). */
export function daysUntil(iso: string): number {
  const target = new Date(iso + 'T23:59:59').getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
}

export default ActivePromotionsBadge;
