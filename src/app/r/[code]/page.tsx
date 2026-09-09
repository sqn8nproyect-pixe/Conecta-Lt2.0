// ─────────────────────────────────────────────────────────────
// CONECTA-LT — Página pública /r/[code]
//
// Landing pública de una reserva. Se accede escaneando el QR del
// cliente o visitando directamente /r/LT-XXXX-X.
//
// Muestra información PÚBLICA de la reserva (no expone datos del
// cliente a menos que el visitante esté autenticado como dueño del
// negocio o admin). El dueño puede ver datos completos + botón
// "Confirmar llegada".
//
// Esta página es server-rendered (no 'use client') para que sea
// indexable y rápida. El componente cliente PublicReservationCard
// maneja la interactividad (botón confirmar llegada).
// ─────────────────────────────────────────────────────────────

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { PublicReservationCard } from '@/components/conecta/PublicReservationCard';

// ── generateMetadata: título dinámico para SEO + sharing ──────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code: rawCode } = await params;
  const code = decodeURIComponent(rawCode).trim().toUpperCase();

  if (!code.startsWith('LT-')) {
    return { title: 'Reserva no encontrada' };
  }

  const reservation = await db.reservation.findUnique({
    where: { confirmationCode: code },
    select: {
      confirmationCode: true,
      status: true,
      business: { select: { name: true } },
    },
  });

  if (!reservation) {
    return { title: 'Reserva no encontrada' };
  }

  return {
    title: `Reserva ${reservation.confirmationCode} — ${reservation.business.name}`,
    description: `Estado de tu reserva en ${reservation.business.name}: ${reservation.status}.`,
    robots: { index: false, follow: false }, // no indexar páginas de reservas
  };
}

// ── Página server-side ────────────────────────────────────────
export default async function ReservationPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = decodeURIComponent(rawCode).trim().toUpperCase();

  // Validación básica de formato
  if (!code || !code.startsWith('LT-')) {
    notFound();
  }

  // Buscar la reserva (server-side, sin auth — devuelve info pública)
  const reservation = await db.reservation.findUnique({
    where: { confirmationCode: code },
    select: {
      id: true,
      confirmationCode: true,
      status: true,
      date: true,
      time: true,
      guests: true,
      notes: true,
      name: true,
      phone: true,
      email: true,
      rejectionReason: true,
      business: {
        select: {
          id: true,
          name: true,
          slug: true,
          address: true,
          coverImage: true,
          phone: true,
        },
      },
    },
  });

  if (!reservation) {
    // Página de "no encontrada" en lugar de 404 hard
    return (
      <main className="min-h-screen bg-obsidian text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full glass-card rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-300">
              <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl text-gold mb-2">Reserva no encontrada</h1>
          <p className="text-white/60 text-sm mb-6">
            El código <span className="font-mono text-white">{code}</span> no corresponde a ninguna reserva activa.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gold text-obsidian font-semibold hover:bg-gold/90 transition-all"
          >
            Ir a CONECTA-LT
          </a>
        </div>
      </main>
    );
  }

  // Pasar la data al componente cliente que maneja auth + botones
  return (
    <main className="min-h-screen bg-obsidian text-white">
      <PublicReservationCard reservation={reservation} />
    </main>
  );
}
