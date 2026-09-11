// ─────────────────────────────────────────────────────────────
// CONECTA-LT — event-labels (Sprint 8.9)
//
// Helpers de tiempo/etiquetas de los flyers (BusinessEvent) en
// wall clock America/Caracas (UTC-4 fijo, sin DST desde 2016).
//
// Convención heredada del Sprint 8.7: la portada muestra
// dayLabel/dateLabel/timeLabel PRE-RENDERIZADOS (nunca Intl en
// runtime) y weekOf agrupa la semana. Estos helpers son la única
// fuente de verdad para DERIVAR esos campos en los formularios
// (admin EventsTab + panel del dueño EventsOwnerTab), así ambos
// producen exactamente los mismos strings.
// ─────────────────────────────────────────────────────────────

export const MONTHS_ES = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC',
] as const;

// indexado por getUTCDay() (0 = domingo)
export const DAYS_ES = [
  'DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO',
] as const;

/** ISO instant → wall clock Caracas { date: 'YYYY-MM-DD', time: 'HH:MM' }. */
export function caracasParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const shifted = new Date(d.getTime() - 4 * 60 * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  const hh = String(shifted.getUTCHours()).padStart(2, '0');
  const mm = String(shifted.getUTCMinutes()).padStart(2, '0');
  return { date: `${y}-${m}-${day}`, time: `${hh}:${mm}` };
}

export type Derived = { dayLabel: string; dateLabel: string; weekOf: string };

/** 'YYYY-MM-DD' → labels en español + weekOf (sábado de la semana ISO). */
export function deriveFrom(dateStr: string): Derived | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const utcMs = Date.UTC(y, m - 1, d);
  const weekday = new Date(utcMs).getUTCDay(); // 0=domingo … 6=sábado
  const isoWeekday = weekday === 0 ? 7 : weekday; // 1=lunes … 7=domingo
  const sat = new Date(utcMs + (6 - isoWeekday) * 86_400_000);
  const satStr = `${sat.getUTCFullYear()}-${String(
    sat.getUTCMonth() + 1,
  ).padStart(2, '0')}-${String(sat.getUTCDate()).padStart(2, '0')}`;
  return {
    dayLabel: DAYS_ES[weekday] ?? '',
    dateLabel: `${d} ${MONTHS_ES[m - 1] ?? ''}`,
    weekOf: satStr,
  };
}

/** 'HH:MM' 24h → '10:00 PM' (formato usado por los flyers). */
export function toTimeLabel(time: string): string {
  const [hh, mm] = time.split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return time;
  const period = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${period}`;
}

/** 'YYYY-MM-DD' (weekOf) → '12 SEP 2026' para los headers de semana. */
export function weekHeader(weekOf: string): string {
  const [y, m, d] = weekOf.split('-').map(Number);
  return `${d} ${MONTHS_ES[m - 1] ?? ''} ${y}`;
}
