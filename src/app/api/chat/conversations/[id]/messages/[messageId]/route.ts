// DELETE /api/chat/conversations/[id]/messages/[messageId]
// Soft-delete de un mensaje: el AUTOR puede eliminar el suyo;
// MODERATOR/ADMIN pueden eliminar cualquiera (moderación).
// Devuelve el DTO redactado (tumba) para actualizar el cache del cliente.

import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/server/auth';
import { chatService } from '@/server/services/chat.service';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  try {
    const user = await getCurrentUserWithRole();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const { id, messageId } = await params;

    // Los borrados son raros; tope generoso anti-abuso.
    const rl = rateLimit(`chat-del:${user.id}`, 30);
    if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

    const message = await chatService.deleteMessage(user, id, messageId);
    return NextResponse.json(message);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('DELETE /api/chat/conversations/[id]/messages/[messageId] error:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
