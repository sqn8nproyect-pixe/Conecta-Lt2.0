# Task 5 — HomePage stagger animation + price filter + sort selector

**Agent:** full-stack-developer
**Task ID:** 5
**Target file:** `src/components/conecta/HomePage.tsx`

## Work Log

- Read `worklog.md` to load context (Task 0/4/5-9/10/11 history). Confirmed Task 11 set up foundation: 21 establishments with `priceRange`, `getDynamicRating(estId)` returns `{avg, count}` from Zustand store, shadcn/ui `Select` component present at `src/components/ui/select.tsx`.
- Read current `HomePage.tsx` (252 lines): hero, search input, category filters (Todas/licorería/tascas/discoteca), favorites heart per card, matchmaker modal — all intact.
- Read `data.ts` and `store.ts` to confirm `priceRange: '$' | '$$' | '$$$'` on each establishment and that `getDynamicRating` is stable (defined once in store selector).
- Read `select.tsx` to confirm export API: `Select, SelectContent, SelectItem, SelectTrigger, SelectValue`.
- Rewrote `HomePage.tsx` with three enhancements:

### 1. Stagger animation
- Changed `.map((est) => …)` → `.map((est, index) => …)`.
- Card `motion.div` transition updated:
  - `initial={{ opacity: 0, y: 30, scale: 0.95 }}`
  - `animate={{ opacity: 1, y: 0, scale: 1 }}`
  - `exit={{ opacity: 0, scale: 0.9 }}`
  - `transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.5) }}` — delay capped at 0.5 s so 21 cards finish stagger in ≤0.55 s.

### 2. Price filter
- New state: `const [priceFilter, setPriceFilter] = useState<PriceFilter>('Todos')` where `type PriceFilter = 'Todos' | PriceRange`.
- New row of pill buttons (px-3 py-1.5 text-[10px]) for `['Todos', '$', '$$', '$$$']`, gold when active (matches category filter style but smaller).
- `aria-pressed` attribute added for accessibility.
- Placed in a second toolbar row BELOW the category filters, both grouped inside a `flex flex-col gap-2 w-full md:w-auto` wrapper. Mobile stacks vertically; desktop aligns under the title.

### 3. Sort selector
- New state: `const [sortBy, setSortBy] = useState<SortBy>('rating')` where `type SortBy = 'rating' | 'reviews' | 'name'`.
- shadcn `Select` placed next to the price filters.
- `SelectTrigger` styled: `bg-white/5 border border-white/10 text-white text-xs h-9 w-[180px] hover:bg-white/10 focus-visible:border-gold/50`.
- `SelectContent` themed dark: `bg-obsidian border-white/10 text-white`.
- `SelectItem`s: `Mejor valorados` (rating), `Más reseñas` (reviews), `Nombre A-Z` (name).
- `onValueChange={(v) => setSortBy(v as SortBy)}` for type-safe cast.

### 4. Filter + sort logic
- Replaced single `.filter()` with `.filter(...).sort(...)` chain.
- Filter predicate: `matchesSearch && matchesCategory && matchesPrice`.
- Sort comparator:
  - `rating` → `getDynamicRating(b.id).avg - getDynamicRating(a.id).avg`
  - `reviews` → `getDynamicRating(b.id).count - getDynamicRating(a.id).count`
  - `name` → `a.name.localeCompare(b.name)`

## Verification

- `cd /home/z/my-project && bun run lint` → 0 errors, 0 warnings.
- Dev server (auto-run by sandbox) compiles cleanly; `GET / 200` repeated in `dev.log`.
- Hero section, matchmaker button, card design (image / badges / favorite heart / rating / schedule), empty-state message, and `AnimatePresence mode="popLayout"` all preserved unchanged.
- `'use client'` directive at top.
- No `any` types; strict typing with literal-union aliases (`Filter`, `PriceFilter`, `SortBy`).

## Stage Summary
- HomePage enhanced with three improvements: staggered card entrance (delay = `min(index * 0.05, 0.5)`), price pill filter row (Todos/$/$$/$$$), and shadcn Select sort dropdown (Mejor valorados / Más reseñas / Nombre A-Z).
- Filter logic updated to combine search + category + price, then sort by rating/reviews/name using `getDynamicRating`.
- Toolbar restructured to a responsive two-row layout (category filters on top, price filters + sort below) that stacks vertically on mobile and aligns right on desktop.
- Lint passes cleanly (0/0). Dev server HTTP 200.
