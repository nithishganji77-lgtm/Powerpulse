import { Link, useNavigate } from 'react-router-dom';
import { useAllTransformers } from '@/hooks/useMonitoring';
import type { DashboardFilters, IncidentSummary, MaintenanceSummary, TransformerDto } from '@/types/api';
import { Panel } from '@/components/ui/Panel';
import { Table, useClientSort, type Column } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryState } from '@/components/ui/QueryState';
import { LoadingBlock } from '@/components/ui/Skeleton';
import {
  AlertStatusBadge,
  MaintenanceStatusBadge,
  OverdueBadge,
  PriorityBadge,
  SeverityBadge,
  StatusBadge,
} from '@/components/ui/StatusBadges';
import { HealthGauge } from '@/components/ui/HealthGauge';
import { Freshness } from '@/components/ui/Freshness';
import { faultTypeLabel } from '@/utils/labels';
import { formatDate, formatPct, formatRelative, formatTemp } from '@/utils/format';
import { links } from '@/utils/links';

const linkCls = 'font-mono text-xs text-accent-ink hover:underline';

export function RecentAlertsTable({ rows }: { rows: IncidentSummary[] }) {
  const columns: Column<IncidentSummary>[] = [
    { key: 'severity', header: 'Severity', cell: (r) => <SeverityBadge value={r.severity} /> },
    {
      key: 'transformer',
      header: 'Transformer',
      cell: (r) => (
        <Link to={links.transformer(r.transformerId)} className={linkCls}>
          {r.transformerCode}
        </Link>
      ),
    },
    {
      key: 'fault',
      header: 'Fault',
      rowHeader: true,
      cell: (r) => (
        <Link to={links.alert(r.alertId)} className="hover:underline">
          {faultTypeLabel[r.faultType] ?? r.faultType}
        </Link>
      ),
    },
    { key: 'status', header: 'Status', cell: (r) => <AlertStatusBadge value={r.status} /> },
    {
      key: 'created',
      header: 'Raised',
      cell: (r) => (
        <time dateTime={r.createdAt} className="font-mono text-xs text-fg-muted">
          {formatRelative(r.createdAt)}
        </time>
      ),
    },
  ];
  return (
    <Panel title="Recent alerts" flush actions={<Link to="/alerts" className="text-xs text-accent-ink hover:underline">All alerts →</Link>}>
      <Table
        caption="Most recent alerts"
        columns={columns}
        rows={rows}
        getRowId={(r) => r.alertId}
        dense
        empty={<EmptyState compact title="No recent alerts" description="Nothing has tripped a threshold." />}
      />
    </Panel>
  );
}

export function PendingMaintenanceTable({ rows }: { rows: MaintenanceSummary[] }) {
  const columns: Column<MaintenanceSummary>[] = [
    {
      key: 'title',
      header: 'Task',
      rowHeader: true,
      cell: (r) => (
        <Link to={links.maintenance(r.id)} className="block max-w-[16rem] truncate hover:underline" title={r.title}>
          {r.title}
        </Link>
      ),
    },
    {
      key: 'transformer',
      header: 'Transformer',
      cell: (r) => (
        <Link to={links.transformer(r.transformerId)} className={linkCls}>
          {r.transformerCode}
        </Link>
      ),
    },
    { key: 'priority', header: 'Priority', cell: (r) => <PriorityBadge value={r.priority} /> },
    { key: 'status', header: 'Status', cell: (r) => <MaintenanceStatusBadge value={r.status} /> },
    {
      key: 'due',
      header: 'Due',
      cell: (r) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="font-mono text-xs">{formatDate(r.dueDate)}</span>
          {r.overdue && <OverdueBadge />}
        </span>
      ),
    },
    { key: 'tech', header: 'Technician', cell: (r) => <span className="text-xs text-fg-muted">{r.assignedTechnicianName ?? 'Unassigned'}</span> },
  ];
  return (
    <Panel
      title="Pending maintenance"
      flush
      actions={<Link to="/maintenance" className="text-xs text-accent-ink hover:underline">All tasks →</Link>}
    >
      <Table
        caption="Pending and recent maintenance tasks"
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        dense
        empty={<EmptyState compact title="No pending maintenance" />}
      />
    </Panel>
  );
}

const statusOrder = { CRITICAL: 0, WARNING: 1, OFFLINE: 2, HEALTHY: 3 } as const;
const transformerAccessors: Record<string, (t: TransformerDto) => string | number | null | undefined> = {
  code: (t) => t.code,
  name: (t) => t.name,
  location: (t) => t.location,
  status: (t) => statusOrder[t.status],
  health: (t) => t.healthScore,
  temp: (t) => t.latestReading?.temperatureC,
  load: (t) => t.latestReading?.loadPct,
  reading: (t) => (t.lastReadingAt ? -new Date(t.lastReadingAt).getTime() : null),
};

/** Fleet status table (client-sorted, filtered by the dashboard's location/status filters). */
export function TransformerStatusTable({ filters }: { filters: DashboardFilters }) {
  const all = useAllTransformers();
  const navigate = useNavigate();
  const filtered = all.data?.filter(
    (t) => (!filters.location || t.location === filters.location) && (!filters.status || t.status === filters.status),
  );
  const { sorted, sort, setSort } = useClientSort(filtered, transformerAccessors, { key: 'health', dir: 'asc' });

  const columns: Column<TransformerDto>[] = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      rowHeader: true,
      cell: (t) => (
        <Link to={links.transformer(t.id)} className={linkCls}>
          {t.code}
        </Link>
      ),
    },
    { key: 'name', header: 'Name', sortable: true, cell: (t) => <span className="block max-w-[12rem] truncate">{t.name}</span> },
    { key: 'location', header: 'Location', sortable: true, cell: (t) => <span className="text-fg-muted">{t.location}</span> },
    { key: 'status', header: 'Status', sortable: true, cell: (t) => <StatusBadge value={t.status} /> },
    { key: 'health', header: 'Health', sortable: true, cell: (t) => <HealthGauge score={t.healthScore} status={t.status} /> },
    { key: 'temp', header: 'Temp', sortable: true, align: 'right', cell: (t) => formatTemp(t.latestReading?.temperatureC) },
    { key: 'load', header: 'Load', sortable: true, align: 'right', cell: (t) => formatPct(t.latestReading?.loadPct) },
    { key: 'reading', header: 'Last reading', sortable: true, cell: (t) => <Freshness at={t.lastReadingAt} stale={t.stale} bare /> },
  ];

  return (
    <Panel
      title="Transformer status"
      description="Live fleet view. Sort any column; select a row for details."
      flush
      actions={<Link to="/transformers" className="text-xs text-accent-ink hover:underline">Registry →</Link>}
    >
      <QueryState query={all} loading={<LoadingBlock className="p-4" lines={6} label="Loading transformers" />}>
        {() => (
          <Table
            caption="Transformer status"
            columns={columns}
            rows={sorted}
            getRowId={(t) => t.id}
            sort={sort}
            onSortChange={setSort}
            onRowClick={(t) => navigate(links.transformer(t.id))}
            rowLabel={(t) => `Open ${t.code} ${t.name}`}
            maxHeight="28rem"
            dense
            empty={<EmptyState compact title="No transformers match these filters" />}
          />
        )}
      </QueryState>
    </Panel>
  );
}
