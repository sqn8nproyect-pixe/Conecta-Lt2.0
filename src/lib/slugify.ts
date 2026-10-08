// ─────────────────────────────────────────────────────────────
// CONECTA-LT — slugify compartido
//
// Genera el slug URL-friendly de un nombre de local ("Africa
// Burguers" → "africa-burguers"). Mismo comportamiento que el
// slugify histórico de prisma/seed.ts (fuente de los slugs
// actuales), extraído aquí para que el renombre automático de
// updateBusinessInfo y el seed coincidan siempre.
// ─────────────────────────────────────────────────────────────

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
