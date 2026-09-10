// ─────────────────────────────────────────────────────────────
// CONECTA-LT — AccessButton (Sprint 8.8)
//
// Botón global "Acceder": CTA de login SIEMPRE visible, con una
// animación mínima (glow dorado pulsante + shine al hover).
// Convive con el login contextual del Sprint 7B: al pulsarlo
// abre EL MISMO LoginPromptModal (store.requestLogin), así que
// los mensajes, el flujo Google/demo y el retorno post-login
// son idénticos en ambas vías.
//
// En las páginas server-rendered (/editorial) el modal global de
// la SPA no está montado → usar `standalone`, que monta su propia
// copia del modal leyendo el mismo estado del store.
// ─────────────────────────────────────────────────────────────

'use client';

import { LogIn } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { LoginPromptModal } from '@/components/conecta/LoginPromptModal';

const LOGIN_MESSAGE =
  'Inicia sesión para guardar favoritos, reservar mesas y canjear cupones.';

export default function AccessButton({
  standalone = false,
  className = '',
}: {
  standalone?: boolean;
  className?: string;
}) {
  const requestLogin = useAppStore((s) => s.requestLogin);

  return (
    <>
      <button
        type="button"
        onClick={() => requestLogin(LOGIN_MESSAGE)}
        className={`group relative inline-flex items-center gap-1.5 overflow-hidden rounded-full bg-gold px-4 py-2 text-obsidian text-sm font-bold transition-all hover:brightness-110 active:scale-[0.97] animate-access-glow ${className}`}
        aria-label="Acceder: iniciar sesión con Google"
      >
        {/* Shine diagonal al hover (animación mínima, no invasiva) */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
        />
        <LogIn size={15} aria-hidden />
        Acceder
      </button>

      {/* En páginas server (/editorial) el modal global de la SPA
          no existe: montamos nuestra propia copia. */}
      {standalone && <LoginPromptModal />}
    </>
  );
}
