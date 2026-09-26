// DELETE /api/chat/conversations/[id] — "Eliminar conversación" (v2,
// eliminación TOTAL): cualquier participante la borra PARA TODOS con
// purga definitiva de los mensajes (la plataforma no conserva nada de
// ella). ADMIN/MODERATOR puede además eliminar conversaciones ajenas
// (moderación). En vivo: convo:deleted a los canales personales.

import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/server/auth';
import { chatService } from '@/server/services/chat.service';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUserWithRole();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const { id } = await params;

    // Eliminar una conversación entera es una acción poco frecuente.
    const rl = rateLimit(`chat-del-conv:${user.id}`, 20);
    if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

    const result = await chatService.deleteConversation(user, id);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('DELETE /api/chat/conversations/[id] error:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
