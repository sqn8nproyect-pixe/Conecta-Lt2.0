// DELETE /api/chat/conversations/[id] — "Eliminar conversación".
// Participante: la oculta SOLO de su bandeja (scope 'self'; reaparece
// si le escriben de nuevo). MODERATOR/ADMIN: scope 'everyone' la
// oculta para todos (moderación, con aviso en vivo).

import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/server/auth';
import { chatService } from '@/server/services/chat.service';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUserWithRole();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const { id } = await params;

    // Eliminar conversación es aún más raro que borrar un mensaje.
    const rl = rateLimit(`chat-del-conv:${user.id}`, 20);
    if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

    const body = (await request.json().catch(() => ({}))) as { scope?: string };
    const scope = body.scope === 'everyone' ? 'everyone' : 'self';

    const result = await chatService.deleteConversation(user, id, scope);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('DELETE /api/chat/conversations/[id] error:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
