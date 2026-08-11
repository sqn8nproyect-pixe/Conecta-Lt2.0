'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — PlannerResults
//
// Renders the four terminal states of the planner flow:
//   1. loading   — 3 skeleton cards + spinning sparkles
//   2. error     — friendly message + retry button
//   3. empty     — tailored message based on `reason` code
//   4. success   — list of PlannerBusinessCard (top 3) + summary
//
// The parent (NightPlanner.tsx) owns the request state and
// passes the response down. This component is purely presentational
// — it does not call the API itself.
//
// Empty-state messaging follows blueprint FASE 14: the UI maps
// each `PlannerEmptyReason` to a tailored message + actionable
// suggestion (e.g. "try 1h later", "expand the distance").
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import {
  Sparkles,
  AlertTriangle,
  RefreshCw,
  SearchX,
  Clock3,
  MapPinned,
  Wallet,
  ArrowLeft,
} from 'lucide-react';
import {
  PlannerBusinessCard,
  PlannerBusinessCardSkeleton,
} from './PlannerBusinessCard';
import type { LucideIcon } from 'lucide-react';
import type {
  NightPlannerResponse,
  NightPlannerResult,
  NightPlannerEmptyResult,
  PlannerEmptyReason,
} from '@/server/planner/types';

// ─── Empty-state config ──────────────────────────────────────
//
// Each reason code maps to an icon, a human title, and an
// actionable suggestion. The suggestion matches the
// `suggestion` field from the service but is rendered with
// the service's actual text (so the backend stays the single
// source of truth for copy).
const EMPTY_CONFIG: Record<
  PlannerEmptyReason,
  { icon: LucideIcon; title: string }
> = {
  NO_CANDIDATES_IN_CITY: {
    icon: SearchX,
    title: 'No encontramos negocios activos en esta ciudad',
  },
  ALL_CLOSED_AT_TIME: {
    icon: Clock3,
    title: 'No hay negocios abiertos a esa hora',
  },
  DISTANCE_TOO_STRICT: {
    icon: MapPinned,
    title: 'No encontramos opciones dentro de esa distancia',
  },
  BUDGET_TOO_STRICT: {
    icon: Wallet,
    title: 'No hay opciones que encajen con ese presupuesto',
  },
  NO_MATCH_AT_ALL: {
    icon: SearchX,
    title: 'No encontramos opciones que coincidan',
  },
};

// ─── Type guard: empty vs success ────────────────────────────
//
// The endpoint returns NightPlannerResult | NightPlannerEmptyResult.
// The empty variant has a `reason` field — we use that to discriminate.
function isEmptyResult(
  res: NightPlannerResponse,
): res is NightPlannerEmptyResult {
  return 'reason' in res && res.reason !== undefined;
}

// ─── Loading state ───────────────────────────────────────────

export function PlannerResultsLoading() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-center gap-2 text-gold py-2">
        <Sparkles size={16} className="animate-pulse" />
        <span className="text-xs font-mono tracking-widest">
          BUSCANDO TU NOCHE IDEAL…
        </span>
      </div>
      <PlannerBusinessCardSkeleton />
      <PlannerBusinessCardSkeleton />
      <PlannerBusinessCardSkeleton />
    </motion.div>
  );
}

// ─── Error state ─────────────────────────────────────────────

interface PlannerResultsErrorProps {
  message: string;
  onRetry: () => void;
  onBack: () => void;
}

export function PlannerResultsError({
  message,
  onRetry,
  onBack,
}: PlannerResultsErrorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-8 px-4"
    >
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 mb-4">
        <AlertTriangle size={24} />
      </div>
      <h4 className="font-serif text-lg font-bold text-white mb-1.5">
        Algo salió mal
      </h4>
      <p className="text-sm text-white/60 mb-6 max-w-sm mx-auto leading-relaxed">
        {message}
      </p>
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="h-11 px-4 rounded-xl border border-white/15 text-white/80 hover:bg-white/5 text-xs font-semibold tracking-wider transition-all flex items-center gap-1.5"
        >
          <ArrowLeft size={14} />
          AJUSTAR
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="h-11 px-5 rounded-xl bg-gold text-obsidian font-bold text-xs tracking-wider hover:bg-[#e5bf4a] active:scale-95 transition-all flex items-center gap-1.5"
        >
          <RefreshCw size={14} />
          REINTENTAR
        </button>
      </div>
    </motion.div>
  );
}

