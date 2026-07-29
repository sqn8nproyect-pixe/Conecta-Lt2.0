'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export function Notifications() {
  const notifications = useAppStore((s) => s.notifications);

  return (
    <div
      aria-live="polite"
      className="fixed top-24 right-4 sm:right-6 z-[60] flex flex-col gap-3 pointer-events-none max-w-[calc(100vw-2rem)]"
    >
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className={`pointer-events-auto px-5 py-4 rounded-2xl glass-card flex items-center gap-3 shadow-2xl border ${
              n.type === 'success' ? 'border-emerald-500/30' : 'border-gold/30'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                n.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-gold/20 text-gold'
              }`}
            >
              {n.type === 'success' ? <Check size={16} /> : <Sparkles size={16} />}
            </div>
            <span className="text-sm font-medium text-white">{n.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
