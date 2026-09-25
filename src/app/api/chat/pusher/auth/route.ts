// POST /api/chat/pusher/auth — autorización de canales privados de Pusher.
//
// Solo activo cuando PUSHER_* está configurado (si no, 503 y el
// cliente ni intenta suscribirse — ver src/lib/chat-realtime.ts).
//
// Canales permitidos:
//   - private-user-{miId}       → siempre y cuando sea mi propio id.
//   - private-convo-{id}        → solo si soy participante de esa conversación.

import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth';
import { isChatRealtimeEnabled } from '@/server/chat/pusher-server';
import { db } from '@/lib/db';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';
import Pusher from 'pusher';

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    const rl = rateLimit(`chat-auth:${user.id}`, 60);
    if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

    if (!isChatRealtimeEnabled()) {
      return NextResponse.json(
        { error: 'Realtime no configurado (modo polling activo)' },
        { status: 503 },
      );
    }

    const body = (await request.formData().catch(() => null)) as FormData | null;
    const socketId = body?.get('socket_id');
    const channel = body?.get('channel_name');
    if (typeof socketId !== 'string' || typeof channel !== 'string') {
      return NextResponse.json({ error: 'Payload de autorización inválido' }, { status: 400 });
    }

    if (channel === `private-user-${user.id}`) {
      // Canal personal propio: OK.
    } else if (channel.startsWith('private-convo-')) {
      const conversationId = channel.slice('private-convo-'.length);
      const membership = await db.participant.findUnique({
        where: { conversationId_userId: { conversationId, userId: user.id } },
        select: { id: true },
      });
      if (!membership) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Canal no permitido' }, { status: 403 });
    }

    const pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID as string,
      key: process.env.PUSHER_KEY as string,
      secret: process.env.PUSHER_SECRET as string,
      cluster: process.env.PUSHER_CLUSTER as string,
      useTLS: true,
    });
    const authResponse = pusher.authorizeChannel(socketId, channel);
    return NextResponse.json(authResponse);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('POST /api/chat/pusher/auth error:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
