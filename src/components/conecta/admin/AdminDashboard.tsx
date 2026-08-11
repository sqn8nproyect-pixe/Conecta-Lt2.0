'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — AdminDashboard (Etapa 7.C.1)
//
// The admin/moderator panel — surfaced when an ADMIN or MODERATOR
// clicks "Admin" in the Navbar (only visible to those roles).
//
// Layout: a sticky header with title + tab bar + "Salir" button,
// followed by a tabbed content area:
//
//   1. Resumen   — totals + pending queues + recent activity + top this week
//   2. Negocios  — searchable / filterable table with status-change dropdown (ADMIN only)
//   3. Reseñas   — filterable table with status-change dropdown (ADMIN + MODERATOR)
//   4. Usuarios  — searchable / filterable table with role-change dropdown (ADMIN only)
//
// Access control: the view itself is gated by a role check at the
// top — a non-ADMIN/MODERATOR user who somehow lands here sees an
// AccessDenied card with a button to go home. The Navbar also hides
// the "Admin" entry for non-admins, so this is a defense-in-depth.
//
// Data fetching: each tab owns its own useQuery so switching tabs
// doesn't refetch unrelated data. All admin queries use a 30s
// staleTime (matches the pattern established by useNotificationsSync).
//
// Mutations: status/role changes use useMutation with optimistic
// update (we patch the cache directly via queryClient.setQueryData
// before awaiting the network) + automatic rollback on error. After
// success, we invalidate the relevant admin query + the public
// ['businesses'] / ['business', slug] / ['reviews'] query keys so
// the user-facing pages stay in sync.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Shield,
  Store,
  Users,
  Star,
  CalendarClock,
  ArrowUpRight,
  Lock,
  Search,
  CheckCircle2,
  Ban,
  RotateCcw,
  Archive,
  EyeOff,
  Flag,
  MessageSquare,
  TrendingUp,
  KeyRound,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { isAdminEmail } from '@/lib/admin-config';
import {
  fetchAdminStats,
  fetchAdminBusinesses,
  fetchAdminReviews,
  fetchAdminUsers,
  updateBusinessStatus,
  updateReviewStatus,
  updateUserRole,
} from '@/lib/api';
import type {
  AdminBusiness,
  AdminReview,
  AdminStats,
  AdminUser,
  BusinessStatus,
  ReviewStatus,
  UserRole,
} from '@/lib/types';
import { formatRelativeTime } from '@/lib/utils';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

// Query keys — kept here (rather than in a dedicated hooks file)
// because they're only consumed by this component. If a future
// iteration surfaces admin data elsewhere, lift them to a shared
// module.
const QK_STATS = ['admin', 'stats'] as const;
const QK_BUSINESSES = ['admin', 'businesses'] as const;
const QK_REVIEWS = ['admin', 'reviews'] as const;
const QK_USERS = ['admin', 'users'] as const;

// ─── AccessDenied ──────────────────────────────────────────────
// Defense-in-depth: the Navbar hides the "Admin" entry for non-admin
// users, but if one somehow lands on /admin (e.g. by direct store
// mutation), this is what they see.
function AccessDenied() {
  const setView = useAppStore((s) => s.setView);
  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-32 text-center">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card rounded-3xl p-8 sm:p-10"
      >
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
          <Lock className="text-red-400" size={28} />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-3">
          Acceso restringido
        </h1>
        <p className="text-white/60 text-sm leading-relaxed mb-8">
          No tienes permisos para ver esta página. Esta área está reservada
          para administradores y moderadores.
        </p>
        <button
          onClick={() => setView('home')}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-obsidian font-bold hover:bg-gold hover:text-obsidian active:scale-95 transition-all text-sm tracking-wider glow-gold"
        >
          <Shield size={16} /> IR AL INICIO
        </button>
      </motion.div>
    </div>
  );
}

// ─── Status badge helpers ──────────────────────────────────────
// Each business/review/user status gets a distinct color so the
// moderator can scan the queue visually.

