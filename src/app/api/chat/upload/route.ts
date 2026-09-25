// POST /api/chat/upload — presign R2 para medios de chat (VOZ / IMAGEN).
//
// A diferencia de /api/upload/presign (solo dueños de negocio), aquí
// cualquier usuario autenticado puede subir SUS PROPIOS medios de
// chat. Clave forzada: chat/{userId}/{uuid}.{ext} — el servidor
// ignora cualquier prefijo que intente el cliente.
//
// Body: { kind: 'VOICE'|'IMAGE', fileType: 'audio/webm'|'audio/mp4'|'audio/mpeg'|'image/jpeg'|'image/png'|'image/webp' }
// Respuesta: { uploadUrl, publicUrl, key }

import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth';
import { generatePresignedUploadUrl } from '@/lib/r2';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';

const EXT_MAP: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    const rl = rateLimit(`chat-upload:${user.id}`, 30);
    if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

    const body = (await request.json().catch(() => ({}))) as {
      kind?: string;
      fileType?: string;
    };
    const kind = body.kind;
    const fileType = body.fileType ?? '';
    if (kind !== 'VOICE' && kind !== 'IMAGE') {
      return NextResponse.json({ error: 'kind debe ser VOICE o IMAGE' }, { status: 400 });
    }
    const ext = EXT_MAP[fileType];
    if (!ext || (kind === 'VOICE' && !fileType.startsWith('audio/')) || (kind === 'IMAGE' && !fileType.startsWith('image/'))) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 });
    }

    // Nota: usa las env vars R2_*; si no están configuradas (sandbox
    // local sin medios), el error sale claro y el cliente muestra un
    // aviso. En producción (Vercel) R2 ya está configurado.
    const key = `chat/${user.id}/${randomUUID()}.${ext}`;
    const result = await generatePresignedUploadUrl(key, fileType);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('POST /api/chat/upload error:', e);
    return NextResponse.json({ error: 'No se pudo preparar la subida (¿R2 configurado?)' }, { status: 500 });
  }
}
