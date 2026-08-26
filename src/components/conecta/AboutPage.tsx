'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT — Quiénes Somos (SPA view)
//
// Vista accesada vía state.view: 'about'
// Implementada como SPA (sin rutas nuevas) para respetar la
// restricción de "solo ruta /" del proyecto.
//
// Estilo: consistente con LegalPage (glass-card, gold accents,
// tipografía serif para títulos, font-mono para meta labels).
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Compass,
  MapPin,
  CalendarCheck,
  Users,
  Tag,
  ShieldCheck,
  Lock,
  Car,
  UserCheck,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

const features = [
  {
    icon: Compass,
    title: 'Directorio Exclusivo',
    text: 'Acceso a perfiles enriquecidos con fotografías reales, horarios de apertura y contacto directo con los 21 locales más selectos de la capital mirandina (incluyendo licorerías, tascas y discotecas).',
  },
  {
    icon: MapPin,
    title: 'Mapa Interactivo Geolocalizado',
    text: 'Visualiza todos los comercios activos a tu alrededor en tiempo real y fíltralos según tu ubicación y cercanía, sin fricciones.',
  },
  {
    icon: CalendarCheck,
    title: 'Night Planner (Planificador Inteligente)',
    text: 'Un asistente interactivo de 6 pasos que analiza tus preferencias de ambiente (vibe), presupuesto, tipo de compañía, fecha, hora y distancia para recomendarte en segundos el lugar perfecto mediante un algoritmo de Scoring de Compatibilidad.',
  },
  {
    icon: Users,
    title: 'Reservas y Reporte de Aforo en Vivo',
    text: 'Un sistema de reservas gratuito que respeta la capacidad real de cada local. Podrás verificar si un establecimiento está tranquilo, moderado o lleno antes de salir, asegurando tu cupo de forma inteligente.',
  },
  {
    icon: Tag,
    title: 'Promociones Verificadas',
    text: 'Accede a ofertas, eventos especiales y cupones exclusivos con códigos de canje válidos directamente en los locales colaboradores.',
  },
];

const compliance = [
  {
    icon: UserCheck,
    title: 'Verificación estricta de edad (+18)',
    text: 'El acceso a la plataforma exige una confirmación explícita de mayoría de edad para proteger a los menores.',
  },
  {
    icon: Car,
    title: 'Consumo responsable',
    text: 'Promovemos activamente la seguridad vial y la moderación a través de campañas y advertencias permanentes dentro del sitio.',
  },
  {
    icon: Lock,
    title: 'Seguridad de datos',
    text: 'Protegemos la privacidad de nuestra comunidad utilizando un sistema de inicio de sesión seguro, fluido y sin contraseñas a través de Google OAuth.',
  },
];

export function AboutPage() {
  const setView = useAppStore((s) => s.setView);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      {/* Back button */}
      <button
        onClick={() => setView('home')}
        className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-gold transition-colors mb-8 font-mono tracking-wider"
      >
        <ArrowLeft size={16} /> VOLVER AL INICIO
      </button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-12"
      >
        <span className="font-mono text-xs tracking-[0.3em] text-gold/70 uppercase mb-3 block">
          Quiénes Somos
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif text-white mb-6 leading-tight">
          Transformando la vida nocturna{' '}
          <span className="text-gold">de Los Teques</span>
        </h1>
        <div className="w-16 h-0.5 bg-gold/40 mb-6" />
        <p className="text-white/60 leading-relaxed">
          ConectAlt es la plataforma digital de descubrimiento y conexión diseñada para
          transformar y modernizar la vida nocturna de Los Teques, en Venezuela.
          Desarrollado por la agencia de ingeniería CeroTraba, este ecosistema digital nace
          con la misión de unificar una industria que históricamente ha estado fragmentada,
          facilitando el encuentro directo y seguro entre los usuarios y los mejores comercios
          de la ciudad.
        </p>
        <p className="text-white/60 leading-relaxed mt-4">
          Antes de ConectAlt, planificar una salida implicaba navegar de forma caótica entre
          múltiples redes sociales, chats de WhatsApp y listas de información desactualizadas.
          Hoy, resolvemos esa fricción de raíz integrando cinco capas de valor en un único y
          robusto producto tecnológico.
        </p>
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="mb-12"
      >
        <div className="flex items-center gap-2 mb-6">
          <Compass size={18} className="text-gold" />
          <h2 className="text-xl font-serif text-white">Nuestras cinco capas de valor</h2>
        </div>
        <div className="space-y-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
              className="glass-card p-5 rounded-xl border border-white/5 hover:border-gold/20 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center shrink-0 mt-0.5">
                  <f.icon size={18} className="text-gold" />
                </div>
                <div>
                  <h3 className="font-mono text-sm text-gold tracking-wider mb-1.5">
                    {f.title}
                  </h3>
                  <p className="text-white/50 text-sm leading-relaxed">{f.text}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Compliance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mb-12"
      >
        <div className="flex items-center gap-2 mb-6">
          <ShieldCheck size={18} className="text-gold" />
          <h2 className="text-xl font-serif text-white">Compromiso, Seguridad y Responsabilidad</h2>
        </div>
        <p className="text-white/60 leading-relaxed mb-6">
          En ConectAlt creemos que la diversión y la responsabilidad van de la mano. Por ello,
          operamos bajo un estricto marco de cumplimiento legal adaptado a la normativa venezolana
          vigente.
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          {compliance.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
              className="glass-card p-5 rounded-xl border border-white/5 text-center"
            >
              <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-3">
                <c.icon size={20} className="text-gold" />
              </div>
              <h3 className="font-mono text-xs text-gold tracking-wider mb-2">{c.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{c.text}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Back button bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="pt-8 border-t border-white/5"
      >
        <button
          onClick={() => setView('home')}
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-gold transition-colors font-mono tracking-wider"
        >
          <ArrowLeft size={16} /> VOLVER AL INICIO
        </button>
      </motion.div>
    </div>
  );
}
