'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface ValuePropositionBannerProps {
  specialty: string;
  valueProposition: string;
}

/**
 * Inmersive banner shown directly below the hero cover of an establishment.
 * Renders the specialty as a small badge and the value proposition as a
 * large serif quote, framed by a gold→purple gradient glassmorphism card.
 *
 * Atomic & reusable: only needs `specialty` + `valueProposition` strings.
 */
export function ValuePropositionBanner({
  specialty,
  valueProposition,
}: ValuePropositionBannerProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      aria-label="Propuesta de valor del local"
      className="conecta-vp-banner glass-card rounded-3xl p-6 sm:p-8 md:p-10 mb-8 sm:mb-10"
    >
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-7">
        {/* Sparkles icon */}
        <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber/20 to-purple/20 border border-amber/30 flex items-center justify-center">
          <Sparkles className="text-amber" size={26} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Specialty label */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber/10 border border-amber/30 text-amber text-[10px] font-bold tracking-[3px] font-mono uppercase mb-4">
            <span aria-hidden>✦</span> Especialidad
          </div>

          {/* Value proposition quote */}
          <blockquote className="font-serif text-2xl sm:text-3xl md:text-[34px] leading-[1.25] tracking-[-0.5px] text-white font-medium">
            <span className="text-amber/60 mr-1">&ldquo;</span>
            {valueProposition}
            <span className="text-amber/60 ml-1">&rdquo;</span>
          </blockquote>

          {/* Specialty name */}
          <div className="mt-4 text-sm text-white/60 font-medium">
            <span className="text-white/40">Firma del local:</span>{' '}
            <span className="text-gold font-bold tracking-wide">{specialty}</span>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export default ValuePropositionBanner;
