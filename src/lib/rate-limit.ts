// ─────────────────────────────────────────────────────────────
// Rate limiting en memoria (extraído del patrón del planner).
// Sin Redis por diseño del blueprint; el Map se resetea por
// deploy/instancia — suficiente para frenar abuso en v1.
//
// A diferencia del planner (IP), aquí la key es arbitraria: los
// endpoints de chat limitan por userId (autenticado) para que una
// IP compartida no castigue a usuarios inocentes.
// ─────────────────────────────────────────────────────────────

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();

// Purga periódica para evitar crecimiento de memoria: se ejecuta
// en cada request (barato para tamaños pequeños).
function purgeExpiredBuckets(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}

/**
 * Ventana fija por key. Retorna ok=false cuando la key agotó su
 * cupo dentro de la ventana, con resetAt para el header retry-after.
 */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number = 60_000,
): { ok: boolean; resetAt: number; retryAfterSec: number } {
  const now = Date.now();
  purgeExpiredBuckets(now);

  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, resetAt, retryAfterSec: 0 };
  }

  if (bucket.count >= max) {
    return {
      ok: false,
      resetAt: bucket.resetAt,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { ok: true, resetAt: bucket.resetAt, retryAfterSec: 0 };
}

/** 429 estándar con retry-after, listo para devolver desde rutas. */
export function tooManyRequests(retryAfterSec: number): Response {
  return new Response(
    JSON.stringify({ error: 'Demasiadas solicitudes. Intenta en unos momentos.' }),
    {
      status: 429,
      headers: {
        'retry-after': String(retryAfterSec),
        'content-type': 'application/json',
      },
    },
  );
}
