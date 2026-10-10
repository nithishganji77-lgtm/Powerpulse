import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAlertList } from '@/hooks/useWorkflows';
import { useUrlState } from '@/hooks/useUrlState';
import { useDebouncedUrlParam } from '@/hooks/useDebouncedUrlParam';
import { useDateRangeParam, useFocusParam, usePageParams, useServerSort } from '@/hooks/useListUrlParams';
import type { AlertDto, AlertListParams, AlertStatus, FaultType, Severity } from '@/types/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Panel } from '@/components/ui/Panel';
import { LoadingBlock } from '@/components/ui/Skeleton';
import { AlertStatusBadge, SeverityBadge } from '@/components/ui/StatusBadges';
import { Table, type Column } from '@/components/ui/Table';
import { AlertDetailDrawer } from '@/components/alerts/AlertDetailDrawer';
import { RecoveredBadge } from '@/components/alerts/RecoveredBadge';
import { ClearFiltersButton, EnumFilter, LocationFilter, TransformerFilter } from '@/components/workflow/FilterControls';
import { formatDateTime, formatWithUnit } from '@/utils/format';
import { ALERT_STATUSES, alertStatusLabel, FAULT_TYPES, faultTypeLabel, SEVERITIES, severityLabel } from '@/utils/labels';
import { links } from '@/utils/links';

const DEFAULT_SORT = 'createdAt,desc';
const SORT_FIELDS: Record<string, string> = { created: 'createdAt', severity: 'severity', status: 'status' };
const FILTER_KEYS = ['q', 'status', 'severity', 'faultType', 'location', 'transformerId', 'from', 'to', 'active'];

