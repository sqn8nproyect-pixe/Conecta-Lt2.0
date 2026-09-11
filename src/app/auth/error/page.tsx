// /auth/error — Página de error de autenticación (Auth.js v5 `pages.error`).
//
// Reemplaza la carta genérica en inglés de Auth.js ("Error del servidor /
// Existe un problema con la configuración") por una experiencia en español
// coherente con la marca Conecta-LT: explica qué pasó, evita culpar al
// usuario y ofrece rutas de salida claras.
//
// Los códigos llegan como querystring: /auth/error?error=Configuration
// (y para CredentialsSignin además &code=...). El mapeo abajo cubre los
// códigos que Auth.js puede enviar; cualquier otro cae en el fallback.

import Link from 'next/link';

type ErrorInfo = {
  titulo: string;
  detalle: string;
  accion: { label: string; href: string } | null;
};

// `satisfies` en vez de anotación Record: con noUncheckedIndexedAccess, un
// Record<string, T> hace que hasta las accesiones por literal (ERRORES.X)
// devuelvan T | undefined. Con el objeto literal + satisfies, las claves
// conocidas devuelven ErrorInfo y solo el índice dinámico es opcional.
const ERRORES = {
  Configuration: {
    titulo: 'No pudimos iniciar tu sesión',
    detalle:
      'El acceso con Google falló por un problema de configuración del servidor (credenciales OAuth). No es un error tuyo y tu cuenta está a salvo. Estamos trabajándolo — mientras tanto puedes seguir navegando por el directorio sin sesión.',
    accion: { label: 'Volver al inicio', href: '/' },
  },
  Callback: {
    titulo: 'Google no completó el acceso',
    detalle:
      'Recibimos una respuesta inválida de Google al cerrar el acceso. Suele resolverse reintentando en unos segundos; si persiste, puede ser cookies bloqueadas o configuración OAuth del servidor.',
    accion: { label: 'Intentar de nuevo', href: '/' },
  },
  AccessDenied: {
    titulo: 'Acceso denegado',
    detalle:
      'No autorizaste el acceso de Conecta-LT a tu cuenta de Google, o tu cuenta no tiene permiso para entrar aquí. Si fue sin querer, vuelve a intentarlo y acepta los permisos solicitados.',
    accion: { label: 'Intentar de nuevo', href: '/' },
  },
  Verification: {
    titulo: 'Enlace de verificación inválido',
    detalle:
      'El enlace que seguiste ya fue usado o expiró. Solicita uno nuevo desde el inicio de sesión.',
    accion: { label: 'Volver al inicio', href: '/' },
  },
  CredentialsSignin: {
    titulo: 'No pudimos validar ese correo',
    detalle:
      'El acceso demo solo funciona con cuentas que ya existen en Conecta-LT. Si nunca entraste con Google, esa es la vía correcta para crear tu cuenta.',
    accion: { label: 'Volver al inicio', href: '/' },
  },
  Default: {
    titulo: 'Algo falló al iniciar sesión',
    detalle:
      'Ocurrió un error inesperado durante el acceso. Puedes reintentar en unos momentos; si el problema continúa, navega libremente — el directorio funciona sin sesión.',
    accion: { label: 'Volver al inicio', href: '/' },
  },
} satisfies Record<string, ErrorInfo>;

function normalizar(error: string | undefined): ErrorInfo {
  if (error) {
    const directo = (ERRORES as Record<string, ErrorInfo | undefined>)[error];
    if (directo) return directo;
    if (error.startsWith('CredentialsSignin')) return ERRORES.CredentialsSignin;
  }
  return ERRORES.Default;
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; code?: string }>;
}) {
  const params = await searchParams;
  const info = normalizar(params.error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0b10] px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#14141c] p-8 text-center shadow-2xl shadow-black/60">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2a2110] text-2xl">
          🔐
        </div>
        <h1 className="mb-3 text-xl font-semibold text-[#f5f0e6]">
          {info.titulo}
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-[#b8b3a8]">
          {info.detalle}
        </p>
        <div className="flex flex-col items-center gap-3">
          {info.accion && (
            <Link
              href={info.accion.href}
              className="w-full rounded-full bg-gradient-to-r from-[#e8b64c] to-[#d4972e] px-6 py-3 text-sm font-semibold text-[#1a1408] transition hover:brightness-110 active:scale-[0.98]"
            >
              {info.accion.label}
            </Link>
          )}
          <Link
            href="/local"
            className="text-xs font-medium text-[#8f8a80] underline-offset-4 transition hover:text-[#e8b64c] hover:underline"
          >
            Explorar el directorio sin sesión
          </Link>
        </div>
        {/* Huella técnica para soporte (no sensible) */}
        <p className="mt-8 text-[10px] uppercase tracking-widest text-[#5c584f]">
          conecta-lt · auth/error · código: {params.error ?? 'desconocido'}
          {params.code ? ` · ${params.code}` : ''}
        </p>
      </div>
    </main>
  );
}
