'use client';

import { motion } from 'framer-motion';
import { Globe, Instagram, Music2, Facebook, Phone, MapPin, Clock } from 'lucide-react';
import type { Establishment } from '@/lib/types';

interface SocialContactPanelProps {
  establishment: Establishment;
}

/**
 * Replaces the old contact sidebar (which only showed phone + IG handle).
 * Renders a vertical stack of branded action buttons — each one only appears
 * if the corresponding data field exists on the establishment.
 *
 * Order: website → instagram → tiktok → facebook → phone → address → schedule.
 * Each button uses a brand-tinted gradient and scales 1.04 on hover.
 */
export function SocialContactPanel({ establishment: est }: SocialContactPanelProps) {
  const { socialMedia, website, phone, address, schedule } = est;

  // Build the list of action buttons dynamically — only fields that exist.
  type Action = {
    key: string;
    label: string;
    sublabel?: string;
    href?: string;
    icon: React.ReactNode;
    /** Tailwind gradient classes for the icon chip */
    chipClass: string;
    /** Tailwind text color for the label hover */
    hoverText: string;
    external?: boolean;
  };

  const actions: Action[] = [];

  if (website) {
    actions.push({
      key: 'web',
      label: 'Página Web',
      sublabel: 'Sitio oficial',
      href: website,
      icon: <Globe size={18} />,
      chipClass: 'bg-gradient-to-br from-emerald-500/30 to-teal-500/20 border-emerald-400/40 text-emerald-300',
      hoverText: 'group-hover:text-emerald-300',
      external: true,
    });
  }

  if (socialMedia.instagram) {
    actions.push({
      key: 'ig',
      label: 'Instagram',
      sublabel: '@' + (socialMedia.instagram.split('instagram.com/')[1] || '').replace(/\/$/, ''),
      href: socialMedia.instagram,
      icon: <Instagram size={18} />,
      chipClass: 'bg-gradient-to-br from-fuchsia-500/30 via-rose-500/20 to-amber-500/20 border-fuchsia-400/40 text-fuchsia-300',
      hoverText: 'group-hover:text-fuchsia-300',
      external: true,
    });
  }

  if (socialMedia.tiktok) {
    actions.push({
      key: 'tt',
      label: 'TikTok',
      sublabel: '@' + (socialMedia.tiktok.split('tiktok.com/')[1] || '').replace(/^@/, '').replace(/\/$/, ''),
      href: socialMedia.tiktok,
      icon: <Music2 size={18} />,
      chipClass: 'bg-gradient-to-br from-slate-700/60 to-black/40 border-white/30 text-white',
      hoverText: 'group-hover:text-white',
      external: true,
    });
  }

  if (socialMedia.facebook) {
    actions.push({
      key: 'fb',
      label: 'Facebook',
      sublabel: 'Página oficial',
      href: socialMedia.facebook,
      icon: <Facebook size={18} />,
      chipClass: 'bg-gradient-to-br from-sky-600/30 to-blue-700/20 border-sky-400/40 text-sky-300',
      hoverText: 'group-hover:text-sky-300',
      external: true,
    });
  }

  if (phone) {
    actions.push({
      key: 'phone',
      label: 'Llamar Ahora',
      sublabel: phone,
      href: `tel:${phone.replace(/\s+/g, '')}`,
      icon: <Phone size={18} />,
      chipClass: 'bg-gradient-to-br from-amber/30 to-gold/20 border-amber/40 text-amber',
      hoverText: 'group-hover:text-amber',
    });
  }

  return (
    <div className="glass-card border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5 sticky top-24">
      <h4 className="text-xs font-bold tracking-[3px] text-gold font-mono">
        CONTACTO & REDES
      </h4>

      {/* Action buttons */}
      <div className="space-y-2.5">
        {actions.length > 0 ? (
          actions.map((a, idx) => (
            <motion.a
              key={a.key}
              href={a.href}
              target={a.external ? '_blank' : undefined}
              rel={a.external ? 'noopener noreferrer' : undefined}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className={`group flex items-center gap-3.5 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-colors ${a.hoverText}`}
            >
              {/* Icon chip */}
              <span className={`shrink-0 w-11 h-11 rounded-xl border flex items-center justify-center ${a.chipClass}`}>
                {a.icon}
              </span>
              {/* Label + sublabel */}
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-white group-hover:current">
                  {a.label}
                </span>
                {a.sublabel && (
                  <span className="block text-[11px] text-white/50 truncate font-mono">
                    {a.sublabel}
                  </span>
                )}
              </span>
            </motion.a>
          ))
        ) : (
          <p className="text-xs text-white/40 italic">Sin redes disponibles.</p>
        )}
      </div>

      {/* Address & schedule (read-only info, not links) */}
      <div className="space-y-3.5 pt-4 border-t border-white/10 text-sm text-white/70">
        <div className="flex items-start gap-3">
          <MapPin size={16} className="text-gold shrink-0 mt-0.5" />
          <span className="leading-snug">{address}</span>
        </div>
        <div className="flex items-start gap-3">
          <Clock size={16} className="text-gold shrink-0 mt-0.5" />
          <div>
            <div className="text-[10px] text-white/40 font-bold tracking-wider uppercase">
              Horario
            </div>
            <div className="text-white/80 font-medium">{schedule}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SocialContactPanel;
