'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Images } from 'lucide-react';

interface PhotoGalleryProps {
  images: string[];
  establishmentName: string;
}

/**
 * Immersive photo gallery.
 *
 * Desktop: 2 rows × 5 thumbnails grid (10 photos).
 * Mobile: horizontal scrollable strip.
 *
 * Clicking any thumbnail opens a full-screen lightbox with:
 *   - ← / → arrow navigation
 *   - ESC key to close
 *   - click on backdrop to close
 *   - counter badge "1 / 10" in the bottom-right corner
 *
 * Atomic & scalable: works with any number of images (5, 10, 20…).
 */
export function PhotoGallery({ images, establishmentName }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const isOpen = lightboxIndex !== null;

  const close = useCallback(() => setLightboxIndex(null), []);
  const next = useCallback(
    () =>
      setLightboxIndex((i) => (i === null ? i : (i + 1) % images.length)),
    [images.length],
  );
  const prev = useCallback(
    () =>
      setLightboxIndex((i) =>
        i === null ? i : (i - 1 + images.length) % images.length,
      ),
    [images.length],
  );

  // Keyboard navigation while the lightbox is open
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    // Lock scroll while open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, close, next, prev]);

  if (!images || images.length === 0) return null;

  return (
    <section aria-label={`Galería de fotos de ${establishmentName}`}>
      {/* Section heading */}
      <div className="flex items-center justify-between mb-5">
        <h4 className="text-xs font-bold tracking-[3px] text-gold font-mono flex items-center gap-2">
          <Images size={14} /> GALERÍA · {images.length} FOTOS
        </h4>
      </div>

      {/* Desktop: 2 × 5 grid. Mobile: horizontal strip. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
        {images.map((src, idx) => (
          <motion.button
            key={`${src}-${idx}`}
            type="button"
            onClick={() => setLightboxIndex(idx)}
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.4) }}
            aria-label={`Abrir foto ${idx + 1} de ${images.length}`}
            className="group relative aspect-square overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 bg-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <img
              src={src}
              alt={`${establishmentName} — foto ${idx + 1}`}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            {/* Index pill on hover */}
            <span className="absolute bottom-1.5 right-1.5 text-[10px] font-mono font-bold text-white/0 group-hover:text-white/90 transition-colors bg-black/60 px-1.5 py-0.5 rounded-md">
              {idx + 1}
            </span>
          </motion.button>
        ))}
      </div>

      {/* ─── Lightbox ─── */}
      <AnimatePresence>
        {isOpen && lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-label={`Foto ${lightboxIndex + 1} de ${images.length} — ${establishmentName}`}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar galería"
              className="absolute top-5 right-5 z-10 w-12 h-12 rounded-full bg-white/5 border border-white/15 text-white hover:bg-white/15 hover:text-gold transition-colors flex items-center justify-center"
            >
              <X size={22} />
            </button>

            {/* Prev arrow (hidden if only one image) */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                aria-label="Foto anterior"
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/5 border border-white/15 text-white hover:bg-white/15 hover:text-gold transition-colors flex items-center justify-center"
              >
                <ChevronLeft size={26} />
              </button>
            )}

            {/* Image (click does NOT close — only backdrop does) */}
            <motion.img
              key={lightboxIndex}
              src={images[lightboxIndex]}
              alt={`${establishmentName} — foto ${lightboxIndex + 1}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="conecta-lightbox-img max-w-[92vw] max-h-[86vh] object-contain rounded-lg shadow-2xl border border-white/10"
            />

            {/* Next arrow */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label="Foto siguiente"
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/5 border border-white/15 text-white hover:bg-white/15 hover:text-gold transition-colors flex items-center justify-center"
              >
                <ChevronRight size={26} />
              </button>
            )}

            {/* Counter badge bottom-right */}
            <div className="absolute bottom-6 right-6 z-10 px-3.5 py-1.5 rounded-full bg-black/70 border border-gold/30 text-gold text-xs font-mono font-bold tracking-wider">
              {lightboxIndex + 1} / {images.length}
            </div>

            {/* Hint bottom-left */}
            <div className="hidden sm:block absolute bottom-6 left-6 z-10 text-[10px] text-white/40 font-mono tracking-wider uppercase">
              ESC para cerrar · ← → para navegar
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default PhotoGallery;