// ─── Empty state ─────────────────────────────────────────────

interface PlannerResultsEmptyProps {
  result: NightPlannerEmptyResult;
  onBack: () => void;
  onReset: () => void;
}

export function PlannerResultsEmpty({
  result,
  onBack,
  onReset,
}: PlannerResultsEmptyProps) {
  const cfg = EMPTY_CONFIG[result.reason] ?? EMPTY_CONFIG.NO_MATCH_AT_ALL;
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-6 px-4"
    >
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/50 mb-4">
        <Icon size={24} />
      </div>
      <h4 className="font-serif text-lg font-bold text-white mb-1.5">
        {cfg.title}
      </h4>
      <p className="text-sm text-white/60 mb-6 max-w-sm mx-auto leading-relaxed">
        {result.suggestion}
      </p>
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="h-11 px-5 rounded-xl bg-gold text-obsidian font-bold text-xs tracking-wider hover:bg-[#e5bf4a] active:scale-95 transition-all flex items-center gap-1.5"
        >
          <ArrowLeft size={14} />
          AJUSTAR BÚSQUEDA
        </button>
        <button
          type="button"
          onClick={onReset}
          className="h-11 px-4 rounded-xl border border-white/15 text-white/80 hover:bg-white/5 text-xs font-semibold tracking-wider transition-all"
        >
          REINICIAR
        </button>
      </div>
    </motion.div>
  );
}

// ─── Success state ───────────────────────────────────────────

interface PlannerResultsSuccessProps {
  result: NightPlannerResult;
  onView: (slug: string) => void;
  onReset: () => void;
}

export function PlannerResultsSuccess({
  result,
  onView,
  onReset,
}: PlannerResultsSuccessProps) {
  const count = result.recommendations.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="text-center pb-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/10 border border-gold/30 mb-2">
          <Sparkles size={12} className="text-gold" />
          <span className="text-[10px] font-mono tracking-widest text-gold font-bold">
            TU NOCHE IDEAL
          </span>
        </div>
        <h4 className="font-serif text-xl sm:text-2xl font-bold text-white">
          Encontramos {count} {count === 1 ? 'opción' : 'opciones'}
        </h4>
        <p className="text-xs text-white/50 mt-1">
          Ordenadas por compatibilidad con tu búsqueda
        </p>
      </div>

      {/* Recommendations */}
      <div className="space-y-3">
        {result.recommendations.map((rec, i) => (
          <PlannerBusinessCard
            key={rec.business.id}
            recommendation={rec}
            rank={i + 1}
            onView={onView}
            index={i}
          />
        ))}
      </div>

      {/* Footer actions */}
      <div className="pt-3 flex items-center justify-center">
        <button
          type="button"
          onClick={onReset}
          className="h-10 px-4 rounded-xl border border-white/15 text-white/70 hover:bg-white/5 text-xs font-semibold tracking-wider transition-all flex items-center gap-1.5"
        >
          <RefreshCw size={13} />
          NUEVA BÚSQUEDA
        </button>
      </div>
    </motion.div>
  );
}

// ─── Discriminated dispatcher ────────────────────────────────
//
// Convenience wrapper that picks the right sub-component based
// on the response shape. The parent can use this OR call the
// sub-components directly (e.g. to show loading before the
// request finishes).

interface PlannerResultsProps {
  loading: boolean;
  error: string | null;
  result: NightPlannerResponse | null;
  onView: (slug: string) => void;
  onRetry: () => void;
  onBack: () => void;
  onReset: () => void;
}

export function PlannerResults({
  loading,
  error,
  result,
  onView,
  onRetry,
  onBack,
  onReset,
}: PlannerResultsProps) {
  if (loading) return <PlannerResultsLoading />;
  if (error)
    return (
      <PlannerResultsError message={error} onRetry={onRetry} onBack={onBack} />
    );
  if (!result) return null;
  if (isEmptyResult(result))
    return (
      <PlannerResultsEmpty result={result} onBack={onBack} onReset={onReset} />
    );
  return (
    <PlannerResultsSuccess
      result={result}
      onView={onView}
      onReset={onReset}
    />
  );
}
