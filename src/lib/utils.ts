import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format an ISO date string as a Spanish (es-VE) relative-time label.
 *
 * Used by the notifications dropdown to show "hace 5 min", "ayer", etc.
 * The cutoffs are:
 *   < 1 min   → "ahora mismo"
 *   < 60 min  → "hace N min"
 *   < 24 h    → "hace N h"
 *   1 day     → "ayer"
 *   < 7 days  → "hace N días"
 *   else      → "5 dic" (short numeric date, es-VE locale)
 *
 * Mirrors the brief in Etapa 7.A — kept in utils.ts so any future
 * caller (e.g. a "recent reservations" widget) can reuse it.
 */
export function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'ahora mismo';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'ayer';
  if (diffD < 7) return `hace ${diffD} días`;
  return new Date(iso).toLocaleDateString('es-VE', {
    day: 'numeric',
    month: 'short',
  });
}
