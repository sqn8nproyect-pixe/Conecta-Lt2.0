'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — NightPlanner (orchestrator modal)
//
// Replaces the legacy Matchmaker.tsx as the active "Planificar
// Noche" flow. This component owns:
//
//   1. Modal chrome (backdrop + glass card + close button)
//   2. Step state machine (1..6 → results)
//   3. The NightPlannerPreferences state (with sensible defaults)
//   4. Per-step validation (UX-level — final validation is Zod
//      on the server)
//   5. The fetchPlannerRecommend call on submit
//   6. Analytics events (PLANNER_OPENED, PLANNER_STEP_COMPLETED,
//      PLANNER_SEARCH_STARTED, PLANNER_RESULTS_SHOWN,
//      PLANNER_DISMISSED, PLANNER_RECOMMENDATION_SELECTED)
//
// This component does NOT compute the ranking — it delegates to
// POST /api/planner/recommend (blueprint FASE 2 §6).
//
// Hardcoded constants:
//   - citySlug = 'los-teques' (this directory is Los Teques only.
//     Multi-city support would require a city picker, out of scope
//     for v2 — see blueprint §1.2 for the multi-city roadmap).
//   - wantsReservation / wantsPromotions default to true
//   - wantsRoute defaults to false (route builder is FASE 15,
//     a future sprint — the response contract already supports
//     it, the UI just doesn't request it yet).
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useAnalytics } from '@/lib/hooks/use-analytics';
import { fetchPlannerRecommend } from '@/lib/api';
import type {
  NightPlannerPreferences,
  NightPlannerResponse,
  PlannerBudget,
  PlannerCompany,
  PlannerDistance,
  PlannerMood,
} from '@/server/planner/types';
import { PlannerProgress } from './PlannerProgress';
import {
  PlannerStepMood,
  PlannerStepCompany,
  PlannerStepBudget,
  PlannerStepDateTime,
  PlannerStepGuests,
  PlannerStepDistance,
  StepHeader,
} from './PlannerSteps';
import { PlannerResults } from './PlannerResults';

// ─── Constants ───────────────────────────────────────────────

const TOTAL_STEPS = 6;
const CITY_SLUG = 'los-teques'; // This directory is Los Teques only.

/** Tonight at 21:00 in local time, formatted for the date input. */
function defaultDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DEFAULT_START_TIME = '21:00';

// ─── Step metadata (titles + subtitles) ─────────────────────
//
// Centralized so the step header copy is consistent with the
// blueprint's progressive-disclosure rule (essential questions
// first, "personalize more" later).
const STEP_META: { title: string; subtitle: string }[] = [
  {
    title: '¿Qué ambiente buscas?',
    subtitle: 'Elige 1 o 2 opciones. Define el tipo de lugar que te recomendamos.',
  },
  {
    title: '¿Con quién vas?',
    subtitle: 'Ajusta el tipo de lugar al tamaño y dinámica del grupo.',
  },
  {
    title: '¿Cuál es tu presupuesto?',
    subtitle: 'Por persona, en USD. Filtra los locales que encajen.',
  },
  {
    title: '¿Cuándo?',
    subtitle: 'Fecha y hora de inicio de la salida.',
  },
  {
    title: '¿Cuántos van?',
    subtitle: 'Para verificar que haya capacidad disponible.',
  },
  {
    title: '¿Qué tan lejos?',
    subtitle: 'Distancia máxima desde el centro de Los Teques.',
  },
];

// ─── Preferences state shape ─────────────────────────────────
//
// We use a "draft" shape that allows nullable fields for the
// single-select steps (so we can detect "user hasn't picked yet"
// vs "user picked X"). The fetchPlannerRecommend call requires
// all fields to be non-null, so we resolve nullables right before
// calling the API (see buildPreferences below).

interface PlannerDraft {
  mood: PlannerMood[];
  company: PlannerCompany | null;
  budget: PlannerBudget | null;
  date: string;
  startTime: string;
  guests: number;
  distance: PlannerDistance | null;
}

function createInitialDraft(): PlannerDraft {
  return {
    mood: [],
    company: null,
    budget: null,
    date: defaultDate(),
    startTime: DEFAULT_START_TIME,
    guests: 2,
    distance: null,
  };
}

// ─── Per-step validation ─────────────────────────────────────
//
// Returns true if the user can advance past the given step.
// The error message (when invalid) is shown inline above the
// CTA row so the user knows what to fix.

function isStepValid(step: number, draft: PlannerDraft): boolean {
  switch (step) {
    case 1:
      return draft.mood.length >= 1;
    case 2:
      return draft.company !== null;
    case 3:
      return draft.budget !== null;
    case 4:
      // Date + time both non-empty. The regex is validated on the
      // server by Zod — here we only check the UX-level "filled in".
      return draft.date.length > 0 && draft.startTime.length > 0;
    case 5:
      return draft.guests >= 1 && draft.guests <= 50;
    case 6:
      return draft.distance !== null;
    default:
      return true;
  }
}

