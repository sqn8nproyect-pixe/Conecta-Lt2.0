// ─────────────────────────────────────────────────────────────
// CONECTA-LT — Temas de los flyers de eventos (Sprint 8.6)
//
// Lista compartida de los 12 temas de color disponibles para un
// BusinessEvent. La fuente visual (clases Tailwind literales por
// tema) vive en WeekendFlyersGrid.tsx THEMES — este módulo es la
// fuente de verdad de las CLAVES válidas, para que la validación
// del servidor (API admin) y el selector del panel admin usen
// exactamente las mismas que entiende el render del flyer.
//
// OJO: si agregas un tema aquí, DEBES agregar su ThemeSpec con
// clases literales en WeekendFlyersGrid.THEMES (Tailwind v4 no
// compone clases dinámicas) o el flyer caerá al fallback gold.
// ─────────────────────────────────────────────────────────────

export const EVENT_THEMES: { key: string; label: string }[] = [
  { key: 'gold', label: 'Dorado (marca)' },
  { key: 'purple', label: 'Púrpura' },
  { key: 'red', label: 'Rojo' },
  { key: 'orange', label: 'Naranja' },
  { key: 'pink', label: 'Rosa' },
  { key: 'teal', label: 'Turquesa' },
  { key: 'amber', label: 'Ámbar' },
  { key: 'sky', label: 'Celeste' },
  { key: 'lime', label: 'Lima' },
  { key: 'crimson', label: 'Carmesí' },
  { key: 'violet', label: 'Violeta' },
  { key: 'blue', label: 'Azul' },
];

export const EVENT_THEME_KEYS: readonly string[] = EVENT_THEMES.map(
  (t) => t.key,
);

/** Color de punto/chip por tema (hex, para estilos inline). */
export const EVENT_THEME_HEX: Record<string, string> = {
  gold: '#d4af37',
  purple: '#a855f7',
  red: '#ef4444',
  orange: '#f97316',
  pink: '#ec4899',
  teal: '#14b8a6',
  amber: '#f59e0b',
  sky: '#0ea5e9',
  lime: '#84cc16',
  crimson: '#dc2626',
  violet: '#8b5cf6',
  blue: '#3b82f6',
};
