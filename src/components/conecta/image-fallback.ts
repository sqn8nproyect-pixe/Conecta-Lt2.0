'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Fallback de imágenes
//   Si una imagen falla al cargar (ej: objeto R2 eliminado o
//   proxy no disponible), se sustituye por el placeholder de la
//   categoría del negocio para que nunca se vea una imagen rota.
// ─────────────────────────────────────────────────────────────

import type React from 'react';

/** Placeholder por categoría (imágenes locales de /public). */
const PLACEHOLDERS: Record<string, string> = {
  licorería: '/images/licoreria.png',
  tasca: '/images/tasca.png',
  discoteca: '/images/discoteca.png',
};

/** Placeholder genérico si la categoría no tiene uno propio. */
const GENERIC_PLACEHOLDER = '/images/hero.png';

/**
 * Handler `onError` para <img> que sustituye la imagen rota por
 * el placeholder de la categoría (o el genérico). Protegido
 * contra bucles infinitos si el propio placeholder fallara.
 */
export function imageFallback(
  category?: string,
): (e: React.SyntheticEvent<HTMLImageElement>) => void {
  return (e) => {
    const img = e.currentTarget;
    if (img.dataset.fellBack === '1') return; // el placeholder también falló → no repetir
    img.dataset.fellBack = '1';
    img.src = PLACEHOLDERS[category ?? ''] ?? GENERIC_PLACEHOLDER;
  };
}
