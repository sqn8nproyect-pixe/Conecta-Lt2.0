// ─────────────────────────────────────────────────────────────
// CONECTA-LT — GET /api/businesses/[slug]/menu (público)
//
// Devuelve la carta de un local SOLO si el dueño activó el switch
// "Menú visible" (Business.menuVisible). Si está oculto responde
// { visible: false, sections: [] } — la ficha ni siquiera muestra
// el botón "Ver Menú" (menuVisible viaja en el payload público del
// negocio, ver transformBusiness).
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getBusinessMenu } from '@/server/services/menu.service';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const business = await db.business.findUnique({
      where: { slug },
      select: { id: true, status: true, menuVisible: true },
    });

    // Local inexistente, no publicado o menú oculto → sin carta.
    if (!business || business.status !== 'ACTIVE' || !business.menuVisible) {
      return NextResponse.json({ visible: false, sections: [] });
    }

    const sections = await getBusinessMenu(business.id);
    return NextResponse.json({ visible: true, sections });
  } catch (e) {
    console.error('GET /api/businesses/[slug]/menu error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
