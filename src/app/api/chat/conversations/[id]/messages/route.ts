// GET  /api/chat/conversations/[id]/messages — página de mensajes
//      Query: ?before=<ISO> (cursor hacia atrás)
// POST /api/chat/conversations/[id]/messages — enviar mensaje
//      Body: { kind: 'TEXT'|'VOICE'|'IMAGE', text?, mediaUrl?, mediaKey?, durationMs? }

import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth';
import { chatService, type ChatMessageKind } from '@/server/services/chat.service';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const before = new URL(request.url).searchParams.get('before') ?? undefined;

    const result = await chatService.getMessages(user.id, id, before);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('GET /api/chat/conversations/[id]/messages error:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    // Anti-spam: 20 mensajes por minuto por usuario (plan, cap. 8).
    const rl = rateLimit(`chat-msg:${user.id}`, 20);
    if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

    const body = (await request.json().catch(() => ({}))) as {
      kind?: string;
      text?: string;
      mediaUrl?: string;
      mediaKey?: string;
      durationMs?: number;
    };
    const kind = body.kind ?? 'TEXT';

    const message = await chatService.sendMessage(user.id, id, {
      kind: kind as ChatMessageKind,
      text: body.text,
      mediaUrl: body.mediaUrl,
      mediaKey: body.mediaKey,
      durationMs: body.durationMs,
    });
    return NextResponse.json(message, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('POST /api/chat/conversations/[id]/messages error:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
