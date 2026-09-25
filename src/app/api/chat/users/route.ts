// GET /api/chat/users?q=<búsqueda> — búsqueda ligera de usuarios para "Nuevo chat"
// Mínimo 2 caracteres. Excluye a mí mismo y bloqueos en cualquier dirección.

import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth';
import { chatService } from '@/server/services/chat.service';

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const q = new URL(request.url).searchParams.get('q') ?? '';
    const users = await chatService.searchUsers(user.id, q);
    return NextResponse.json(users);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('GET /api/chat/users error:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
