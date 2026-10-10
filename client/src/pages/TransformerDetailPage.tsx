import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Boxes, ClipboardPlus, MapPin, Pencil, Siren } from 'lucide-react';
import {
  useTransformer,
  useTransformerAlerts,
  useTransformerIncidents,
  useTransformerMaintenance,
} from '@/hooks/useMonitoring';
import { useSettings } from '@/hooks/useAdmin';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/apiClient';
import type { AlertDto, FaultIncidentDto, MaintenanceDto, TransformerDetailDto } from '@/types/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { RoleGate } from '@/components/layout/RoleGate';
import { Badge, SimulatedBadge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Freshness } from '@/components/ui/Freshness';
import { Panel } from '@/components/ui/Panel';
import { QueryState } from '@/components/ui/QueryState';
import { LoadingBlock, Skeleton } from '@/components/ui/Skeleton';
import {
  AlertStatusBadge,
  MaintenanceStatusBadge,
  OverdueBadge,
  PriorityBadge,
  SeverityBadge,
  StatusBadge,
} from '@/components/ui/StatusBadges';
import { Table, type Column } from '@/components/ui/Table';
import { HealthBreakdown } from '@/components/transformers/HealthBreakdown';
import { ReadingHistory } from '@/components/transformers/ReadingHistory';
import { TransformerFormDialog } from '@/components/transformers/TransformerFormDialog';
import { MaintenanceCreateDialog } from '@/components/maintenance/MaintenanceCreateDialog';
import {
  formatAmps,
  formatDate,
  formatDateTime,
  formatDuration,
  formatKva,
  formatNumber,
  formatPct,
  formatPf,
  formatRelative,
  formatTemp,
  formatVolts,
  formatWithUnit,
} from '@/utils/format';
import { faultTypeLabel } from '@/utils/labels';
import { links } from '@/utils/links';

function Spec({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-label uppercase text-fg-muted">{label}</dt>
      <dd className="tabular mt-1 truncate font-mono text-sm text-fg">{value}</dd>
    </div>
  );
}

function LatestReadings({ t }: { t: TransformerDetailDto }) {
  const r = t.latestReading;
  return (
    <Panel
      title="Latest reading"
      actions={
        <span className="flex items-center gap-2">
          {r?.source === 'SIMULATED' ? <SimulatedBadge /> : r ? <Badge tone="neutral">Device</Badge> : null}
          <Freshness at={t.lastReadingAt} stale={t.stale} />
        </span>
      }
    >
      {!r ? (
        <EmptyState compact title="No readings yet" description="This transformer has not reported any data." />
      ) : (
        <>
          {t.stale && (
            <p role="status" className="mb-3 rounded-sm border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
              Stale: no reading for longer than the {formatDuration(t.sensorTimeoutSeconds)} sensor timeout. Values below are the
              last known reading.
            </p>
          )}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
            <Spec label="Temperature" value={formatTemp(r.temperatureC)} />
            <Spec label="Oil level" value={formatPct(r.oilLevelPct, 1)} />
            <Spec label="Load" value={formatPct(r.loadPct, 1)} />
            <Spec label="Voltage (L-L)" value={formatVolts(r.voltageV)} />
            <Spec label="Current" value={formatAmps(r.currentA)} />
            <Spec label="Power factor" value={formatPf(r.powerFactor)} />
          </dl>
          <p className="mt-3 text-xs text-fg-muted">Recorded {formatDateTime(r.recordedAt)}</p>
        </>
      )}
    </Panel>
  );
}

function RatedSpecs({ t }: { t: TransformerDetailDto }) {
  return (
    <Panel title="Rating">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
        <Spec label="Capacity" value={formatKva(t.ratedCapacityKva)} />
        <Spec label="Primary" value={formatWithUnit(t.primaryVoltageKv, 'kV', 1)} />
        <Spec label="Secondary" value={formatVolts(t.secondaryVoltageV)} />
        <Spec label="Rated current" value={formatAmps(t.ratedCurrentA)} />
        <Spec label="Sensor timeout" value={formatDuration(t.sensorTimeoutSeconds)} />
        <Spec label="Last maintenance" value={t.lastMaintenanceAt ? formatDate(t.lastMaintenanceAt) : 'Never'} />
      </dl>
      <p className="mt-3 text-xs text-fg-muted">Rated current = kVA × 1000 / (√3 × secondary V).</p>
    </Panel>
  );
}

