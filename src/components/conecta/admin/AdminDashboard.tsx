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
  BarChart3,
  UserPlus,
  Check,
  X,
  FileText,
  Clock,
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
  assignOwner,
  approveOwner,
  rejectOwner,
  fetchBusinessProposals,
  reviewProposal,
  migrateOwnership,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { AdminMetricsTab } from '@/components/conecta/admin/AdminMetricsTab';

// Query keys — kept here (rather than in a dedicated hooks file)
// because they're only consumed by this component. If a future
// iteration surfaces admin data elsewhere, lift them to a shared
// module.
const QK_STATS = ['admin', 'stats'] as const;
const QK_BUSINESSES = ['admin', 'businesses'] as const;
const QK_REVIEWS = ['admin', 'reviews'] as const;
const QK_USERS = ['admin', 'users'] as const;

// Extended admin business type — includes owner management fields
// that exist on the Prisma model but aren't yet in the public AdminBusiness
// interface. Once the admin GET /businesses endpoint is updated to
// include these, the type assertion can be removed.
type AdminBusinessExt = AdminBusiness & {
  ownerStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  proposedOwner?: { id: string; name: string | null; email: string } | null;
  proposedOwnerId?: string | null;
};

// Proposal field → friendly label
const PROPOSAL_FIELD_LABELS: Record<string, string> = {
  INFO: 'Información general',
  HOURS: 'Horarios',
  SOCIALS: 'Redes sociales',
  PROMOTION: 'Promoción',
  NEW_PROMOTION: 'Nueva promoción',
};

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

// ─── Owner status badge ──────────────────────────────────────
function OwnerStatusBadge({ business }: { business: AdminBusinessExt }) {
  const status = business.ownerStatus;

  if (status === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest border bg-amber-500/15 text-amber-300 border-amber-500/30">
        <Clock size={10} />
        Dueño pendiente
      </span>
    );
  }
  if (status === 'APPROVED' && business.ownerId) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
        <CheckCircle2 size={10} />
        {business.owner?.email ?? 'Aprobado'}
      </span>
    );
  }
  if (status === 'REJECTED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest border bg-red-500/15 text-red-300 border-red-500/30">
        <X size={10} />
        Rechazado
      </span>
    );
  }
  // No owner status or APPROVED without ownerId
  if (business.owner) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
        <CheckCircle2 size={10} />
        {business.owner.email}
      </span>
    );
  }
  return <span className="text-white/30 text-xs">Sin dueño asignado</span>;
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

// ─── Proposals Dialog ──────────────────────────────────────

interface Proposal {
  id: string;
  field: string;
  data: string;
  status: string;
  createdAt: string;
  proposer: { name: string | null; email: string };
}

