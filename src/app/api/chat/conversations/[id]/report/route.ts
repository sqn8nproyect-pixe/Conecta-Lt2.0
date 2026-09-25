// POST /api/chat/conversations/[id]/report — reportar conversación o mensaje
// Body: { reason: 'SPAM'|'ACOSO'|'CONTENIDO_INAPROPIADO'|'ESTAFA'|'OTRO', details?, messageId? }

import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth';
import { chatService } from '@/server/services/chat.service';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const rl = rateLimit(`chat-report:${user.id}`, 10);
    if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

    const body = (await request.json().catch(() => ({}))) as {
      reason?: string;
      details?: string;
      messageId?: string;
    };
    if (!body.reason) {
      return NextResponse.json({ error: 'Falta el motivo del reporte' }, { status: 400 });
    }

    await chatService.reportConversation(user.id, id, {
      reason: body.reason,
      details: body.details,
      messageId: body.messageId,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('POST /api/chat/conversations/[id]/report error:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