// ─── Build the final preferences payload ────────────────────
//
// Resolves the nullable draft fields into the strict
// NightPlannerPreferences shape expected by the API. Caller
// must ensure all single-select fields are non-null (use
// isStepValid above).

function buildPreferences(draft: PlannerDraft): NightPlannerPreferences {
  if (!draft.company) throw new Error('company is required');
  if (!draft.budget) throw new Error('budget is required');
  if (!draft.distance) throw new Error('distance is required');
  return {
    mood: draft.mood,
    company: draft.company,
    budget: draft.budget,
    date: draft.date,
    startTime: draft.startTime,
    guests: draft.guests,
    distance: draft.distance,
    citySlug: CITY_SLUG,
    // zoneId is undefined → service searches the whole city.
    zoneId: undefined,
    wantsReservation: true,
    wantsPromotions: true,
    wantsRoute: false, // Future sprint — FASE 15.
  };
}

// ─── Component ───────────────────────────────────────────────

interface NightPlannerProps {
  open: boolean;
  onClose: () => void;
}

export function NightPlanner({ open, onClose }: NightPlannerProps) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<PlannerDraft>(createInitialDraft);
  const [view, setView] = useState<'form' | 'results'>('form');

  // Request state — kept here so the modal owns the lifecycle.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NightPlannerResponse | null>(null);

  const goToDetail = useAppStore((s) => s.goToDetail);
  const { track } = useAnalytics();

  // ─── Lifecycle: open/close ────────────────────────────────
  //
  // When the modal opens, fire PLANNER_OPENED + reset state.
  // When it closes, fire PLANNER_DISMISSED (only if the user
  // didn't reach the results — dismissing after results is a
  // different signal that's already captured by the result
  // events).

  useEffect(() => {
    if (open) {
      track('PLANNER_OPENED');
      setStep(1);
      setDraft(createInitialDraft());
      setView('form');
      setLoading(false);
      setError(null);
      setResult(null);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    if (view === 'form' && step > 1) {
      track('PLANNER_DISMISSED', { metadata: { step } });
    } else if (view === 'results' && !result) {
      track('PLANNER_DISMISSED', { metadata: { step: 'results-loading' } });
    }
    onClose();
  }, [view, step, result, track, onClose]);

  // Lock body scroll while the modal is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ─── Navigation ───────────────────────────────────────────

  const canAdvance = useMemo(() => isStepValid(step, draft), [step, draft]);

  const handleNext = useCallback(() => {
    if (!canAdvance) return;
    track('PLANNER_STEP_COMPLETED', {
      metadata: { step },
    });
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      // Last step → submit.
      void submit();
    }
  }, [canAdvance, step, draft, track]);

  const handleBack = useCallback(() => {
    if (view === 'results') {
      // From results, go back to the last form step.
      setView('form');
      setError(null);
      return;
    }
    if (step > 1) {
      setStep((s) => s - 1);
    } else {
      // First step + back = close.
      handleClose();
    }
  }, [view, step, handleClose]);

  // ─── Submit (calls the API) ───────────────────────────────
  //
  // The endpoint does the heavy lifting (Zod validation, rate
  // limit, scoring, reasons, availability). Here we just resolve
  // the draft → preferences and fire the request.

  const submit = useCallback(async () => {
    setLoading(true);
    setError(null);
    setView('results');
    try {
      const prefs = buildPreferences(draft);
      track('PLANNER_SEARCH_STARTED', {
        metadata: {
          moods: prefs.mood,
          company: prefs.company,
          budget: prefs.budget,
          distance: prefs.distance,
          guests: prefs.guests,
        },
      });
      const res = await fetchPlannerRecommend(prefs);
      setResult(res);
      // Fire RESULTS_SHOWN for both success and empty — the
      // empty state is still a "result" from the user's POV.
      track('PLANNER_RESULTS_SHOWN', {
        metadata: {
          success: !('reason' in res),
          count: 'recommendations' in res ? res.recommendations.length : 0,
          candidateCount: res.meta.candidateCount,
          scoredCount: res.meta.scoredCount,
        },
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Error al generar recomendaciones';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [draft, track]);

  // ─── View detail (closes modal + navigates) ───────────────

  const handleView = useCallback(
    (slug: string) => {
      track('PLANNER_RECOMMENDATION_VIEWED', { businessSlug: slug });
      // Close first, then navigate — so the modal unmounts
      // cleanly before the detail page mounts.
      onClose();
      // Defer the navigation to the next tick so React can
      // unmount the modal without overlapping transitions.
      setTimeout(() => goToDetail(slug), 50);
    },
    [track, onClose, goToDetail],
  );

  const handleReset = useCallback(() => {
    setStep(1);
    setDraft(createInitialDraft());
    setView('form');
    setLoading(false);
    setError(null);
    setResult(null);
  }, []);

  const handleRetry = useCallback(() => {
    void submit();
  }, [submit]);

  // ─── Render ───────────────────────────────────────────────

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="planner-title"
            className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto glass-card rounded-3xl p-6 sm:p-8 border border-white/15 shadow-2xl z-10 conecta-scroll"
          >
            {/* Top gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple via-gold to-amber rounded-t-3xl" />

            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Cerrar planificador"
              className="absolute top-5 right-5 text-white/50 hover:text-white rounded-full p-1.5 hover:bg-white/5 transition-colors z-10"
            >
              <X size={18} />
            </button>

            {/* Header (form view only — results view has its own header) */}
            {view === 'form' && (
              <div className="text-center mb-5 sm:mb-6">
                <span className="text-[10px] tracking-[4px] font-mono text-gold font-bold">
                  PLANIFICADOR DE NOCHE v2.0
                </span>
                <h3
                  id="planner-title"
                  className="text-2xl sm:text-3xl font-serif mt-1 font-bold text-white"
                >
                  Tu noche ideal
                </h3>
              </div>
            )}

            {/* Body */}
            <AnimatePresence mode="wait">
              {view === 'form' && (
                <motion.div
                  key={`step-${step}`}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.22 }}
                >
                  <StepHeader
                    step={step}
                    total={TOTAL_STEPS}
                    title={STEP_META[step - 1]?.title ?? ''}
                    subtitle={STEP_META[step - 1]?.subtitle ?? ''}
                  />

                  {step === 1 && (
                    <PlannerStepMood
                      value={draft.mood}
                      onChange={(mood) => setDraft((d) => ({ ...d, mood }))}
                    />
                  )}
                  {step === 2 && (
                    <PlannerStepCompany
                      value={draft.company}
                      onChange={(company) =>
                        setDraft((d) => ({ ...d, company }))
                      }
                    />
                  )}
                  {step === 3 && (
                    <PlannerStepBudget
                      value={draft.budget}
                      onChange={(budget) => setDraft((d) => ({ ...d, budget }))}
                    />
                  )}
                  {step === 4 && (
                    <PlannerStepDateTime
                      date={draft.date}
                      time={draft.startTime}
                      onDateChange={(date) => setDraft((d) => ({ ...d, date }))}
                      onTimeChange={(startTime) =>
                        setDraft((d) => ({ ...d, startTime }))
                      }
                    />
                  )}
                  {step === 5 && (
                    <PlannerStepGuests
                      value={draft.guests}
                      onChange={(guests) =>
                        setDraft((d) => ({ ...d, guests }))
                      }
                    />
                  )}
                  {step === 6 && (
                    <PlannerStepDistance
                      value={draft.distance}
                      onChange={(distance) =>
                        setDraft((d) => ({ ...d, distance }))
                      }
                    />
                  )}
                </motion.div>
              )}

              {view === 'results' && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <PlannerResults
                    loading={loading}
                    error={error}
                    result={result}
                    onView={handleView}
                    onRetry={handleRetry}
                    onBack={handleBack}
                    onReset={handleReset}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer: progress + CTA row (form view only) */}
            {view === 'form' && (
              <div className="mt-6 space-y-4">
                <PlannerProgress current={step} total={TOTAL_STEPS} />

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="h-11 px-4 rounded-xl border border-white/15 text-white/80 hover:bg-white/5 text-xs font-semibold tracking-wider transition-all flex items-center gap-1.5"
                  >
                    <ChevronLeft size={14} />
                    {step === 1 ? 'CANCELAR' : 'ATRÁS'}
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canAdvance}
                    className={[
                      'flex-1 h-11 rounded-xl font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-1.5',
                      canAdvance
                        ? 'bg-gold text-obsidian hover:bg-[#e5bf4a] active:scale-[0.98] glow-gold'
                        : 'bg-white/5 text-white/30 cursor-not-allowed',
                    ].join(' ')}
                  >
                    {step === TOTAL_STEPS ? (
                      <>
                        <Sparkles size={14} />
                        VER RECOMENDACIONES
                      </>
                    ) : (
                      <>
                        CONTINUAR
                        <ChevronRight size={14} />
                      </>
                    )}
                  </button>
                </div>

                {/* Inline hint when the user can't advance */}
                {!canAdvance && step === 1 && (
                  <p className="text-center text-[11px] text-white/40">
                    Elige al menos un ambiente para continuar
                  </p>
                )}
                {!canAdvance &&
                  step >= 2 &&
                  step <= 6 &&
                  step !== 4 &&
                  step !== 5 && (
                    <p className="text-center text-[11px] text-white/40">
                      Selecciona una opción para continuar
                    </p>
                  )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
