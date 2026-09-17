import type { NextConfig } from "next";

// ─────────────────────────────────────────────────────────────
// Cabeceras de seguridad (auditoría 2026-09-17)
//
//   - frame-ancestors 'none'   → nadie puede incrustar el sitio
//                                (anti-clickjacking; sustituye a
//                                X-Frame-Options en navegadores
//                                modernos; XFO va como respaldo).
//   - object-src 'none'        → bloquea <object>/<embed> (Flash-
//                                style, no se usan) y cerrar vectores
//                                de contenido incrustado.
//   - base-uri 'self'          → impide que un XSS cambie la base
//                                de URLs relativas.
//   - X-Content-Type-Options   → el navegador no "adivina" MIME.
//   - Referrer-Policy          → no filtra URLs internas a terceros.
//   - Permissions-Policy       → geolocalización solo misma página
//                                (la usa el mapa), cámara/micrófono
//                                cerrados.
//   - COOP allow-popups        → aísla la ventana sin romper el
//                                flujo OAuth con Google.
//
// NOTA CSP completa (default-src/script-src): se mantiene
// deliberadamente fuera — el SPA usa estilos inline (framer-motion),
// Google Fonts y OAuth; un CSP estricto hay que afinarlo con datos
// reales de violación. frame-ancestors/object-src/base-uri son
// seguros al 100% y cubren clickjacking + incrustación.
// ─────────────────────────────────────────────────────────────

const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
];

const nextConfig: NextConfig = {
  // standalone SOLO para la vista previa local (scripts E2E usan
  // .next/standalone/server.js). En Vercel sobra: la plataforma empaqueta
  // las funciones a su manera y el bundle duplicado engorda el uso de
  // Function Storage (advertencia 75% de 10 GB, 2026-09-17).
  // El build local lo activa solo: "build": "prisma generate && BUILD_STANDALONE=1 next build ..."
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
