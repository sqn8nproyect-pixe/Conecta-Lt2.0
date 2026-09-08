// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Cliente Cloudflare R2 + presigned URLs
// ─────────────────────────────────────────────────────────────
// Permite subir imágenes directamente desde el navegador usando
// URLs firmadas (presigned PUT). El flujo es:
//   1. Frontend llama a /api/upload/presign → obtiene uploadUrl + publicUrl
//   2. Frontend hace PUT directo a uploadUrl con el archivo
//   3. Frontend llama a /api/owner/businesses/[slug]/images (POST)
//      para registrar la URL en la base de datos
// ─────────────────────────────────────────────────────────────

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ─── Configuración R2 ───────────────────────────────────────

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

/**
 * Tipos de archivo permitidos para subir imágenes.
 */
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * Tamaño máximo de imagen en bytes (5 MB).
 * Validado en el endpoint, no aquí.
 */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

// ─── Cliente S3 (singleton) ─────────────────────────────────

let _s3Client: S3Client | null = null;

/**
 * Indica si las variables de entorno de R2 están configuradas.
 * Si retorna false, las funciones de subida no están disponibles.
 */
export function isR2Configured(): boolean {
  return !!(
    R2_ACCOUNT_ID &&
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_BUCKET_NAME &&
    R2_PUBLIC_URL
  );
}

/**
 * Retorna el cliente S3 configurado para Cloudflare R2.
 * Lanza un error si R2 no está configurado.
 */
function getS3Client(): S3Client {
  if (!isR2Configured()) {
    throw new Error('R2 no configurado. Configura las variables R2_* en .env');
  }
  if (!_s3Client) {
    _s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _s3Client;
}

// ─── Tipos de retorno ────────────────────────────────────────

export interface PresignedUploadResult {
  /** URL firmada para PUT directo desde el navegador */
  uploadUrl: string;
  /** URL pública final del archivo en R2 */
  publicUrl: string;
  /** Ruta/clave del objeto en el bucket R2 */
  key: string;
}

// ─── Funciones exportadas ────────────────────────────────────

/**
 * Genera una URL firmada (presigned PUT) para subir un archivo a R2.
 *
 * @param key      — Ruta en el bucket (ej: 'businesses/tasca/cover/abc.jpg')
 * @param contentType — Tipo MIME del archivo
 * @param expiresIn   — Tiempo de expiración en segundos (default 300 = 5 min)
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 300,
): Promise<PresignedUploadResult> {
  const client = getS3Client();

  // Generar la URL firmada para PUT
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn });

  // URL pública final: se sirve a través del proxy interno de la app
  // porque la URL pública r2.dev del bucket está desactivada.
  // Relativa a propósito → funciona en cualquier dominio donde corra la app.
  const publicUrl = `/api/images/${key}`;

  return { uploadUrl, publicUrl, key };
}

/**
 * Elimina un objeto de R2 por su clave.
 *
 * @param key — Ruta/clave del objeto a eliminar en el bucket
 */
export async function deleteObject(key: string): Promise<void> {
  const client = getS3Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME!,
      Key: key,
    }),
  );
}

/**
 * Lee un objeto de R2 por su clave (usado por el proxy /api/images/[...key]).
 * Necesario porque la URL pública r2.dev del bucket está desactivada:
 * las imágenes se sirven a través de la app usando las credenciales S3.
 *
 * @param key — Ruta/clave del objeto en el bucket (ej: 'businesses/x/cover/uuid.png')
 * @returns Stream del objeto + tipo MIME, o null si no existe
 */
export async function getR2Object(
  key: string,
): Promise<{
  body: ReadableStream<Uint8Array>;
  contentType: string | null;
  contentLength: number | null;
} | null> {
  if (!isR2Configured()) return null;
  const client = getS3Client();

  try {
    const result = await client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME!,
        Key: key,
      }),
    );
    if (!result.Body) return null;
    return {
      body: result.Body as ReadableStream<Uint8Array>,
      contentType: result.ContentType ?? null,
      contentLength: result.ContentLength ?? null,
    };
  } catch (err) {
    const name = (err as { name?: string }).name ?? '';
    if (name === 'NoSuchKey') return null;
    throw err;
  }
}
