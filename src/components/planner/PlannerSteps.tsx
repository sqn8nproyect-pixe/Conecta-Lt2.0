'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — PlannerSteps
//
// The 6 progressive-question steps of the NightPlanner flow.
// Each step is a small presentational component that takes the
// current value(s) + an onChange callback. The parent
// (NightPlanner.tsx) owns the NightPlannerPreferences state and
// decides when to advance to the next step.
//
// The flow follows blueprint FASE 1 §5.2 "progressive" rule:
//   1. Mood      (essential — drives the vibe)
//   2. Company   (essential — drives capacity/scoring)
//   3. Budget    (essential — hard filter on priceRange)
//   4. DateTime  (essential — opens at the requested time)
//   5. Guests    (essential — capacity headroom)
//   6. Distance  (essential — km ceiling)
//
// All steps are single-select EXCEPT mood (multi-select, 1–2).
// All steps auto-advance on selection (except mood, which needs
// an explicit "continuar" CTA because the user picks 1–2 items).
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import {
  Wine,
  Heart,
  Users,
  PartyPopper,
  Music4,
  UtensilsCrossed,
  Martini,
  User,
  UserPlus,
  Baby,
  Gift,
  DollarSign,
  Wallet,
  Banknote,
  Gem,
  Minus,
  Plus,
  MapPin,
  Clock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  PlannerBudget,
  PlannerCompany,
  PlannerDistance,
  PlannerMood,
} from '@/server/planner/types';

// ─── Shared option card ──────────────────────────────────────
//
// Single-select card used by company / budget / distance steps.
// Renders an icon, title and optional description. The whole
// card is a button (large touch target — 44px+ when combined
// with the parent grid's gap).

interface OptionCardProps {
  icon: LucideIcon;
  title: string;
  desc?: string;
  selected: boolean;
  onClick: () => void;
}

function OptionCard({ icon: Icon, title, desc, selected, onClick }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        'relative p-5 sm:p-6 rounded-2xl border text-left transition-all',
        'flex flex-col items-start gap-3 active:scale-[0.98]',
        selected
          ? 'bg-gold/15 border-gold/60 shadow-[0_0_0_1px_rgba(212,175,55,0.3)]'
          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20',
      ].join(' ')}
    >
      <span
        className={[
          'inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
          selected ? 'bg-gold/20 text-gold' : 'bg-white/5 text-white/70',
        ].join(' ')}
      >
        <Icon size={20} />
      </span>
      <span className="flex-1">
        <span className="block font-semibold text-white text-sm sm:text-base">
          {title}
        </span>
        {desc && (
          <span className="block text-xs text-white/50 mt-0.5">{desc}</span>
        )}
      </span>
      {selected && (
        <span
          aria-hidden="true"
          className="absolute top-3 right-3 h-2 w-2 rounded-full bg-gold"
        />
      )}
    </button>
  );
}

// ─── Step 1: Mood (multi-select, 1–2) ────────────────────────

const MOOD_OPTIONS: { value: PlannerMood; icon: LucideIcon; title: string; desc: string }[] = [
  { value: 'relax', icon: Wine, title: 'Relajarme', desc: 'Tasca tranquila, conversar' },
  { value: 'date', icon: Heart, title: 'Cita', desc: 'Íntimo, ambiente romántico' },
  { value: 'friends', icon: Users, title: 'Con panas', desc: 'Rumba de grupo' },
  { value: 'party', icon: PartyPopper, title: 'Rumba fuerte', desc: 'Discoteca, bailar' },
  { value: 'celebration', icon: Gift, title: 'Celebrar', desc: 'Cumpleaños, especial' },
  { value: 'live_music', icon: Music4, title: 'Música en vivo', desc: 'Taberna con banda' },
  { value: 'food_drinks', icon: UtensilsCrossed, title: 'Comer y beber', desc: 'Tasca con comida' },
  { value: 'drinks', icon: Martini, title: 'Solo tragos', desc: 'Bar / licorería' },
];

interface StepMoodProps {
  value: PlannerMood[];
  onChange: (next: PlannerMood[]) => void;
}