function ProposalsDialog({
  open,
  onOpenChange,
  slug,
  businessName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  businessName: string;
}) {
  const queryClient = useQueryClient();
  const addNotification = useAppStore((s) => s.addNotification);

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['admin', 'proposals', slug],
    queryFn: () => fetchBusinessProposals(slug),
    enabled: open && !!slug,
    staleTime: 30_000,
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      proposalId,
      action,
    }: {
      proposalId: string;
      action: 'approve' | 'reject';
    }) => reviewProposal(proposalId, action),
    onSuccess: (_data, vars) => {
      addNotification(
        vars.action === 'approve'
          ? 'Propuesta aprobada'
          : 'Propuesta rechazada',
        'success',
      );
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'proposals', slug],
      });
      void queryClient.invalidateQueries({ queryKey: QK_BUSINESSES });
    },
    onError: (err) => {
      addNotification(
        err instanceof Error ? err.message : 'Error al revisar propuesta',
        'info',
      );
    },
  });

  const pendingProposals = proposals.filter(
    (p: Proposal) => p.status === 'PENDING',
  );
  const reviewedProposals = proposals.filter(
    (p: Proposal) => p.status !== 'PENDING',
  );

  function truncateJson(data: string, max = 200): string {
    try {
      const formatted = JSON.stringify(JSON.parse(data), null, 2);
      return formatted.length > max
        ? formatted.slice(0, max) + '…'
        : formatted;
    } catch {
      return data.length > max ? data.slice(0, max) + '…' : data;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white">Propuestas de contenido</DialogTitle>
          <DialogDescription className="text-white/60">
            <span className="text-gold font-medium">{businessName}</span>
            {pendingProposals.length > 0 && (
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-widest bg-amber-500/15 text-amber-300 border border-amber-500/30">
                {pendingProposals.length} pendiente{pendingProposals.length > 1 ? 's' : ''}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-3">
          {isLoading ? (
            <TableSkeleton rows={3} />
          ) : proposals.length === 0 ? (
            <div className="glass-card p-4 rounded-xl border border-white/5 text-center text-white/40 text-sm py-8">
              No hay propuestas para este negocio.
            </div>
          ) : (
            <>
              {pendingProposals.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-mono tracking-widest text-amber-400 uppercase">
                    Pendientes de revisión
                  </h3>
                  {pendingProposals.map((p: Proposal) => (
                    <div
                      key={p.id}
                      className="glass-card p-4 rounded-xl border border-white/5 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-gold/30 text-gold text-[10px] font-mono"
                          >
                            {PROPOSAL_FIELD_LABELS[p.field] ?? p.field}
                          </Badge>
                          <span className="text-[10px] text-white/40">
                            {formatRelativeTime(p.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                            onClick={() =>
                              reviewMutation.mutate({
                                proposalId: p.id,
                                action: 'approve',
                              })
                            }
                            disabled={reviewMutation.isPending}
                          >
                            <Check size={12} className="mr-1" />
                            Aprobar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] text-red-400 hover:bg-red-500/10 hover:text-red-300"
                            onClick={() =>
                              reviewMutation.mutate({
                                proposalId: p.id,
                                action: 'reject',
                              })
                            }
                            disabled={reviewMutation.isPending}
                          >
                            <X size={12} className="mr-1" />
                            Rechazar
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-white/70">
                        <span className="text-white/50">Por: </span>
                        {p.proposer.name ?? '—'}{' '}
                        <span className="text-white/40">({p.proposer.email})</span>
                      </div>
                      <pre className="text-[10px] font-mono text-white/40 bg-white/5 rounded-lg p-2 overflow-x-auto max-h-24">
                        {truncateJson(p.data)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}

              {reviewedProposals.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    Revisadas
                  </h3>
                  {reviewedProposals.map((p: Proposal) => (
                    <div
                      key={p.id}
                      className="glass-card p-4 rounded-xl border border-white/5 opacity-60 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-white/10 text-white/50 text-[10px] font-mono"
                          >
                            {PROPOSAL_FIELD_LABELS[p.field] ?? p.field}
                          </Badge>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-widest border ${
                              p.status === 'APPROVED'
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-red-500/15 text-red-300 border-red-500/30'
                            }`}
                          >
                            {p.status === 'APPROVED' ? 'APROBADA' : 'RECHAZADA'}
                          </span>
                        </div>
                        <span className="text-[10px] text-white/30">
                          {formatRelativeTime(p.createdAt)}
                        </span>
                      </div>
                      <div className="text-[10px] text-white/40">
                        {p.proposer.name ?? '—'} ({p.proposer.email})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tab 2: Negocios ───────────────────────────────────────────

function NegociosTab({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const addNotification = useAppStore((s) => s.addNotification);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [assignDialog, setAssignDialog] = useState<{
    slug: string;
    name: string;
  } | null>(null);
  const [assignEmail, setAssignEmail] = useState('');
  const [proposalsDialog, setProposalsDialog] = useState<{
    slug: string;
    name: string;
  } | null>(null);

  const { data: businesses = [], isLoading, isError } = useQuery({
    queryKey: [...QK_BUSINESSES, statusFilter, search],
    queryFn: () =>
      fetchAdminBusinesses({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search.trim() || undefined,
      }),
    staleTime: 30_000,
  });

  const extBusinesses = businesses as AdminBusinessExt[];

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BusinessStatus }) =>
      updateBusinessStatus(id, status),
    onMutate: async ({ id, status }) => {
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
      void queryClient.invalidateQueries({ queryKey: QK_BUSINESSES });
      void queryClient.invalidateQueries({ queryKey: ['businesses'] });
      void queryClient.invalidateQueries({ queryKey: ['business'] });
      void queryClient.invalidateQueries({ queryKey: QK_STATS });
      const affected = businesses.find((b) => b.id === vars.id);
      if (affected) {
        void queryClient.invalidateQueries({
          queryKey: ['business', affected.slug],
        });
      }
    },
  });

  // Owner management mutations
  const assignOwnerMutation = useMutation({
    mutationFn: ({ slug, email }: { slug: string; email: string }) =>
      assignOwner(slug, email),
    onSuccess: () => {
      addNotification('Dueño propuesto correctamente', 'success');
      setAssignDialog(null);
      setAssignEmail('');
      void queryClient.invalidateQueries({ queryKey: QK_BUSINESSES });
    },
    onError: (err) => {
      addNotification(
        err instanceof Error ? err.message : 'Error al asignar dueño',
        'info',
      );
    },
  });

  const approveOwnerMutation = useMutation({
    mutationFn: (slug: string) => approveOwner(slug),
    onSuccess: () => {
      addNotification('Dueño aprobado', 'success');
      void queryClient.invalidateQueries({ queryKey: QK_BUSINESSES });
    },
    onError: (err) => {
      addNotification(
        err instanceof Error ? err.message : 'Error al aprobar dueño',
        'info',
      );
    },
  });

  const rejectOwnerMutation = useMutation({
    mutationFn: (slug: string) => rejectOwner(slug),
    onSuccess: () => {
      addNotification('Propuesta de dueño rechazada', 'success');
      void queryClient.invalidateQueries({ queryKey: QK_BUSINESSES });
    },
    onError: (err) => {
      addNotification(
        err instanceof Error ? err.message : 'Error al rechazar dueño',
        'info',
      );
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
                {extBusinesses.map((b) => (
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
                      <div className="flex flex-col gap-1.5 min-w-[180px]">
                        <OwnerStatusBadge business={b} />
                        {isAdmin && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {!b.proposedOwnerId && b.ownerStatus !== 'PENDING' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px] text-gold hover:bg-gold/10 hover:text-gold"
                                onClick={() =>
                                  setAssignDialog({ slug: b.slug, name: b.name })
                                }
                              >
                                <UserPlus size={11} className="mr-1" />
                                Asignar
                              </Button>
                            )}
                            {b.ownerStatus === 'PENDING' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-[10px] text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                                  onClick={() => approveOwnerMutation.mutate(b.slug)}
                                  disabled={approveOwnerMutation.isPending}
                                >
                                  <Check size={11} className="mr-1" />
                                  Aprobar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-[10px] text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                  onClick={() => rejectOwnerMutation.mutate(b.slug)}
                                  disabled={rejectOwnerMutation.isPending}
                                >
                                  <X size={11} className="mr-1" />
                                  Rechazar
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
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
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-white/60 hover:text-gold hover:bg-gold/10"
                            onClick={() =>
                              setProposalsDialog({ slug: b.slug, name: b.name })
                            }
                            title="Ver propuestas"
                          >
                            <FileText size={14} />
                          </Button>
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
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Owner Dialog */}
      <Dialog
        open={assignDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAssignDialog(null);
            setAssignEmail('');
          }
        }}
      >
        <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Asignar dueño</DialogTitle>
            <DialogDescription className="text-white/60">
              Propone un dueño para{' '}
              <span className="text-gold font-medium">{assignDialog?.name}</span>.
              El usuario deberá ser aprobado después.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-[10px] font-mono tracking-widest text-white/40 uppercase block mb-1.5">
              Email del usuario
            </label>
            <Input
              type="email"
              placeholder="usuario@ejemplo.com"
              value={assignEmail}
              onChange={(e) => setAssignEmail(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && assignDialog && assignEmail.trim()) {
                  assignOwnerMutation.mutate({
                    slug: assignDialog.slug,
                    email: assignEmail.trim(),
                  });
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-white/15 text-white hover:bg-white/5"
              onClick={() => {
                setAssignDialog(null);
                setAssignEmail('');
              }}
            >
              Cancelar
            </Button>
            <Button
              className="bg-gold text-obsidian hover:bg-gold/80"
              disabled={!assignEmail.trim() || assignOwnerMutation.isPending}
              onClick={() => {
                if (assignDialog) {
                  assignOwnerMutation.mutate({
                    slug: assignDialog.slug,
                    email: assignEmail.trim(),
                  });
                }
              }}
            >
              {assignOwnerMutation.isPending ? 'Asignando…' : 'Asignar Dueño'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proposals Dialog */}
      <ProposalsDialog
        open={proposalsDialog !== null}
        onOpenChange={(open) => {
          if (!open) setProposalsDialog(null);
        }}
        slug={proposalsDialog?.slug ?? ''}
        businessName={proposalsDialog?.name ?? ''}
      />
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

// ─── Tab 6: Propuestas ───────────────────────────────────────

function PropuestasTab() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: QK_BUSINESSES,
    queryFn: () => fetchAdminBusinesses(),
    staleTime: 30_000,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-gold tracking-[3px] text-xs font-mono font-bold">
        PROPUESTAS DE CONTENIDO
      </h2>
      <p className="text-white/50 text-sm">
        Selecciona un negocio para ver y revisar las propuestas de cambios de contenido.
      </p>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
          {businesses.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedSlug(b.slug)}
              className={`glass-card p-4 rounded-xl border text-left transition-colors ${
                selectedSlug === b.slug
                  ? 'border-gold/40 bg-gold/5'
                  : 'border-white/5 hover:border-gold/20'
              }`}
            >
              <div className="flex items-center gap-3">
                {b.coverImage ? (
                  <img
                    src={b.coverImage}
                    alt={b.name}
                    className="w-8 h-8 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Store size={12} className="text-white/40" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm text-white font-medium truncate">
                    {b.name}
                  </div>
                  <div className="text-[10px] text-white/40 font-mono truncate">
                    {b.slug}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedSlug && (
        <ProposalsDialog
          open={!!selectedSlug}
          onOpenChange={(open) => {
            if (!open) setSelectedSlug(null);
          }}
          slug={selectedSlug}
          businessName={
            businesses.find((b) => b.slug === selectedSlug)?.name ?? ''
          }
        />
      )}
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
        <div className="flex items-center gap-2">
          <MigrateOwnershipButton />
          <Button
            variant="outline"
            onClick={() => setView('home')}
            className="border-white/15 text-white hover:bg-white/5 hover:border-gold/40"
          >
            Salir
          </Button>
        </div>
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
          <TabsTrigger
            value="metrics"
            className="data-[state=active]:bg-gold data-[state=active]:text-obsidian text-white/70 hover:text-white"
          >
            <BarChart3 size={14} className="mr-1.5" />
            Métricas
          </TabsTrigger>
          <TabsTrigger
            value="proposals"
            className="data-[state=active]:bg-gold data-[state=active]:text-obsidian text-white/70 hover:text-white"
          >
            <FileText size={14} className="mr-1.5" />
            Propuestas
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
        <TabsContent value="metrics" className="mt-6">
          <AdminMetricsTab />
        </TabsContent>
        <TabsContent value="proposals" className="mt-6">
          <PropuestasTab />
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

// ─── MigrateOwnershipButton ───────────────────────────────────
// One-time action: assigns the admin as owner of all businesses
// that currently have no ownerId. Safe to click multiple times —
// only businesses with ownerId === null get updated.
//
// Shows a confirmation dialog → calls /api/admin/businesses/migrate-ownership
// → displays the count of businesses migrated.
function MigrateOwnershipButton() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{ count: number } | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: migrateOwnership,
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['admin', 'businesses'] });
      queryClient.invalidateQueries({ queryKey: QK_STATS });
    },
  });

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setResult(null);
          setOpen(true);
        }}
        className="border-gold/40 text-gold hover:bg-gold/10 hover:border-gold/60"
      >
        <UserPlus size={14} className="mr-1.5" />
        Migrar Dueños
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-obsidian border-gold/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-white">
              Migrar Dueños de Negocios
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Esta acción te asigna como dueño de todos los negocios que
              actualmente no tienen dueño. Es segura de ejecutar múltiples
              veces — solo afecta negocios sin ownerId.
            </DialogDescription>
          </DialogHeader>

          {result ? (
            <div className="py-4 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="text-emerald-300" size={24} />
              </div>
              <p className="text-white text-sm">
                {result.count === 0
                  ? 'Todos los negocios ya tienen dueño asignado.'
                  : `Se te asignó como dueño de ${result.count} negocio(s).`}
              </p>
              <Button
                onClick={() => setOpen(false)}
                className="mt-4 bg-gold text-obsidian hover:bg-gold/80"
              >
                Listo
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={mutation.isPending}
                className="border-white/15 text-white hover:bg-white/5 flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
                className="bg-gold text-obsidian hover:bg-gold/80 flex-1"
              >
                {mutation.isPending
                  ? 'Migrando...'
                  : 'Confirmar Migración'}
              </Button>
            </div>
          )}

          {mutation.isError && (
            <p className="text-red-400 text-xs mt-2 text-center">
              Error: {(mutation.error as Error)?.message || 'desconocido'}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