function ActiveAlerts({ id }: { id: string }) {
  const alerts = useTransformerAlerts(id, { active: true });
  return (
    <Panel title="Active alerts" actions={<Link to={links.alertsForTransformer(id)} className="text-xs text-accent-ink hover:underline">All alerts →</Link>}>
      <QueryState
        query={alerts}
        isEmpty={(d: AlertDto[]) => d.length === 0}
        empty={<EmptyState compact title="No active alerts" description="All monitored values are within thresholds." />}
      >
        {(data) => (
          <ul className="flex flex-col divide-y divide-line">
            {data.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge value={a.severity} />
                    <Link to={links.alert(a.id)} className="text-sm text-fg hover:underline">
                      {faultTypeLabel[a.faultType] ?? a.faultType}
                    </Link>
                    <AlertStatusBadge value={a.status} />
                    {a.recovered && <Badge tone="healthy">Recovered</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-fg-muted">{a.description}</p>
                </div>
                <div className="text-right">
                  <p className="tabular font-mono text-xs text-fg">
                    {formatWithUnit(a.measuredValue, a.unit)}
                    <span className="text-fg-muted"> vs {formatWithUnit(a.threshold, a.unit)}</span>
                  </p>
                  <p className="font-mono text-[0.65rem] text-fg-muted">{formatRelative(a.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </Panel>
  );
}

function Recommendations({ t }: { t: TransformerDetailDto }) {
  return (
    <Panel title="Suggested inspection actions" description="Rule-based suggestions, not a diagnosis.">
      {t.recommendations.length === 0 ? (
        <EmptyState compact title="No suggested actions" description="No active rule matched this transformer." />
      ) : (
        <ol className="flex flex-col gap-3">
          {t.recommendations.map((r, i) => (
            <li key={`${r.title}-${i}`} className="flex gap-3">
              <span className="tabular mt-0.5 font-mono text-xs text-accent-ink">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <p className="text-sm text-fg">
                  {r.title}
                  {r.faultType && <span className="ml-2 font-mono text-[0.65rem] uppercase text-fg-muted">{faultTypeLabel[r.faultType]}</span>}
                </p>
                <p className="mt-0.5 text-xs text-fg-muted">{r.action}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function PreviousFaults({ id }: { id: string }) {
  const incidents = useTransformerIncidents(id);
  const columns: Column<FaultIncidentDto>[] = [
    { key: 'type', header: 'Fault', rowHeader: true, cell: (i) => faultTypeLabel[i.faultType] ?? i.faultType },
    { key: 'sev', header: 'Severity', cell: (i) => <SeverityBadge value={i.severity} /> },
    { key: 'start', header: 'Started', cell: (i) => <span className="font-mono text-xs">{formatDateTime(i.startedAt)}</span> },
    {
      key: 'dur',
      header: 'Duration',
      align: 'right',
      cell: (i) => (i.resolvedAt ? formatDuration(i.durationSeconds) : <Badge tone="warning">Ongoing</Badge>),
    },
    { key: 'peak', header: 'Peak', align: 'right', cell: (i) => formatWithUnit(i.peakValue, i.unit) },
    {
      key: 'rec',
      header: 'Recurrences',
      align: 'right',
      cell: (i) => (i.recurrenceCount > 0 ? formatNumber(i.recurrenceCount) : <span className="text-fg-muted">First</span>),
    },
  ];
  return (
    <Panel title="Previous faults" flush actions={<Link to={`/fault-history?transformerId=${id}`} className="text-xs text-accent-ink hover:underline">Fault history →</Link>}>
      <QueryState query={incidents} loading={<LoadingBlock className="p-4" />}>
        {(data) => (
          <Table
            caption="Fault incidents for this transformer"
            columns={columns}
            rows={data}
            getRowId={(i) => i.id}
            dense
            maxHeight="22rem"
            empty={<EmptyState compact title="No recorded faults" />}
          />
        )}
      </QueryState>
    </Panel>
  );
}

function MaintenanceHistory({ id }: { id: string }) {
  const tasks = useTransformerMaintenance(id);
  const columns: Column<MaintenanceDto>[] = [
    {
      key: 'title',
      header: 'Task',
      rowHeader: true,
      cell: (m) => (
        <Link to={links.maintenance(m.id)} className="block max-w-[16rem] truncate hover:underline" title={m.title}>
          {m.title}
        </Link>
      ),
    },
    { key: 'priority', header: 'Priority', cell: (m) => <PriorityBadge value={m.priority} /> },
    { key: 'status', header: 'Status', cell: (m) => <MaintenanceStatusBadge value={m.status} /> },
    {
      key: 'due',
      header: 'Due / done',
      cell: (m) => (
        <span className="inline-flex items-center gap-1.5 font-mono text-xs">
          {m.completedAt ? `Done ${formatDate(m.completedAt)}` : formatDate(m.dueDate)}
          {m.overdue && <OverdueBadge />}
        </span>
      ),
    },
    { key: 'tech', header: 'Technician', cell: (m) => <span className="text-xs text-fg-muted">{m.assignedTechnicianName ?? 'Unassigned'}</span> },
  ];
  return (
    <Panel title="Maintenance history" flush>
      <QueryState query={tasks} loading={<LoadingBlock className="p-4" />}>
        {(data) => (
          <Table
            caption="Maintenance tasks for this transformer"
            columns={columns}
            rows={data}
            getRowId={(m) => m.id}
            dense
            maxHeight="22rem"
            empty={<EmptyState compact title="No maintenance recorded" />}
          />
        )}
      </QueryState>
    </Panel>
  );
}

export default function TransformerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const detail = useTransformer(id);
  const { hasRole } = useAuth();
  const canReadSettings = hasRole('ADMIN', 'ENGINEER');
  const settings = useSettings(canReadSettings);
  const [editOpen, setEditOpen] = useState(false);
  const [maintOpen, setMaintOpen] = useState(false);

  if (detail.isPending) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label="Loading transformer">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (detail.isError && !detail.data) {
    const notFound = detail.error instanceof ApiError && detail.error.status === 404;
    return notFound ? (
      <EmptyState
        title="Transformer not found"
        description="It may have been removed or the link is wrong."
        action={<ButtonLink to="/transformers" variant="secondary">Back to registry</ButtonLink>}
      />
    ) : (
      <ErrorState error={detail.error} title="Could not load this transformer" onRetry={() => void detail.refetch()} />
    );
  }

  const t = detail.data;
  const label = `${t.code} · ${t.name}`;

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Breadcrumb" className="font-mono text-label uppercase text-fg-muted">
        <Link to="/transformers" className="hover:text-fg">
          Transformers
        </Link>{' '}
        / <span className="text-fg">{t.code}</span>
      </nav>
      <PageHeader
        eyebrow={t.code}
        title={t.name}
        meta={
          <>
            <StatusBadge value={t.status} />
            {t.latestReading?.source === 'SIMULATED' && <SimulatedBadge />}
            <Freshness at={t.lastReadingAt} stale={t.stale} label="Last reading" />
            <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
              <MapPin aria-hidden="true" className="h-3 w-3" />
              {t.location}
              <span className="tabular font-mono">
                · {formatNumber(t.latitude, 5)}, {formatNumber(t.longitude, 5)}
              </span>
            </span>
          </>
        }
        actions={
          <>
            <ButtonLink to={links.grid(t.id)} variant="secondary" icon={<Boxes />}>
              Open in 3D grid
            </ButtonLink>
            <ButtonLink to={links.alertsForTransformer(t.id)} variant="secondary" icon={<Siren />}>
              View related alerts
            </ButtonLink>
            <RoleGate roles={['ADMIN', 'ENGINEER']}>
              <Button variant="secondary" icon={<Pencil />} onClick={() => setEditOpen(true)}>
                Edit
              </Button>
              <Button variant="primary" icon={<ClipboardPlus />} onClick={() => setMaintOpen(true)}>
                Create maintenance
              </Button>
            </RoleGate>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Panel title="Health" className="lg:row-span-2">
          <HealthBreakdown score={t.healthScore} status={t.status} factors={t.healthFactors} />
        </Panel>
        <div className="lg:col-span-2">
          <LatestReadings t={t} />
        </div>
        <div className="lg:col-span-2">
          <RatedSpecs t={t} />
        </div>
      </div>

      <ReadingHistory transformer={t} settings={settings.data} />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <ActiveAlerts id={t.id} />
        <Recommendations t={t} />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <PreviousFaults id={t.id} />
        <MaintenanceHistory id={t.id} />
      </div>

      <TransformerFormDialog open={editOpen} onClose={() => setEditOpen(false)} transformer={t} />
      <MaintenanceCreateDialog
        open={maintOpen}
        onClose={() => setMaintOpen(false)}
        transformerId={t.id}
        transformerLabel={label}
        defaultPriority={t.status === 'CRITICAL' ? 'HIGH' : 'MEDIUM'}
      />
    </div>
  );
}
