'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT — DemoLoginModal
//
// Modal para login demo cuando Google OAuth no está configurado.
// El usuario escribe su email; si el usuario existe en la DB
// (creado previamente vía Google OAuth), se autentica.
// Si no existe, se muestra un error indicando que debe iniciar
// sesión con Google primero.
//
// Google OAuth es la única forma de CREAR usuarios. El demo
// solo autentica usuarios ya existentes.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Mail, Loader2, AlertCircle, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';

interface DemoLoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DemoLoginModal({ open, onOpenChange }: DemoLoginModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addNotification = useAppStore((s) => s.addNotification);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError('Ingresa tu correo electrónico');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await signIn('demo', {
        email: trimmed,
        callbackUrl: '/',
        redirect: false,
      });

      if (res?.error) {
        setError(
          'No se encontró este correo en la base de datos. ' +
          'Debes iniciar sesión con Google al menos una vez antes de usar el acceso demo.',
        );
      } else if (res?.url && res.url.includes('/api/auth/error')) {
        setError('Error de autenticación. Verifica tu correo e intenta de nuevo.');
      } else {
        // Success — cookie set, reload to pick up session
        addNotification('Sesión iniciada correctamente.', 'success');
        onOpenChange(false);
        setEmail('');
        setError(null);
        window.location.reload();
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!loading) {
      onOpenChange(next);
      if (!next) {
        setEmail('');
        setError(null);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-obsidian border-gold/30 text-white">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-gold flex items-center gap-2">
            <Mail size={20} />
            Acceso Demo
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Ingresa el correo con el que te registraste vía Google.
            Solo funciona para usuarios ya existentes en la base de datos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <label htmlFor="demo-email" className="text-sm font-medium text-white/80">
              Correo electrónico
            </label>
            <Input
              id="demo-email"
              type="email"
              placeholder="tu.correo@gmail.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              disabled={loading}
              autoFocus
              className="bg-white/5 border-white/20 text-white placeholder:text-white/30 focus:border-gold/50"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gold text-obsidian font-semibold hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Verificando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
              className="px-4 py-2.5 rounded-lg border border-white/20 text-white/70 hover:bg-white/5 hover:text-white disabled:opacity-50 transition-all"
            >
              Cancelar
            </button>
          </div>
        </form>

        <div className="text-xs text-white/40 border-t border-white/10 pt-3 mt-2">
          <p className="flex items-center gap-1.5">
            <X size={12} />
            Los usuarios nuevos deben registrarse con Google primero.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