export default function AlertsPage() {
  const { get, set } = useUrlState();
  const [q, setQ] = useDebouncedUrlParam('q');
  const [range, setRange] = useDateRangeParam();
  const { page, size, setPage, setSize } = usePageParams();
  const { sort, tableSort, onSortChange } = useServerSort(DEFAULT_SORT, SORT_FIELDS);
  const { focus, open, close } = useFocusParam();

  const activeOnly = get('active') !== 'all';
  const status = get('status') as AlertStatus | undefined;
  const severity = get('severity') as Severity | undefined;
  const faultType = get('faultType') as FaultType | undefined;

  const params = useMemo<AlertListParams>(() => {
    const p: AlertListParams = { page, size, sort };
    const qv = get('q');
    if (qv) p.q = qv;
    if (status && ALERT_STATUSES.includes(status)) p.status = status;
    if (severity && SEVERITIES.includes(severity)) p.severity = severity;
    if (faultType && FAULT_TYPES.includes(faultType)) p.faultType = faultType;
    const loc = get('location');
    if (loc) p.location = loc;
    const tid = get('transformerId');
    if (tid) p.transformerId = tid;
    if (activeOnly) p.active = true;
    if (range.from) p.from = range.from;
    if (range.to) p.to = range.to;
    return p;
  }, [get, page, size, sort, status, severity, faultType, activeOnly, range]);

  const list = useAlertList(params);
  const setFilter = (key: string) => (v: string) => set({ [key]: v }, { resetPage: true });
  const hasFilters = FILTER_KEYS.some((k) => get(k));
  const clearFilters = () => set(Object.fromEntries(FILTER_KEYS.map((k) => [k, undefined])), { resetPage: true });

  const columns: Column<AlertDto>[] = [
    {
      key: 'created',
      header: 'Raised',
      sortable: true,
      cell: (a) => <span className="font-mono text-xs text-fg-muted">{formatDateTime(a.createdAt)}</span>,
    },
    {
      key: 'transformer',
      header: 'Transformer',
      rowHeader: true,
      cell: (a) => (
        <span className="flex flex-col">
          <Link to={links.transformer(a.transformerId)} className="font-mono text-xs text-accent hover:underline">
            {a.transformerCode}
          </Link>
          <span className="text-[0.7rem] text-fg-muted">{a.location}</span>
        </span>
      ),
    },
    { key: 'fault', header: 'Fault', cell: (a) => faultTypeLabel[a.faultType] },
    { key: 'severity', header: 'Severity', sortable: true, cell: (a) => <SeverityBadge value={a.severity} /> },
    {
      key: 'value',
      header: 'Measured / threshold',
      align: 'right',
      cell: (a) => (
        <span>
          {formatWithUnit(a.measuredValue, a.unit)}
          <span className="text-fg-muted"> / {formatWithUnit(a.threshold, a.unit)}</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (a) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <AlertStatusBadge value={a.status} />
          {a.recovered && a.status !== 'RESOLVED' && <RecoveredBadge />}
        </span>
      ),
    },
    { key: 'assignee', header: 'Assignee', cell: (a) => a.assignedUserName ?? <span className="text-fg-muted">Unassigned</span> },
    {
      key: 'recurrence',
      header: 'Recurrence',
      align: 'right',
      cell: (a) => (a.recurrenceCount > 0 ? <Badge tone="warning">×{a.recurrenceCount}</Badge> : <span className="text-fg-muted">0</span>),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Operations"
        title="Alerts"
        description="Faults detected from transformer readings. Open an alert to acknowledge, assign, resolve or raise maintenance."
      />

      <Panel bodyClassName="grid grid-cols-2 gap-3 p-3 md:grid-cols-4 xl:grid-cols-6">
        <Field label="Search" className="col-span-2">
          <Input type="search" leading={<Search />} placeholder="Transformer, description…" value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
        <EnumFilter label="Status" value={params.status ?? ''} onChange={setFilter('status')} options={ALERT_STATUSES} labels={alertStatusLabel} />
        <EnumFilter label="Severity" value={params.severity ?? ''} onChange={setFilter('severity')} options={SEVERITIES} labels={severityLabel} />
        <EnumFilter label="Fault type" value={params.faultType ?? ''} onChange={setFilter('faultType')} options={FAULT_TYPES} labels={faultTypeLabel} />
        <LocationFilter value={get('location') ?? ''} onChange={setFilter('location')} />
        <TransformerFilter value={get('transformerId') ?? ''} onChange={setFilter('transformerId')} className="col-span-2" />
        <div className="col-span-2 flex flex-col gap-1.5 md:col-span-4 xl:col-span-3">
          <span className="font-mono text-label uppercase text-fg-muted">Raised</span>
          <DateRangePicker value={range} onChange={setRange} label="Raised between" />
        </div>
        <div className="col-span-2 flex flex-wrap items-end gap-3 md:col-span-2 xl:col-span-1">
          <label className="flex h-9 cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[rgb(var(--accent))]"
              checked={activeOnly}
              onChange={(e) => set({ active: e.target.checked ? undefined : 'all' }, { resetPage: true })}
            />
            Active only
          </label>
          {hasFilters && <ClearFiltersButton onClick={clearFilters} />}
        </div>
      </Panel>

      <Panel flush>
        {list.isPending ? (
          <LoadingBlock className="p-4" lines={8} label="Loading alerts" />
        ) : list.isError && !list.data ? (
          <ErrorState error={list.error} title="Could not load alerts" onRetry={() => void list.refetch()} retrying={list.isRefetching} />
        ) : (
          <>
            <Table
              caption="Alerts"
              columns={columns}
              rows={list.data.content}
              getRowId={(a) => a.id}
              sort={tableSort}
              onSortChange={onSortChange}
              onRowClick={(a) => open(a.id)}
              rowLabel={(a) => `Open ${faultTypeLabel[a.faultType]} alert on ${a.transformerCode}`}
              rowClassName={(a) => (a.id === focus ? 'bg-raised/60' : undefined)}
              updating={list.isPlaceholderData}
              maxHeight="calc(100dvh - 24rem)"
              empty={
                <EmptyState
                  title={hasFilters ? 'No alerts match these filters' : 'No alerts'}
                  description={
                    hasFilters
                      ? activeOnly
                        ? 'Only active alerts are shown. Untick "Active only" to include resolved alerts.'
                        : 'Adjust or clear the filters.'
                      : 'Everything is running within thresholds.'
                  }
                  action={
                    hasFilters ? (
                      <Button size="sm" variant="secondary" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    ) : undefined
                  }
                />
              }
            />
            <div className="border-t border-line">
              <Pagination
                page={list.data.page}
                totalPages={list.data.totalPages}
                totalElements={list.data.totalElements}
                size={list.data.size}
                itemLabel="alerts"
                onPageChange={setPage}
                onSizeChange={setSize}
              />
            </div>
          </>
        )}
      </Panel>

      <AlertDetailDrawer alertId={focus} fallback={list.data?.content.find((a) => a.id === focus)} onClose={close} />
    </div>
  );
}
