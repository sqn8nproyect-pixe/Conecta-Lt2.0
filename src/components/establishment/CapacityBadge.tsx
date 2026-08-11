'use client';

import type { CapacityLevel } from '@/lib/types';

// ─── Etapa 3.6 — CapacityBadge ───────────────────────────────
// Reusable pill that shows a venue's current capacity (aforo en
// tiempo real) as a pulsing dot + label.
//
// Three variants:
//   - QUIET     → emerald  ("Tranquilo"  — plenty of space)
//   - MODERATE  → amber    ("Moderado"  — filling up)
//   - FULL      → rose     ("Lleno"     — at capacity)
//
// Sizes:
//   - sm: tiny pill for grid cards (10px text, 1.5px dot)
//   - md: header badge (12px text, 2px dot)
//   - lg: prominent header badge (14px text, 2.5px dot)
//
// The pulsing dot uses the Tailwind `animate-ping` keyframe so the
// badge reads as a "live" signal (mirrors Google Maps' "Busier than
// usual" treatment).
//
// Returns `null` when `capacity` is null/undefined so callers can
// render the badge unconditionally (`{est.currentCapacity && <CapacityBadge ... />}`).

interface CapacityBadgeProps {
  capacity: CapacityLevel | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const CONFIG: Record<
  CapacityLevel,
  {
    label: string;
    color: string;
    pulseColor: string;
    bg: string;
    border: string;
  }
> = {
  QUIET: {
    label: 'Tranquilo',
    color: 'text-emerald-300',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-400/40',
    pulseColor: 'bg-emerald-400',
  },
  MODERATE: {
    label: 'Moderado',
    color: 'text-amber-300',
    bg: 'bg-amber-500/15',
    border: 'border-amber-400/40',
    pulseColor: 'bg-amber-400',
  },
  FULL: {
    label: 'Lleno',
    color: 'text-rose-300',
    bg: 'bg-rose-500/15',
    border: 'border-rose-400/40',
    pulseColor: 'bg-rose-400',
  },
};

export function CapacityBadge({
  capacity,
  size = 'md',
  showLabel = true,
}: CapacityBadgeProps) {
  if (!capacity) return null;
  const c = CONFIG[capacity];
  const sizes =
    size === 'sm'
      ? { wrap: 'px-2 py-0.5 text-[10px] gap-1', dot: 'w-1.5 h-1.5' }
      : size === 'lg'
        ? { wrap: 'px-4 py-2 text-sm gap-2', dot: 'w-2.5 h-2.5' }
        : { wrap: 'px-3 py-1 text-xs gap-1.5', dot: 'w-2 h-2' };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${c.bg} ${c.color} ${c.border} font-semibold ${sizes.wrap} backdrop-blur-md`}
      title={`Aforo: ${c.label}`}
    >
      <span className={`relative inline-flex ${sizes.dot}`}>
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full ${c.pulseColor} opacity-60`}
        />
        <span
          className={`relative inline-flex ${sizes.dot} rounded-full ${c.pulseColor}`}
        />
      </span>
      {showLabel && <span>{c.label}</span>}
    </span>
  );
}

export default CapacityBadge;