export function PlannerStepMood({ value, onChange }: StepMoodProps) {
  const toggle = (mood: PlannerMood) => {
    if (value.includes(mood)) {
      // Always allow deselecting — but enforce minimum 1 (parent blocks "continue" otherwise).
      onChange(value.filter((m) => m !== mood));
      return;
    }
    // Cap at 2 selections. If 2 already selected, replace the oldest.
    if (value.length >= 2) {
      const second = value[1];
      if (second) onChange([second, mood]);
      return;
    }
    onChange([...value, mood]);
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {MOOD_OPTIONS.map((opt) => (
        <OptionCard
          key={opt.value}
          icon={opt.icon}
          title={opt.title}
          desc={opt.desc}
          selected={value.includes(opt.value)}
          onClick={() => toggle(opt.value)}
        />
      ))}
    </div>
  );
}

// ─── Step 2: Company (single-select) ─────────────────────────

const COMPANY_OPTIONS: { value: PlannerCompany; icon: LucideIcon; title: string; desc: string }[] = [
  { value: 'solo', icon: User, title: 'Solo', desc: 'Salir a explorar' },
  { value: 'couple', icon: UserPlus, title: 'En pareja', desc: 'Dos personas' },
  { value: 'friends', icon: Users, title: 'Con amigos', desc: 'Grupo de 3 a 6' },
  { value: 'family', icon: Baby, title: 'En familia', desc: 'Incluye niños' },
  { value: 'celebration', icon: Gift, title: 'Celebración', desc: 'Cumpleaños, aniversario' },
];

interface StepCompanyProps {
  value: PlannerCompany | null;
  onChange: (next: PlannerCompany) => void;
}

export function PlannerStepCompany({ value, onChange }: StepCompanyProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {COMPANY_OPTIONS.map((opt) => (
        <OptionCard
          key={opt.value}
          icon={opt.icon}
          title={opt.title}
          desc={opt.desc}
          selected={value === opt.value}
          onClick={() => onChange(opt.value)}
        />
      ))}
    </div>
  );
}

// ─── Step 3: Budget (single-select) ──────────────────────────

const BUDGET_OPTIONS: { value: PlannerBudget; icon: LucideIcon; title: string; desc: string }[] = [
  { value: 'under_20', icon: DollarSign, title: 'Hasta $20', desc: 'Ahorrativo' },
  { value: '20_50', icon: Wallet, title: '$20 a $50', desc: 'Moderado' },
  { value: '50_100', icon: Banknote, title: '$50 a $100', desc: 'Confortable' },
  { value: '100_plus', icon: Gem, title: 'Más de $100', desc: 'Premium / VIP' },
];

interface StepBudgetProps {
  value: PlannerBudget | null;
  onChange: (next: PlannerBudget) => void;
}

export function PlannerStepBudget({ value, onChange }: StepBudgetProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {BUDGET_OPTIONS.map((opt) => (
        <OptionCard
          key={opt.value}
          icon={opt.icon}
          title={opt.title}
          desc={opt.desc}
          selected={value === opt.value}
          onClick={() => onChange(opt.value)}
        />
      ))}
    </div>
  );
}

// ─── Step 4: Date + Time ─────────────────────────────────────
//
// Two inputs side-by-side: a native date picker and a native
// time picker. We default both to "tonight at 21:00" in the
// parent (NightPlanner.tsx) so the user can submit immediately
// if they're planning for tonight.

interface StepDateTimeProps {
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  onDateChange: (next: string) => void;
  onTimeChange: (next: string) => void;
}

