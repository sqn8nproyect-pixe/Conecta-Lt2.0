'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT — LoginPromptModal (Sprint 7B: login contextual)
//
// Modal global montado una sola vez en page.tsx. Se abre cuando
// el usuario intenta una acción que requiere sesión (favoritar,
// reservar, canjear cupón) sin haber iniciado sesión. Muestra un
// mensaje contextual ("Inicia sesión para guardar este local")
// y al completar el login, `usePendingIntent` ejecuta la acción
// original que quedó guardada en sessionStorage.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { LogIn, Heart, CalendarPlus, Ticket } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';
import { useAuthProviders } from '@/lib/hooks/use-auth-providers';
import { beginLogin } from '@/lib/auth-login';
import { DemoLoginModal } from '@/components/conecta/DemoLoginModal';

const INTENT_ICONS = {
  favorite: Heart,
  reserve: CalendarPlus,
  redeem: Ticket,
} as const;

export function LoginPromptModal() {
  const open = useAppStore((s) => s.loginPromptOpen);
  const message = useAppStore((s) => s.loginPromptMessage);
  const intent = useAppStore((s) => s.pendingIntent);
  const clearLoginPrompt = useAppStore((s) => s.clearLoginPrompt);
  const addNotification = useAppStore((s) => s.addNotification);
  const { googleEnabled } = useAuthProviders();

  // El demo (sin Google configurado) se abre como segundo modal.
  const [demoOpen, setDemoOpen] = useState(false);

  const IntentIcon = intent ? INTENT_ICONS[intent.type] : LogIn;

  const handleLogin = () => {
    const started = beginLogin(googleEnabled, addNotification);
    if (!started) {
      // Google no configurado (sandbox) → modal demo. La intención
      // pendiente sobrevive: el demo hace reload al éxito y
      // usePendingIntent la procesa con la sesión ya activa.
      clearLoginPrompt();
      setDemoOpen(true);
    }
    // Con Google OAuth el redirect recarga la página; el modal se
    // desmonta solo. La intención quedó persistida en requestLogin.
  };

  const handleDismiss = (next: boolean) => {
    if (!next) clearLoginPrompt();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleDismiss}>
        <DialogContent className="sm:max-w-md bg-obsidian border-gold/30 text-white">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-gold flex items-center gap-2">
              <IntentIcon size={20} />
              Inicia sesión
            </DialogTitle>
            <DialogDescription className="text-white/70 text-sm leading-relaxed pt-1">
              {message ?? 'Necesitas una sesión para esta acción.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gold text-obsidian font-semibold hover:bg-gold/90 active:scale-[0.98] transition-all text-sm"
            >
              <LogIn size={16} />
              {googleEnabled ? 'Continuar con Google' : 'Acceso demo'}
            </button>
            <button
              onClick={clearLoginPrompt}
              className="w-full px-4 py-2.5 rounded-xl border border-white/20 text-white/70 hover:bg-white/5 hover:text-white transition-all text-sm"
            >
              Ahora no
            </button>
          </div>

          <p className="text-[11px] text-white/40 mt-3 leading-relaxed">
            {intent
              ? 'Después de iniciar sesión completamos la acción por ti, sin volver a empezar.'
              : 'Tu sesión solo se usa para favoritos, reservas y cupones.'}
          </p>
        </DialogContent>
      </Dialog>

      {/* Modal demo reutilizado (Google no configurado en dev/sandbox) */}
      <DemoLoginModal open={demoOpen} onOpenChange={setDemoOpen} />
    </>
  );
}