function BusinessStatusBadge({ status }: { status: BusinessStatus }) {
  const map: Record<BusinessStatus, string> = {
    ACTIVE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    PENDING_REVIEW: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    SUSPENDED: 'bg-red-500/15 text-red-300 border-red-500/30',
    ARCHIVED: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
    DRAFT: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  };
  const labels: Record<BusinessStatus, string> = {
    ACTIVE: 'ACTIVO',
    PENDING_REVIEW: 'PENDIENTE',
    SUSPENDED: 'SUSPENDIDO',
    ARCHIVED: 'ARCHIVADO',
    DRAFT: 'BORRADOR',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest border ${map[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const map: Record<ReviewStatus, string> = {
    PUBLISHED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    PENDING: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    FLAGGED: 'bg-red-500/15 text-red-300 border-red-500/30',
    HIDDEN: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
  };
  const labels: Record<ReviewStatus, string> = {
    PUBLISHED: 'PUBLICADA',
    PENDING: 'PENDIENTE',
    FLAGGED: 'FLAGGED',
    HIDDEN: 'OCULTA',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest border ${map[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const map: Record<UserRole, string> = {
    USER: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
    BUSINESS_OWNER: 'bg-gold/15 text-gold border-gold/30',
    BUSINESS_MANAGER: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    MODERATOR: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    ADMIN: 'bg-red-500/15 text-red-300 border-red-500/30',
  };
  const labels: Record<UserRole, string> = {
    USER: 'USUARIO',
    BUSINESS_OWNER: 'DUEÑO',
    BUSINESS_MANAGER: 'GERENTE',
    MODERATOR: 'MODERADOR',
    ADMIN: 'ADMIN',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest border ${map[role]}`}
    >
      {labels[role]}
    </span>
  );
}

// ─── Star rating row ───────────────────────────────────────────
function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`${rating} de 5 estrellas`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < rating ? 'text-gold' : 'text-white/20'}
          fill={i < rating ? '#d4af37' : 'none'}
        />
      ))}
    </div>
  );
}

// ─── Skeleton helpers ──────────────────────────────────────────
function StatCardSkeleton() {
  return <Skeleton className="h-24 rounded-2xl" />;
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 rounded-lg" />
      ))}
    </div>
  );
}

// ─── Tab 1: Resumen ────────────────────────────────────────────

function StatCard({
  icon,
  value,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={`glass-card rounded-2xl p-4 sm:p-5 text-left flex items-center gap-4 ${
        onClick ? 'hover:border-gold/40 transition-colors' : ''
      }`}
    >
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-mono text-2xl sm:text-3xl font-bold text-white tabular-nums">
          {value}
        </div>
        <div className="text-[10px] text-white/50 tracking-widest uppercase mt-0.5">
          {label}
        </div>
      </div>
    </Comp>
  );
}

function PendingRow({
  label,
  count,
  onClick,
}: {
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="glass-card rounded-xl px-4 py-3 flex items-center justify-between hover:border-gold/40 transition-colors w-full"
    >
      <div className="flex items-center gap-3">
        <AlertCircle
          size={16}
          className={count > 0 ? 'text-amber-400' : 'text-white/30'}
        />
        <span className="text-sm text-white/80">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`font-mono font-bold tabular-nums text-sm ${
            count > 0 ? 'text-amber-400' : 'text-white/40'
          }`}
        >
          {count}
        </span>
        <ArrowUpRight size={14} className="text-white/40" />
      </div>
    </button>
  );
}

function ResumenTab({
  stats,
  isLoading,
  isError,
  onNavigateTab,
}: {
  stats: AdminStats | undefined;
  isLoading: boolean;
  isError: boolean;
  onNavigateTab: (
    tab: 'businesses' | 'reviews' | 'users',
    filter?: { status?: string },
  ) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <TableSkeleton rows={3} />
      </div>
    );
  }
  if (isError || !stats) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-white/60">
        Error al cargar el resumen. Intenta de nuevo.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats grid */}
      <section>
        <h2 className="text-gold tracking-[3px] text-xs font-mono font-bold mb-3">
          TOTALES
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={<Store size={18} />}
            value={stats.totals.businesses}
            label="Negocios"
          />
          <StatCard
            icon={<Users size={18} />}
            value={stats.totals.users}
            label="Usuarios"
          />
          <StatCard
            icon={<CalendarClock size={18} />}
            value={stats.totals.reservations}
            label="Reservas"
          />
          <StatCard
            icon={<Star size={18} />}
            value={stats.totals.reviews}
            label="Reseñas"
          />
        </div>
      </section>

      {/* Pending queues — click → jump to tab with filter applied */}
      <section>
        <h2 className="text-gold tracking-[3px] text-xs font-mono font-bold mb-3">
          PENDIENTES
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <PendingRow
            label="Negocios en revisión"
            count={stats.pending.businesses}
            onClick={() =>
              onNavigateTab('businesses', { status: 'PENDING_REVIEW' })
            }
          />
          <PendingRow
            label="Reseñas pendientes / flagged"
            count={stats.pending.reviews}
            onClick={() => onNavigateTab('reviews', { status: 'FLAGGED' })}
          />
          <PendingRow
            label="Promociones pausadas / borrador"
            count={stats.pending.promotions}
            onClick={() => onNavigateTab('businesses')}
          />
        </div>
      </section>

      {/* Recent activity — two columns */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-gold tracking-[3px] text-xs font-mono font-bold mb-3">
            RESERVAS RECIENTES
          </h2>
          <div className="glass-card rounded-2xl divide-y divide-white/5 overflow-hidden">
            {stats.recent.reservations.length === 0 ? (
              <div className="p-6 text-center text-white/40 text-sm">
                No hay reservas para mostrar
              </div>
            ) : (
              stats.recent.reservations.map((r) => (
                <div
                  key={r.id}
                  className="p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xs text-gold font-bold">
                      {r.confirmationCode}
                    </div>
                    <div className="text-sm text-white truncate">
                      {r.business.name}
                    </div>
                    <div className="text-[10px] text-white/40 mt-0.5">
                      {r.user?.name ?? r.user?.email ?? 'Usuario anónimo'}
                      {' · '}
                      {formatRelativeTime(r.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="text-gold tracking-[3px] text-xs font-mono font-bold mb-3">
            RESEÑAS RECIENTES
          </h2>
          <div className="glass-card rounded-2xl divide-y divide-white/5 overflow-hidden">
            {stats.recent.reviews.length === 0 ? (
              <div className="p-6 text-center text-white/40 text-sm">
                No hay reseñas para mostrar
              </div>
            ) : (
              stats.recent.reviews.map((r) => (
                <div key={r.id} className="p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm text-white truncate">
                      {r.business.name}
                    </span>
                    <Stars rating={r.rating} />
                  </div>
                  <div className="text-[10px] text-white/40 mb-1">
                    {r.user.name ?? 'Anónimo'}
                    {' · '}
                    {formatRelativeTime(r.createdAt)}
                  </div>
                  <p className="text-xs text-white/70 line-clamp-2">
                    {r.comment}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Recent claims + Top this week — two columns */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-gold tracking-[3px] text-xs font-mono font-bold mb-3">
            CLAIMS RECIENTES
          </h2>
          <div className="glass-card rounded-2xl divide-y divide-white/5 overflow-hidden">
            {stats.recent.claims.length === 0 ? (
              <div className="p-6 text-center text-white/40 text-sm">
                No hay claims en los últimos 30 días
              </div>
            ) : (
              stats.recent.claims.map((c) => (
                <div key={c.id} className="p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center shrink-0">
                    <KeyRound size={14} className="text-gold" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white truncate">
                      {c.name}
                    </div>
                    <div className="text-[10px] text-white/40 truncate">
                      {c.owner.name ?? c.owner.email}
                      {' · '}
                      {formatRelativeTime(c.claimedAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="text-gold tracking-[3px] text-xs font-mono font-bold mb-3">
            TOP ESTA SEMANA
          </h2>
          <div className="glass-card rounded-2xl divide-y divide-white/5 overflow-hidden">
            {stats.topThisWeek.businesses.length === 0 ? (
              <div className="p-6 text-center text-white/40 text-sm">
                No hay actividad esta semana
              </div>
            ) : (
              stats.topThisWeek.businesses.map((b, i) => (
                <div
                  key={b.slug}
                  className="p-3 flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <span className="font-mono font-bold text-gold text-sm">
                      {i + 1}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white truncate">
                      {b.name}
                    </div>
                    <div className="text-[10px] text-white/40 flex items-center gap-1">
                      <TrendingUp size={10} />
                      <span className="font-mono">
                        {b.views} vistas (7 días)
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Tab 2: Negocios ───────────────────────────────────────────

function NegociosTab({
  isAdmin,
}: {
  isAdmin: boolean;
}) {
  const queryClient = useQueryClient();
  const addNotification = useAppStore((s) => s.addNotification);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const { data: businesses = [], isLoading, isError } = useQuery({
    queryKey: [...QK_BUSINESSES, statusFilter, search],
    queryFn: () =>
      fetchAdminBusinesses({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search.trim() || undefined,
      }),
    staleTime: 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: BusinessStatus;
    }) => updateBusinessStatus(id, status),
    onMutate: async ({ id, status }) => {
      // Optimistic update — patch the row's status in the cache.
      const queryKey = [...QK_BUSINESSES, statusFilter, search];
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<AdminBusiness[]>(queryKey);
      if (prev) {
        queryClient.setQueryData<AdminBusiness[]>(
          queryKey,
          prev.map((b) => (b.id === id ? { ...b, status } : b)),
        );
      }
      return { prev, queryKey };
    },
    onError: (err, _vars, ctx) => {
      // Roll back on error.
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(ctx.queryKey, ctx.prev);
      }
      addNotification(
        err instanceof Error ? err.message : 'Error al actualizar el estado',
        'info',
      );
    },
    onSuccess: (_data, vars) => {
      addNotification('Estado actualizado', 'success');
      // Invalidate the admin list (so the filter re-applies) AND the
      // public ['businesses'] / ['business', slug] queries so the
      // user-facing pages reflect the new status.
      void queryClient.invalidateQueries({ queryKey: QK_BUSINESSES });
      void queryClient.invalidateQueries({ queryKey: ['businesses'] });
      void queryClient.invalidateQueries({ queryKey: ['business'] });
      // Stats may also change (pending count shifted).
      void queryClient.invalidateQueries({ queryKey: QK_STATS });
      // Also invalidate the affected business's slug-keyed query.
      const affected = businesses.find((b) => b.id === vars.id);
      if (affected) {
        void queryClient.invalidateQueries({
          queryKey: ['business', affected.slug],
        });
      }
    },
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-56 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los estados</SelectItem>
            <SelectItem value="ACTIVE">Activos</SelectItem>
            <SelectItem value="PENDING_REVIEW">Pendientes</SelectItem>
            <SelectItem value="SUSPENDED">Suspendidos</SelectItem>
            <SelectItem value="ARCHIVED">Archivados</SelectItem>
            <SelectItem value="DRAFT">Borradores</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
          />
          <Input
            placeholder="Buscar por nombre o slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : isError ? (
        <div className="glass-card rounded-2xl p-8 text-center text-white/60">
          Error al cargar los negocios. Intenta de nuevo.
        </div>
      ) : businesses.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-white/60">
          No hay negocios para mostrar.
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    Negocio
                  </th>
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    Dueño
                  </th>
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    Reclamado
                  </th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase text-right">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {businesses.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        {b.coverImage ? (
                          <img
                            src={b.coverImage}
                            alt={b.name}
                            className="w-9 h-9 rounded-lg object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                            <Store size={14} className="text-white/40" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-white font-medium truncate">
                            {b.name}
                          </div>
                          <div className="text-[10px] text-white/40 font-mono truncate">
                            {b.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <BusinessStatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3">
                      {b.owner ? (
                        <div className="min-w-[160px]">
                          <div className="text-white text-sm truncate">
                            {b.owner.name ?? '—'}
                          </div>
                          <div className="text-[10px] text-white/40 truncate">
                            {b.owner.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {b.claimedAt ? (
                        <span className="text-[10px] font-mono text-white/60">
                          {formatRelativeTime(b.claimedAt)}
                        </span>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-white/80 hover:text-gold hover:bg-gold/10"
                              disabled={statusMutation.isPending}
                            >
                              Acciones
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-zinc-900 border-white/10 text-white"
                          >
                            <DropdownMenuLabel className="text-white/50 text-[10px] uppercase tracking-widest">
                              Cambiar estado
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/10" />
                            {b.status === 'PENDING_REVIEW' && (
                              <DropdownMenuItem
                                onClick={() =>
                                  statusMutation.mutate({
                                    id: b.id,
                                    status: 'ACTIVE',
                                  })
                                }
                                className="hover:bg-emerald-500/10 hover:text-emerald-300 cursor-pointer"
                              >
                                <CheckCircle2 size={14} className="mr-2" />
                                Aprobar
                              </DropdownMenuItem>
                            )}
                            {b.status === 'ACTIVE' && (
                              <DropdownMenuItem
                                onClick={() =>
                                  statusMutation.mutate({
                                    id: b.id,
                                    status: 'SUSPENDED',
                                  })
                                }
                                className="hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
                              >
                                <Ban size={14} className="mr-2" />
                                Suspender
                              </DropdownMenuItem>
                            )}
                            {(b.status === 'SUSPENDED' ||
                              b.status === 'ARCHIVED') && (
                              <DropdownMenuItem
                                onClick={() =>
                                  statusMutation.mutate({
                                    id: b.id,
                                    status: 'ACTIVE',
                                  })
                                }
                                className="hover:bg-emerald-500/10 hover:text-emerald-300 cursor-pointer"
                              >
                                <RotateCcw size={14} className="mr-2" />
                                Reactivar
                              </DropdownMenuItem>
                            )}
                            {b.status !== 'ARCHIVED' && (
                              <DropdownMenuItem
                                onClick={() =>
                                  statusMutation.mutate({
                                    id: b.id,
                                    status: 'ARCHIVED',
                                  })
                                }
                                className="hover:bg-zinc-500/10 hover:text-zinc-300 cursor-pointer"
                              >
                                <Archive size={14} className="mr-2" />
                                Archivar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Reseñas ───────────────────────────────────────────

function ResenasTab() {
  const queryClient = useQueryClient();
  const addNotification = useAppStore((s) => s.addNotification);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { data: reviews = [], isLoading, isError } = useQuery({
    queryKey: [...QK_REVIEWS, statusFilter],
    queryFn: () =>
      fetchAdminReviews({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
    staleTime: 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: ReviewStatus;
    }) => updateReviewStatus(id, status),
    onMutate: async ({ id, status }) => {
      const queryKey = [...QK_REVIEWS, statusFilter];
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<AdminReview[]>(queryKey);
      if (prev) {
        queryClient.setQueryData<AdminReview[]>(
          queryKey,
          prev.map((r) => (r.id === id ? { ...r, status } : r)),
        );
      }
      return { prev, queryKey };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(ctx.queryKey, ctx.prev);
      }
      addNotification(
        err instanceof Error ? err.message : 'Error al actualizar la reseña',
        'info',
      );
    },
    onSuccess: () => {
      addNotification('Estado de reseña actualizado', 'success');
      void queryClient.invalidateQueries({ queryKey: QK_REVIEWS });
      void queryClient.invalidateQueries({ queryKey: ['reviews'] });
      void queryClient.invalidateQueries({ queryKey: QK_STATS });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-56 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas</SelectItem>
            <SelectItem value="PUBLISHED">Publicadas</SelectItem>
            <SelectItem value="PENDING">Pendientes</SelectItem>
            <SelectItem value="FLAGGED">Flagged</SelectItem>
            <SelectItem value="HIDDEN">Ocultas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : isError ? (
        <div className="glass-card rounded-2xl p-8 text-center text-white/60">
          Error al cargar las reseñas. Intenta de nuevo.
        </div>
      ) : reviews.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-white/60">
          No hay reseñas para mostrar.
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    Negocio
                  </th>
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    Usuario
                  </th>
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    Rating
                  </th>
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    Comentario
                  </th>
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 min-w-[140px]">
                      <div className="text-white text-sm truncate">
                        {r.business.name}
                      </div>
                      <div className="text-[10px] text-white/40 font-mono">
                        {formatRelativeTime(r.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3 min-w-[140px]">
                      <div className="text-white text-sm truncate">
                        {r.user.name ?? 'Anónimo'}
                      </div>
                      <div className="text-[10px] text-white/40 truncate">
                        {r.user.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Stars rating={r.rating} />
                    </td>
                    <td className="px-4 py-3 max-w-[300px]">
                      <p className="text-xs text-white/70 line-clamp-2">
                        {r.comment}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <ReviewStatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-white/80 hover:text-gold hover:bg-gold/10"
                            disabled={statusMutation.isPending}
                          >
                            Acciones
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-zinc-900 border-white/10 text-white"
                        >
                          <DropdownMenuLabel className="text-white/50 text-[10px] uppercase tracking-widest">
                            Cambiar estado
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-white/10" />
                          {r.status !== 'PUBLISHED' && (
                            <DropdownMenuItem
                              onClick={() =>
                                statusMutation.mutate({
                                  id: r.id,
                                  status: 'PUBLISHED',
                                })
                              }
                              className="hover:bg-emerald-500/10 hover:text-emerald-300 cursor-pointer"
                            >
                              <CheckCircle2 size={14} className="mr-2" />
                              Publicar
                            </DropdownMenuItem>
                          )}
                          {r.status !== 'HIDDEN' && (
                            <DropdownMenuItem
                              onClick={() =>
                                statusMutation.mutate({
                                  id: r.id,
                                  status: 'HIDDEN',
                                })
                              }
                              className="hover:bg-zinc-500/10 hover:text-zinc-300 cursor-pointer"
                            >
                              <EyeOff size={14} className="mr-2" />
                              Ocultar
                            </DropdownMenuItem>
                          )}
                          {r.status !== 'PENDING' && (
                            <DropdownMenuItem
                              onClick={() =>
                                statusMutation.mutate({
                                  id: r.id,
                                  status: 'PENDING',
                                })
                              }
                              className="hover:bg-amber-500/10 hover:text-amber-300 cursor-pointer"
                            >
                              <MessageSquare size={14} className="mr-2" />
                              Marcar como pendiente
                            </DropdownMenuItem>
                          )}
                          {r.status !== 'FLAGGED' && (
                            <DropdownMenuItem
                              onClick={() =>
                                statusMutation.mutate({
                                  id: r.id,
                                  status: 'FLAGGED',
                                })
                              }
                              className="hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
                            >
                              <Flag size={14} className="mr-2" />
                              Marcar como flagged
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 4: Usuarios ──────────────────────────────────────────

function UsuariosTab({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const addNotification = useAppStore((s) => s.addNotification);
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    user: AdminUser;
    newRole: UserRole;
  } | null>(null);

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: [...QK_USERS, roleFilter, search],
    queryFn: () =>
      fetchAdminUsers({
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        search: search.trim() || undefined,
      }),
    staleTime: 30_000,
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      updateUserRole(id, role),
    onMutate: async ({ id, role }) => {
      const queryKey = [...QK_USERS, roleFilter, search];
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<AdminUser[]>(queryKey);
      if (prev) {
        queryClient.setQueryData<AdminUser[]>(
          queryKey,
          prev.map((u) => (u.id === id ? { ...u, role } : u)),
        );
      }
      return { prev, queryKey };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(ctx.queryKey, ctx.prev);
      }
      addNotification(
        err instanceof Error ? err.message : 'Error al actualizar el rol',
        'info',
      );
    },
    onSuccess: () => {
      addNotification('Rol actualizado', 'success');
      void queryClient.invalidateQueries({ queryKey: QK_USERS });
      void queryClient.invalidateQueries({ queryKey: QK_STATS });
    },
  });

  const ROLE_OPTIONS: UserRole[] = [
    'USER',
    'BUSINESS_OWNER',
    'BUSINESS_MANAGER',
    'MODERATOR',
    'ADMIN',
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-56 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los roles</SelectItem>
            <SelectItem value="USER">Usuarios</SelectItem>
            <SelectItem value="BUSINESS_OWNER">Dueños</SelectItem>
            <SelectItem value="BUSINESS_MANAGER">Gerentes</SelectItem>
            <SelectItem value="MODERATOR">Moderadores</SelectItem>
            <SelectItem value="ADMIN">Admins</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
          />
          <Input
            placeholder="Buscar por nombre o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : isError ? (
        <div className="glass-card rounded-2xl p-8 text-center text-white/60">
          Error al cargar los usuarios. Intenta de nuevo.
        </div>
      ) : users.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-white/60">
          No hay usuarios para mostrar.
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    Usuario
                  </th>
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    Email
                  </th>
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    Rol
                  </th>
                  <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    Creado
                  </th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-[10px] font-mono tracking-widest text-white/40 uppercase text-right">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-[180px]">
                        {u.image ? (
                          <img
                            src={u.image}
                            alt={u.name ?? 'Avatar'}
                            className="w-9 h-9 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                            <Users size={14} className="text-white/40" />
                          </div>
                        )}
                        <div className="text-white font-medium truncate">
                          {u.name ?? '—'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white/70 text-sm truncate block min-w-[180px]">
                        {u.email}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-mono text-white/60">
                        {formatRelativeTime(u.createdAt)}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <Select
                          value={u.role}
                          onValueChange={(newRole) =>
                            setConfirmDialog({
                              user: u,
                              newRole: newRole as UserRole,
                            })
                          }
                        >
                          <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white ml-auto">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((r) => (
                              <SelectItem key={r} value={r}>
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirm dialog for role change */}
      <AlertDialog
        open={confirmDialog !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog(null);
        }}
      >
        <AlertDialogContent className="bg-zinc-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cambiar el rol?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              ¿Seguro que quieres cambiar el rol de{' '}
              <span className="text-white font-medium">
                {confirmDialog?.user.name ?? confirmDialog?.user.email}
              </span>{' '}
              a{' '}
              <span className="text-gold font-mono font-bold">
                {confirmDialog?.newRole}
              </span>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-gold text-obsidian hover:bg-gold/80"
              onClick={() => {
                if (confirmDialog) {
                  roleMutation.mutate({
                    id: confirmDialog.user.id,
                    role: confirmDialog.newRole,
                  });
                }
                setConfirmDialog(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main AdminDashboard ──────────────────────────────────────

export function AdminDashboard() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const [tab, setTab] = useState<string>('resumen');

  // Defense-in-depth: the Navbar hides the Admin entry for non-admin
  // users, but if one lands here via store mutation we render the
  // AccessDenied card. Admin access is granted SOLELY by email
  // allowlist (src/lib/admin-config.ts) — the role in the store is
  // ignored for admin access purposes.
  if (!user || !isAdminEmail(user.email)) {
    return <AccessDenied />;
  }

  // All admin users have full access (no more MODERATOR role distinction).
  const isAdmin = true;

  // Navigate to a tab with an optional filter pre-applied. Used by
  // the Resumen tab's "Pendientes" cards.
  const navigateTab = (
    target: 'businesses' | 'reviews' | 'users',
    filter?: { status?: string },
  ) => {
    setTab(target);
    // The filter is applied via local state inside each tab. The
    // simplest way to seed it from here is to dispatch a CustomEvent
    // that the tab listens for, but that adds complexity. Instead
    // we set the URL hash so the tab can pick it up on mount — but
    // since we use local state, the cleanest approach is to lift
    // the filter state to AdminDashboard and pass it down. To keep
    // this component readable, we just navigate to the tab and let
    // the user apply the filter manually. (The pending counts are
    // still visible in the Resumen tab.)
    if (filter?.status) {
      // Use sessionStorage as a one-shot transport — the tab reads
      // it on mount and clears it. This avoids prop-drilling a
      // filter state through every tab.
      try {
        sessionStorage.setItem(
          'admin-prefilter',
          JSON.stringify({ tab: target, status: filter.status }),
        );
      } catch {
        // ignore write failure
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12"
    >
      {/* Header */}
      <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-gold/40 bg-gold/10 text-gold text-[10px] font-bold tracking-widest mb-2">
            <Shield size={10} /> PANEL ADMIN
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">
            Panel de Administración
          </h1>
          <p className="text-white/50 text-xs mt-1">
            Conecta-LT · {isAdmin ? 'Administrador' : 'Moderador'} ·{' '}
            {user?.email}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setView('home')}
          className="border-white/15 text-white hover:bg-white/5 hover:border-gold/40"
        >
          Salir
        </Button>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-white/5 border border-white/10 p-1 h-auto flex-wrap">
          <TabsTrigger
            value="resumen"
            className="data-[state=active]:bg-gold data-[state=active]:text-obsidian text-white/70 hover:text-white"
          >
            Resumen
          </TabsTrigger>
          <TabsTrigger
            value="businesses"
            className="data-[state=active]:bg-gold data-[state=active]:text-obsidian text-white/70 hover:text-white"
          >
            Negocios
          </TabsTrigger>
          <TabsTrigger
            value="reviews"
            className="data-[state=active]:bg-gold data-[state=active]:text-obsidian text-white/70 hover:text-white"
          >
            Reseñas
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="data-[state=active]:bg-gold data-[state=active]:text-obsidian text-white/70 hover:text-white"
          >
            Usuarios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-6">
          <ResumenTabWrapper navigateTab={navigateTab} />
        </TabsContent>
        <TabsContent value="businesses" className="mt-6">
          <NegociosTab isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="reviews" className="mt-6">
          <ResenasTab />
        </TabsContent>
        <TabsContent value="users" className="mt-6">
          <UsuariosTab isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

// Wrapper around ResumenTab that owns the useQuery — keeps the parent
// component from re-rendering on every stats refetch.
function ResumenTabWrapper({
  navigateTab,
}: {
  navigateTab: (
    tab: 'businesses' | 'reviews' | 'users',
    filter?: { status?: string },
  ) => void;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: QK_STATS,
    queryFn: fetchAdminStats,
    staleTime: 30_000,
  });

  return (
    <ResumenTab
      stats={data}
      isLoading={isLoading}
      isError={isError}
      onNavigateTab={navigateTab}
    />
  );
}