export function PlannerStepDateTime({
  date,
  time,
  onDateChange,
  onTimeChange,
}: StepDateTimeProps) {
  // Min date = today (YYYY-MM-DD in local timezone). Prevents
  // the user from picking a date in the past.
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="planner-date"
          className="block text-xs font-mono text-gold tracking-widest mb-2"
        >
          FECHA
        </label>
        <input
          id="planner-date"
          type="date"
          value={date}
          min={todayStr}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full bg-white/5 border border-white/10 focus:border-gold focus:bg-white/10 px-4 h-14 rounded-2xl text-base text-white outline-none transition-all [color-scheme:dark]"
        />
      </div>
      <div>
        <label
          htmlFor="planner-time"
          className="block text-xs font-mono text-gold tracking-widest mb-2"
        >
          HORA DE INICIO
        </label>
        <div className="relative">
          <Clock
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
            size={18}
          />
          <input
            id="planner-time"
            type="time"
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
            className="w-full bg-white/5 border border-white/10 focus:border-gold focus:bg-white/10 pl-12 pr-4 h-14 rounded-2xl text-base text-white outline-none transition-all [color-scheme:dark]"
          />
        </div>
      </div>
      <p className="text-xs text-white/40 leading-relaxed">
        Buscamos negocios abiertos a la hora que elijas. Si un local
        cierra después de medianoche, lo consideramos abierto hasta
        el cierre real.
      </p>
    </div>
  );
}

// ─── Step 5: Guests (number stepper) ─────────────────────────
//
// Stepper with -/+ buttons and a large numeric readout. Range
// 1–50 (capped by the Zod schema). Mobile-friendly: large hit
// targets, keyboard-accessible.

interface StepGuestsProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}

export function PlannerStepGuests({
  value,
  onChange,
  min = 1,
  max = 50,
}: StepGuestsProps) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-6 sm:gap-8">
        <button
          type="button"
          onClick={dec}
          disabled={value <= min}
          aria-label="Reducir invitados"
          className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-gold/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center text-white"
        >
          <Minus size={20} />
        </button>

        <div className="text-center min-w-[120px]">
          <div className="text-5xl font-serif font-bold text-white tabular-nums">
            {value}
          </div>
          <div className="text-xs text-white/50 mt-1 tracking-wider uppercase">
            {value === 1 ? 'persona' : 'personas'}
          </div>
        </div>

        <button
          type="button"
          onClick={inc}
          disabled={value >= max}
          aria-label="Aumentar invitados"
          className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-gold/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center text-white"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Quick presets */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {[1, 2, 4, 6, 8, 10].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={[
              'h-9 px-4 rounded-full text-xs font-mono tracking-wider transition-all',
              value === n
                ? 'bg-gold text-obsidian font-bold'
                : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10',
            ].join(' ')}
          >
            {n}
          </button>
        ))}
      </div>

      <p className="text-xs text-white/40 text-center leading-relaxed">
        Para grupos grandes (más de 50) contacta al local directamente.
      </p>
    </div>
  );
}

// ─── Step 6: Distance (single-select) ────────────────────────

const DISTANCE_OPTIONS: { value: PlannerDistance; icon: LucideIcon; title: string; desc: string }[] = [
  { value: 'nearby', icon: MapPin, title: 'Cercano', desc: 'A menos de 2 km' },
  { value: '10_min', icon: Clock, title: '10 min', desc: 'A menos de 5 km' },
  { value: '20_min', icon: Clock, title: '20 min', desc: 'A menos de 10 km' },
  { value: 'any', icon: MapPin, title: 'Cualquiera', desc: 'Sin límite de distancia' },
];

interface StepDistanceProps {
  value: PlannerDistance | null;
  onChange: (next: PlannerDistance) => void;
}

export function PlannerStepDistance({ value, onChange }: StepDistanceProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {DISTANCE_OPTIONS.map((opt) => (
        <OptionCard
          key={opt.value}
          icon={opt.icon}
          title={opt.title}
          desc={opt.desc}
          selected={value === opt.value}
          onClick={() => onChange(opt.value)}
        />
      ))}
    </div>
  );
}

// ─── Step header (title + subtitle) ──────────────────────────
//
// Shared by all 6 steps so the visual rhythm is consistent.
// Animated with framer-motion for a subtle slide-in when the
// step changes.

interface StepHeaderProps {
  step: number;
  total?: number;
  title: string;
  subtitle: string;
}

export function StepHeader({ step, total = 6, title, subtitle }: StepHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="text-center mb-5"
    >
      <span className="text-[10px] tracking-[4px] font-mono text-gold/80 font-bold">
        PASO {step} DE {total}
      </span>
      <h4 className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">
        {title}
      </h4>
      <p className="text-sm text-white/60 mt-1.5 max-w-md mx-auto">{subtitle}</p>
    </motion.div>
  );
}
