// GET    /api/chat/block — lista de usuarios bloqueados por mí
// POST   /api/chat/block — bloquear. Body: { userId }
// DELETE /api/chat/block — desbloquear. Body: { userId }

import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth';
import { chatService } from '@/server/services/chat.service';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';

export async function GET() {
  try {
    const user = await requireUser();
    const blocked = await chatService.listBlocked(user.id);
    return NextResponse.json(blocked);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('GET /api/chat/block error:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const rl = rateLimit(`chat-block:${user.id}`, 10);
    if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

    const body = (await request.json().catch(() => ({}))) as { userId?: string };
    if (!body.userId) {
      return NextResponse.json({ error: 'Falta userId' }, { status: 400 });
    }
    await chatService.blockUser(user.id, body.userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('POST /api/chat/block error:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const rl = rateLimit(`chat-block:${user.id}`, 10);
    if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

    const body = (await request.json().catch(() => ({}))) as { userId?: string };
    if (!body.userId) {
      return NextResponse.json({ error: 'Falta userId' }, { status: 400 });
    }
    await chatService.unblockUser(user.id, body.userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('DELETE /api/chat/block error:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
