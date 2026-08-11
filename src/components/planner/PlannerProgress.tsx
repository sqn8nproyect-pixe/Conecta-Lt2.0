'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — PlannerProgress
//
// Step indicator for the NightPlanner modal. Shows 6 dots that
// represent the 6 question steps (mood / company / budget /
// datetime / guests / distance). The "results" step is not
// represented here — once the user submits, the whole indicator
// is hidden by the parent.
//
// Visual states per dot:
//   - completed  → solid gold (full width)
//   - current    → solid gold (wider, animated pulse)
//   - upcoming   → muted white (narrow)
//
// The dots are aria-hidden — the step number is also surfaced
// visually ("Paso 2 de 6") and to screen readers via the
// <span className="sr-only"> below.
// ─────────────────────────────────────────────────────────────

interface PlannerProgressProps {
  /** Current step (1-indexed, 1..6). */
  current: number;
  /** Total number of steps (defaults to 6). */
  total?: number;
}

export function PlannerProgress({ current, total = 6 }: PlannerProgressProps) {
  return (
    <div
      className="flex items-center justify-center gap-2"
      role="presentation"
    >
      <span className="sr-only">
        Paso {current} de {total}
      </span>
      {Array.from({ length: total }).map((_, i) => {
        const stepNumber = i + 1;
        const isCurrent = stepNumber === current;
        const isCompleted = stepNumber < current;
        return (
          <span
            key={stepNumber}
            aria-hidden="true"
            className={[
              'h-1.5 rounded-full transition-all duration-300',
              isCurrent
                ? 'w-8 bg-gold animate-pulse'
                : isCompleted
                  ? 'w-4 bg-gold/70'
                  : 'w-4 bg-white/15',
            ].join(' ')}
          />
        );
      })}
    </div>
  );
}
