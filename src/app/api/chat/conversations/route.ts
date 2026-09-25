// GET  /api/chat/conversations — bandeja: mis conversaciones + no leídos
// POST /api/chat/conversations — abrir (o encontrar) conversación DIRECT
// Body: { userId: string } (el otro usuario)

import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth';
import { chatService } from '@/server/services/chat.service';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';

export async function GET() {
  try {
    const user = await requireUser();
    const conversations = await chatService.listConversations(user.id);
    return NextResponse.json(conversations);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('GET /api/chat/conversations error:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    const rl = rateLimit(`chat-open:${user.id}`, 10);
    if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

    const body = (await request.json().catch(() => ({}))) as { userId?: string };
    const otherUserId = body.userId?.trim();
    if (!otherUserId) {
      return NextResponse.json({ error: 'Falta userId' }, { status: 400 });
    }

    const conversation = await chatService.openDirectConversation(user.id, otherUserId);
    return NextResponse.json(conversation);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('POST /api/chat/conversations error:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
