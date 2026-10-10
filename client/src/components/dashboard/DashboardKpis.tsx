import { Activity, Boxes, ClipboardList, Gauge, Siren } from 'lucide-react';
import type { DashboardSummary } from '@/types/api';
import { StatTile } from '@/components/ui/StatTile';
import { statusMeta } from '@/components/ui/StatusBadges';
import { healthTone } from '@/components/ui/HealthGauge';
import { formatNumber, formatPct, isNum } from '@/utils/format';
import { statusLabel, TRANSFORMER_STATUSES } from '@/utils/labels';

const NETWORK_HEALTH_FORMULA =
  'Network health = Σ(health score × rated kVA) / Σ(rated kVA), over transformers that are not OFFLINE. Transparent heuristic, not a probability of failure.';

const statusCount = (s: DashboardSummary, status: (typeof TRANSFORMER_STATUSES)[number]) =>
  ({ HEALTHY: s.healthy, WARNING: s.warning, CRITICAL: s.critical, OFFLINE: s.offline })[status];

/** KPI tiles. Every number comes from DashboardSummary (backend-computed). */
export function DashboardKpis({ summary, loading }: { summary?: DashboardSummary; loading?: boolean }) {
  const s = summary;
  const loadPct = s && s.totalCapacityKva > 0 ? (s.totalLoadKva / s.totalCapacityKva) * 100 : null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" aria-busy={loading || undefined}>
      <StatTile
        label="Transformers"
        icon={<Boxes aria-hidden="true" />}
        value={formatNumber(s?.totalTransformers)}
        hint="in the current filter"
        loading={loading}
        to="/transformers"
      />
      {TRANSFORMER_STATUSES.map((st) => {
        const { Icon, tone } = statusMeta[st];
        const count = s ? statusCount(s, st) : undefined;
        return (
          <StatTile
            key={st}
            label={statusLabel[st]}
            icon={<Icon aria-hidden="true" />}
            tone={tone}
            value={formatNumber(count)}
            hint={s && s.totalTransformers > 0 && isNum(count) ? `${formatPct((count / s.totalTransformers) * 100)} of fleet` : undefined}
            loading={loading}
            to={`/transformers?status=${st}`}
          />
        );
      })}
      <StatTile
        label="Network health"
        icon={<Gauge aria-hidden="true" />}
        tone={s?.networkHealth == null ? 'offline' : healthTone(s.networkHealth)}
        value={s?.networkHealth == null ? '—' : formatNumber(s.networkHealth)}
        unit="/ 100"
        hint="capacity-weighted mean of online units"
        title={NETWORK_HEALTH_FORMULA}
        loading={loading}
      />
      <StatTile
        label="Total load"
        icon={<Activity aria-hidden="true" />}
        value={formatNumber(s?.totalLoadKva)}
        unit="kVA"
        hint={s ? `of ${formatNumber(s.totalCapacityKva)} kVA capacity` : undefined}
        delta={loadPct !== null ? formatPct(loadPct) : undefined}
        loading={loading}
      />
      <StatTile
        label="Active alerts"
        icon={<Siren aria-hidden="true" />}
        tone={s && s.activeCriticalAlerts > 0 ? 'critical' : s && s.activeAlerts > 0 ? 'warning' : 'neutral'}
        value={formatNumber(s?.activeAlerts)}
        delta={s ? `${formatNumber(s.activeCriticalAlerts)} critical` : undefined}
        loading={loading}
        to="/alerts"
      />
      <StatTile
        label="Pending maintenance"
        icon={<ClipboardList aria-hidden="true" />}
        tone={s && s.overdueMaintenance > 0 ? 'warning' : 'neutral'}
        value={formatNumber(s?.pendingMaintenance)}
        delta={s ? `${formatNumber(s.overdueMaintenance)} overdue` : undefined}
        loading={loading}
        to="/maintenance"
      />
    </div>
  );
}
