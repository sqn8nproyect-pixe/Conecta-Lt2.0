// POST /api/chat/conversations/[id]/read — marcar como leída (lastReadAt = ahora)

import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth';
import { chatService } from '@/server/services/chat.service';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await chatService.markRead(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('POST /api/chat/conversations/[id]/read error:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
