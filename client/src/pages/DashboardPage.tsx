import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { useDashboardSummary, useLocations } from '@/hooks/useMonitoring';
import { useUrlState } from '@/hooks/useUrlState';
import type { DashboardFilters, TransformerStatus } from '@/types/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { ErrorState } from '@/components/ui/ErrorState';
import { Field } from '@/components/ui/Field';
import { Freshness } from '@/components/ui/Freshness';
import { Panel } from '@/components/ui/Panel';
import { Select } from '@/components/ui/Select';
import { LoadingBlock } from '@/components/ui/Skeleton';
import { SimulatedBadge } from '@/components/ui/Badge';
import { DashboardKpis } from '@/components/dashboard/DashboardKpis';
import { DistributionCharts, TrendCharts } from '@/components/dashboard/DashboardCharts';
import { PendingMaintenanceTable, RecentAlertsTable, TransformerStatusTable } from '@/components/dashboard/DashboardTables';
import { SimulationPanel } from '@/components/simulation/SimulationPanel';
import { statusLabel, TRANSFORMER_STATUSES } from '@/utils/labels';

function useDashboardFilters(): [DashboardFilters, ReturnType<typeof useUrlState>['set']] {
  const { get, set } = useUrlState();
  const location = get('location');
  const status = get('status') as TransformerStatus | undefined;
  const from = get('from');
  const to = get('to');
  const filters = useMemo<DashboardFilters>(() => {
    const f: DashboardFilters = {};
    if (location) f.location = location;
    if (status && TRANSFORMER_STATUSES.includes(status)) f.status = status;
    if (from) f.from = from;
    if (to) f.to = to;
    return f;
  }, [location, status, from, to]);
  return [filters, set];
}

export default function DashboardPage() {
  const [filters, setFilters] = useDashboardFilters();
  const summary = useDashboardSummary(filters);
  const locations = useLocations();
  const { hash } = useLocation();

  // Support /dashboard#simulation deep links (from the top-bar SIMULATED indicator).
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash, summary.isSuccess]);

  const hasFilters = Object.keys(filters).length > 0;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Network overview"
        title="Dashboard"
        meta={
          <>
            <SimulatedBadge />
            {summary.data && <Freshness at={summary.data.generatedAt} label="Updated" />}
          </>
        }
      />

      <Panel bodyClassName="flex flex-wrap items-end gap-3 p-3">
        <Field label="Location" className="w-full sm:w-48">
          <Select value={filters.location ?? ''} onChange={(e) => setFilters({ location: e.target.value })}>
            <option value="">All locations</option>
            {(locations.data ?? []).map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status" className="w-full sm:w-40">
          <Select value={filters.status ?? ''} onChange={(e) => setFilters({ status: e.target.value })}>
            <option value="">All statuses</option>
            {TRANSFORMER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel[s]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="font-mono text-label uppercase text-fg-muted">Time range</span>
          <DateRangePicker value={{ from: filters.from, to: filters.to }} onChange={(r) => setFilters({ from: r.from, to: r.to })} />
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            icon={<X />}
            onClick={() => setFilters({ location: undefined, status: undefined, from: undefined, to: undefined })}
          >
            Clear filters
          </Button>
        )}
      </Panel>

      <section aria-label="Key metrics">
        {summary.isError && !summary.data ? (
          <Panel>
            <ErrorState
              error={summary.error}
              title="Could not load the network summary"
              onRetry={() => void summary.refetch()}
              retrying={summary.isRefetching}
            />
          </Panel>
        ) : (
          <DashboardKpis summary={summary.data} loading={summary.isPending} />
        )}
      </section>

      <TrendCharts filters={filters} />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {summary.isPending ? (
          <>
            <Panel title="Recent alerts">
              <LoadingBlock lines={5} label="Loading recent alerts" />
            </Panel>
            <Panel title="Pending maintenance">
              <LoadingBlock lines={5} label="Loading maintenance" />
            </Panel>
          </>
        ) : summary.data ? (
          <>
            <RecentAlertsTable rows={summary.data.recentIncidents} />
            <PendingMaintenanceTable rows={summary.data.recentMaintenance} />
          </>
        ) : null}
      </div>

      <TransformerStatusTable filters={filters} />

      <DistributionCharts filters={filters} />

      <SimulationPanel />
    </div>
  );
}
