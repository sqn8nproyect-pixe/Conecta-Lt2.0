// ─────────────────────────────────────────────────────────────
// CONECTA-LT — GET /api/reservations/lookup/[code]
//
// Busca una reserva por su código de confirmación (LT-XXXX-X).
// Usado por:
//   - El panel del dueño (buscador para validar la llegada del cliente)
//   - La página pública /r/[code] (cuando alguien escanea el QR)
//
// Devuelve info mínima de la reserva + business + customer (sin
// exponer datos sensibles del usuario como email/phone a menos que
// el caller esté autenticado como BUSINESS_OWNER o ADMIN).
//
// Auth:
//   - Sin auth: devuelve solo info pública (código, business name,
//     fecha, hora, guests, status). NO devuelve datos del cliente.
//   - BUSINESS_OWNER o ADMIN: devuelve datos del cliente (name, phone)
//     siempre que la reserva pertenezca a un negocio que el caller
//     gestione (para dueños) o a cualquiera (para admins).
//
// Respuesta:
//   200 → { reservation: {...} }
//   404 → { error: "Reserva no encontrada" } (no revela si existe o no)
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import {
  assertBusinessOwnership,
} from '@/server/services/business.service';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code: rawCode } = await params;
    const code = decodeURIComponent(rawCode).trim().toUpperCase();

    if (!code || !code.startsWith('LT-')) {
      return NextResponse.json(
        { error: 'Código inválido' },
        { status: 400 },
      );
    }

    // Buscar la reserva por confirmationCode
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
        businessId: true,
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
            coverImage: true,
          },
        },
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 },
      );
    }

    // Intentar autenticar al caller. Si no está logueado, devolver
    // solo info pública. Si está logueado como dueño/admin, verificar
    // ownership y devolver datos del cliente.
    let caller: { id: string; role: UserRole } | null = null;
    try {
      caller = await requireRole(
        'BUSINESS_OWNER' as UserRole,
        'ADMIN' as UserRole,
      );
    } catch {
      caller = null;
    }

    // Usuario no autenticado → info pública solamente
    if (!caller) {
      return NextResponse.json({
        reservation: {
          confirmationCode: reservation.confirmationCode,
          status: reservation.status,
          date: reservation.date,
          time: reservation.time,
          guests: reservation.guests,
          business: {
            name: reservation.business.name,
            address: reservation.business.address,
            coverImage: reservation.business.coverImage,
          },
        },
        authenticated: false,
      });
    }

    // Dueño/admin autenticado → verificar ownership (excepto admin
    // que puede ver cualquier reserva)
    if (caller.role !== 'ADMIN') {
      try {
        await assertBusinessOwnership(caller.id, reservation.business.slug);
      } catch {
        // El caller es dueño pero no de este negocio → devolver info
        // pública solamente (no revelar datos del cliente)
        return NextResponse.json({
          reservation: {
            confirmationCode: reservation.confirmationCode,
            status: reservation.status,
            date: reservation.date,
            time: reservation.time,
            guests: reservation.guests,
            business: {
              name: reservation.business.name,
              address: reservation.business.address,
              coverImage: reservation.business.coverImage,
            },
          },
          authenticated: true,
          hasOwnership: false,
        });
      }
    }

    // Dueño del negocio o admin → devolver info completa
    return NextResponse.json({
      reservation: {
        id: reservation.id,
        confirmationCode: reservation.confirmationCode,
        status: reservation.status,
        date: reservation.date,
        time: reservation.time,
        guests: reservation.guests,
        notes: reservation.notes,
        rejectionReason: reservation.rejectionReason,
        name: reservation.name,
        phone: reservation.phone,
        email: reservation.email,
        business: {
          id: reservation.business.id,
          name: reservation.business.name,
          slug: reservation.business.slug,
          address: reservation.business.address,
          coverImage: reservation.business.coverImage,
        },
      },
      authenticated: true,
      hasOwnership: true,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('GET /api/reservations/lookup/[code] error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
