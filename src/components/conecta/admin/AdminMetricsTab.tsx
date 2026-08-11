'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — AdminMetricsTab (Etapa 8.A)
//
// The "Métricas" tab of the AdminDashboard. Shows real interaction
// metrics from the AnalyticsEvent table:
//
//   1. KPI cards   — one per event type (views, whatsapp, instagram,
//                    maps, searches, reserves, redemptions, capacity).
//   2. Line chart  — daily time series for the selected range, one
//                    line per event type (toggleable via legend click).
//   3. Top 10 WhatsApp — businesses ranked by WhatsApp clicks.
//   4. Top 10 Views    — businesses ranked by profile views.
//   5. Top searches    — most frequent search queries.
//   6. Recent feed     — last 50 events with business + user info.
//
// Range filter: 1d / 7d / 30d / 90d. All data fetched in a single
// GET /api/admin/analytics/overview request and cached for 60s
// (shorter than other admin tabs because metrics are live).
//
// Charts: Recharts (already installed for OwnerDashboard).
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Eye,
  MessageCircle,
  Instagram,
  MapPin,
  Search,
  CalendarPlus,
  Ticket,
  Users,
  Activity,
  TrendingUp,
  Clock,
} from 'lucide-react';
import {
  fetchAdminAnalytics,
} from '@/lib/api';
import type { AnalyticsRange, AdminAnalyticsOverview } from '@/lib/types';
import { formatRelativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

// ─── Event type metadata ──────────────────────────────────────
// Central definition of how each event type is displayed: label,
// icon, color (for chart line + KPI accent). Adding a new tracked
// event type only requires extending ANALYTICS_EVENT_TYPES in the
// analytics service + adding an entry here.
type EventMeta = {
  type: string;
  label: string;
  icon: typeof Eye;
  color: string; // hex, used for chart line + KPI accent
};

const EVENT_META: EventMeta[] = [
  { type: 'BUSINESS_VIEW', label: 'Vistas', icon: Eye, color: '#fbbf24' },
  { type: 'WHATSAPP_CLICK', label: 'WhatsApp', icon: MessageCircle, color: '#22c55e' },
  { type: 'INSTAGRAM_CLICK', label: 'Instagram', icon: Instagram, color: '#ec4899' },
  { type: 'MAPS_CLICK', label: 'Cómo llegar', icon: MapPin, color: '#3b82f6' },
  { type: 'SEARCH', label: 'Búsquedas', icon: Search, color: '#a855f7' },
  { type: 'RESERVE_CLICK', label: 'Reservas', icon: CalendarPlus, color: '#f97316' },
  { type: 'REDEEM_CLICK', label: 'Cupones', icon: Ticket, color: '#14b8a6' },
  { type: 'CAPACITY_REPORT', label: 'Aforos', icon: Users, color: '#64748b' },
];

const RANGE_OPTIONS: Array<{ value: AnalyticsRange; label: string }> = [
  { value: '1d', label: 'Hoy' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: '90d', label: '90 días' },
];

// ─── Pivot the time series for Recharts ───────────────────────
// The API returns rows of { date, type, count }. Recharts wants one
// row per date with one column per type. We pivot here.
function pivotTimeSeries(
  rows: AdminAnalyticsOverview['timeSeries'],
): Array<Record<string, string | number>> {
  const byDate = new Map<string, Record<string, string | number>>();
  for (const r of rows) {
    let row = byDate.get(r.date);
    if (!row) {
      row = { date: r.date };
      byDate.set(r.date, row);
    }
    row[r.type] = r.count;
  }
  // Fill missing types with 0 so the chart draws continuous lines.
  const out: Array<Record<string, string | number>> = [];
  for (const row of byDate.values()) {
    for (const meta of EVENT_META) {
      if (!(meta.type in row)) row[meta.type] = 0;
    }
    out.push(row);
  }
  return out;
}

// ─── KPI Card ─────────────────────────────────────────────────
function KPICard({
  meta,
  count,
  total,
}: {
  meta: EventMeta;
  count: number;
  total: number;
}) {
  const Icon = meta.icon;
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="glass-card rounded-2xl p-4 flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
        >
          <Icon size={18} />
        </div>
        <span
          className="text-[10px] font-bold tracking-widest"
          style={{ color: meta.color }}
        >
          {pct}%
        </span>
      </div>
      <div>
        <div className="text-2xl font-bold text-white tabular-nums">
          {count.toLocaleString('es-VE')}
        </div>
        <div className="text-[11px] text-white/50 uppercase tracking-wider mt-0.5">
          {meta.label}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Top Businesses table (WhatsApp or Views) ─────────────────
function TopBusinessesTable({
  title,
  icon: Icon,
  iconColor,
  rows,
}: {
  title: string;
  icon: typeof Eye;
  iconColor: string;
  rows: AdminAnalyticsOverview['topWhatsApp'];
}) {
  const max = rows.length > 0 ? rows[0].count : 1;
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} style={{ color: iconColor }} />
        <h3 className="text-sm font-bold text-white tracking-wider uppercase">
          {title}
        </h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-white/40 text-xs py-8 text-center">
          Sin datos en este período
        </p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r, i) => (
            <div key={r.businessId} className="flex items-center gap-3">
              <span className="text-white/40 text-xs font-bold w-5 tabular-nums">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-white text-sm font-medium truncate">
                    {r.businessName}
                  </span>
                  <span
                    className="text-xs font-bold tabular-nums"
                    style={{ color: iconColor }}
                  >
                    {r.count}
                  </span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(r.count / max) * 100}%` }}
                    transition={{ duration: 0.5, delay: i * 0.04 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: iconColor }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Top Searches list ────────────────────────────────────────
function TopSearchesList({
  rows,
}: {
  rows: AdminAnalyticsOverview['topSearches'];
}) {
  const max = rows.length > 0 ? rows[0].count : 1;
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Search size={16} className="text-purple-400" />
        <h3 className="text-sm font-bold text-white tracking-wider uppercase">
          Búsquedas frecuentes
        </h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-white/40 text-xs py-8 text-center">
          Sin búsquedas en este período
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {rows.map((r) => {
            const size = 0.85 + (r.count / max) * 0.6; // 0.85em → 1.45em
            return (
              <span
                key={r.query}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/80"
                style={{ fontSize: `${size}em` }}
                title={`${r.count} búsquedas`}
              >
                <span className="font-medium">{r.query}</span>
                <span className="text-[10px] text-white/40 tabular-nums">
                  ×{r.count}
                </span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Recent events feed ───────────────────────────────────────
function RecentEventsFeed({
  rows,
}: {
  rows: AdminAnalyticsOverview['recentEvents'];
}) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={16} className="text-gold" />
        <h3 className="text-sm font-bold text-white tracking-wider uppercase">
          Actividad reciente
        </h3>
        <span className="ml-auto text-[10px] text-white/40">
          Últimos {rows.length} eventos
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-white/40 text-xs py-8 text-center">
          Sin eventos registrados
        </p>
      ) : (
        <div className="max-h-96 overflow-y-auto space-y-1.5 pr-1">
          {rows.map((e) => {
            const meta = EVENT_META.find((m) => m.type === e.type);
            const Icon = meta?.icon ?? Activity;
            return (
              <div
                key={e.id}
                className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/[0.03] transition-colors"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: `${meta?.color ?? '#64748b'}1a`,
                    color: meta?.color ?? '#64748b',
                  }}
                >
                  <Icon size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-xs font-medium">
                      {meta?.label ?? e.type}
                    </span>
                    {e.businessName ? (
                      <span className="text-white/50 text-xs truncate">
                        · {e.businessName}
                      </span>
                    ) : (
                      <span className="text-white/30 text-xs">· (sin negocio)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-white/30 text-[10px]">
                      {e.userName ?? e.userEmail ?? 'Anónimo'}
                    </span>
                    <span className="text-white/20 text-[10px]">·</span>
                    <span className="text-white/30 text-[10px]">
                      {formatRelativeTime(new Date(e.createdAt))}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Custom tooltip for the line chart ────────────────────────
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const date = new Date(label + 'T00:00:00Z');
  const dateLabel = date.toLocaleDateString('es-VE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Caracas',
  });
  return (
    <div className="bg-obsidian/95 border border-white/15 rounded-xl p-3 shadow-2xl backdrop-blur">
      <div className="text-[10px] text-white/50 uppercase tracking-wider mb-2">
        {dateLabel}
      </div>
      <div className="space-y-1">
        {payload
          .filter((p) => p.value > 0)
          .sort((a, b) => b.value - a.value)
          .map((p) => {
            const meta = EVENT_META.find((m) => m.type === p.name);
            return (
              <div key={p.name} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                <span className="text-white/70">{meta?.label ?? p.name}</span>
                <span className="ml-auto text-white font-bold tabular-nums">
                  {p.value}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ─── Main AdminMetricsTab ─────────────────────────────────────

export function AdminMetricsTab() {
  const [range, setRange] = useState<AnalyticsRange>('7d');
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'analytics', range],
    queryFn: () => fetchAdminAnalytics(range),
    staleTime: 60_000,
  });

  // Pivot the time series once per render of the data.
  const chartData = useMemo(
    () => (data ? pivotTimeSeries(data.timeSeries) : []),
    [data],
  );

  const totalEvents = useMemo(() => {
    if (!data) return 0;
    return Object.values(data.kpis).reduce((sum, n) => sum + n, 0);
  }, [data]);

  const toggleType = (type: string) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* ─── Header + range filter ─────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center">
            <BarChart3 className="text-gold" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Métricas de interacción</h2>
            <p className="text-white/50 text-xs">
              {totalEvents.toLocaleString('es-VE')} eventos en{' '}
              {data?.range.days ?? '—'} días
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all ${
                range === opt.value
                  ? 'bg-gold text-obsidian'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isError && (
        <div className="glass-card rounded-2xl p-8 text-center">
          <p className="text-red-400 text-sm">
            Error al cargar las métricas. Verifica tu conexión.
          </p>
        </div>
      )}

      {isLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl bg-white/5" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-2xl bg-white/5" />
          <div className="grid md:grid-cols-2 gap-4">
            <Skeleton className="h-64 rounded-2xl bg-white/5" />
            <Skeleton className="h-64 rounded-2xl bg-white/5" />
          </div>
        </div>
      )}

      {data && !isLoading && (
        <>
          {/* ─── KPI cards (8) ─────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {EVENT_META.map((meta) => (
              <KPICard
                key={meta.type}
                meta={meta}
                count={data.kpis[meta.type] ?? 0}
                total={totalEvents}
              />
            ))}
          </div>

          {/* ─── Line chart ────────────────────────────────── */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-gold" />
              <h3 className="text-sm font-bold text-white tracking-wider uppercase">
                Tendencia diaria
              </h3>
              <span className="ml-auto text-[10px] text-white/40">
                Click en la leyenda para ocultar/mostrar
              </span>
            </div>
            {chartData.length === 0 ? (
              <p className="text-white/40 text-xs py-16 text-center">
                Sin datos en este período
              </p>
            ) : (
              <>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid stroke="#ffffff10" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#ffffff60', fontSize: 10 }}
                        tickFormatter={(v: string) => {
                          const d = new Date(v + 'T00:00:00Z');
                          return d.toLocaleDateString('es-VE', {
                            day: 'numeric',
                            month: 'short',
                            timeZone: 'America/Caracas',
                          });
                        }}
                        minTickGap={20}
                      />
                      <YAxis
                        tick={{ fill: '#ffffff60', fontSize: 10 }}
                        allowDecimals={false}
                        width={40}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend
                        formatter={(value: string) => {
                          const meta = EVENT_META.find((m) => m.type === value);
                          return (
                            <span
                              className="text-xs cursor-pointer select-none"
                              style={{
                                color: hiddenTypes.has(value)
                                  ? '#ffffff40'
                                  : '#ffffffcc',
                                textDecoration: hiddenTypes.has(value)
                                  ? 'line-through'
                                  : 'none',
                              }}
                              onClick={() => toggleType(value)}
                            >
                              {meta?.label ?? value}
                            </span>
                          );
                        }}
                      />
                      {EVENT_META.map((meta) => (
                        <Line
                          key={meta.type}
                          type="monotone"
                          dataKey={meta.type}
                          stroke={meta.color}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                          hide={hiddenTypes.has(meta.type)}
                          isAnimationActive={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>

          {/* ─── Top 10 + Top searches ─────────────────────── */}
          <div className="grid md:grid-cols-2 gap-4">
            <TopBusinessesTable
              title="Top WhatsApp"
              icon={MessageCircle}
              iconColor="#22c55e"
              rows={data.topWhatsApp}
            />
            <TopBusinessesTable
              title="Top Vistas"
              icon={Eye}
              iconColor="#fbbf24"
              rows={data.topViews}
            />
          </div>

          <TopSearchesList rows={data.topSearches} />

          {/* ─── Recent events feed ────────────────────────── */}
          <RecentEventsFeed rows={data.recentEvents} />
        </>
      )}
    </div>
  );
}
