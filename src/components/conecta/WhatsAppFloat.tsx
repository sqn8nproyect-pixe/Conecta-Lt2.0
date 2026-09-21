'use client';

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { trackAnalyticsEvent } from '@/lib/api';
import { waLink } from '@/lib/contact';
import { WhatsAppIcon } from '@/components/conecta/WhatsAppIcon';

// ── WhatsApp flotante — canal directo con el equipo CONECTA-LT ──
// Botón global montado en el layout raíz: aparece en TODAS las
// páginas (SPA, fichas /local/[slug], /editorial, /r/[code]).
// Abre un chat de WhatsApp con el número del dueño con un
// mensaje pre-llenado para reducir la fricción al escribir.
//
// El número vive en src/lib/contact.ts (fuente única compartida
// con el footer y "Quiénes Somos").
//
// Z-index: z-40 → por encima del contenido, por debajo de la
// navbar (z-50), notificaciones (z-[60]), modales (z-[70]) y
// del AgeGate (z-[100]) que lo cubre hasta verificar la edad.

export function WhatsAppFloat() {
  const handleClick = useCallback(() => {
    // Fire-and-forget: el tracking nunca debe interferir con la
    // apertura del chat. Sin businessSlug — es un contacto con la
    // plataforma, no con un local del directorio.
    trackAnalyticsEvent({
      type: 'WHATSAPP_CLICK',
      metadata: {
        source: 'floating-button',
        path: typeof window !== 'undefined' ? window.location.pathname : '/',
      },
    });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 1.2, type: 'spring', stiffness: 260, damping: 20 }}
      className="group fixed bottom-5 right-5 z-40 sm:bottom-6 sm:right-6"
    >
      {/* Etiqueta al pasar el cursor (solo desktop) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-full top-1/2 mr-3 hidden -translate-y-1/2 translate-x-2 whitespace-nowrap rounded-xl border border-white/10 bg-[#090d1a]/90 px-3.5 py-2 text-xs font-semibold text-white opacity-0 shadow-xl backdrop-blur transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 sm:block"
      >
        ¿Dudas? Escríbenos por WhatsApp
      </span>

      <a
        href={waLink()}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        aria-label="Contactar a CONECTA-LT por WhatsApp"
        title="Contactar a CONECTA-LT por WhatsApp"
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#2fe672] to-[#128c4b] text-white shadow-lg shadow-emerald-500/30 transition-transform duration-300 hover:scale-110 active:scale-95"
      >
        {/* Onda sutil cada 4s para atraer la atención sin molestar */}
        <span
          aria-hidden="true"
          className="whatsapp-ripple absolute inset-0 rounded-full bg-[#25d366]"
        />

        {/* Glifo oficial de WhatsApp */}
        <WhatsAppIcon className="relative h-7 w-7" />
      </a>
    </motion.div>
  );
}
