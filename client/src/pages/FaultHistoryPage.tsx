import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFaultHistory } from '@/hooks/useWorkflows';
import { useUrlState } from '@/hooks/useUrlState';
import { useDateRangeParam, useFocusParam, usePageParams, useServerSort } from '@/hooks/useListUrlParams';
import type { FaultHistoryParams, FaultIncidentDto, FaultType, Severity } from '@/types/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { Panel } from '@/components/ui/Panel';
import { LoadingBlock } from '@/components/ui/Skeleton';
import { SeverityBadge } from '@/components/ui/StatusBadges';
import { Table, type Column } from '@/components/ui/Table';
import { IncidentDetailDrawer } from '@/components/faulthistory/IncidentDetailDrawer';
import { ClearFiltersButton, EnumFilter, LocationFilter, TransformerFilter } from '@/components/workflow/FilterControls';
import { formatDateTime, formatDuration, formatNumber, formatWithUnit } from '@/utils/format';
import { FAULT_TYPES, faultTypeLabel, SEVERITIES, severityLabel } from '@/utils/labels';
import { links } from '@/utils/links';

const DEFAULT_SORT = 'startedAt,desc';
const SORT_FIELDS: Record<string, string> = { started: 'startedAt', duration: 'durationSeconds', severity: 'severity' };
const FILTER_KEYS = ['transformerId', 'location', 'faultType', 'severity', 'from', 'to'];

export default function FaultHistoryPage() {
  const { get, set } = useUrlState();
  const [range, setRange] = useDateRangeParam();
  const { page, size, setPage, setSize } = usePageParams();
  const { sort, tableSort, onSortChange } = useServerSort(DEFAULT_SORT, SORT_FIELDS);
  const { focus, open, close } = useFocusParam();
  const faultType = get('faultType') as FaultType | undefined;
  const severity = get('severity') as Severity | undefined;

  const params = useMemo<FaultHistoryParams>(() => {
    const p: FaultHistoryParams = { page, size, sort };
    const tid = get('transformerId');
    if (tid) p.transformerId = tid;
    const loc = get('location');
    if (loc) p.location = loc;
    if (faultType && FAULT_TYPES.includes(faultType)) p.faultType = faultType;
    if (severity && SEVERITIES.includes(severity)) p.severity = severity;
    if (range.from) p.from = range.from;
    if (range.to) p.to = range.to;
    return p;
  }, [get, page, size, sort, faultType, severity, range]);

  const list = useFaultHistory(params);
  const setFilter = (key: string) => (v: string) => set({ [key]: v }, { resetPage: true });
  const hasFilters = FILTER_KEYS.some((k) => get(k));
  const clearFilters = () => set(Object.fromEntries(FILTER_KEYS.map((k) => [k, undefined])), { resetPage: true });

  const columns: Column<FaultIncidentDto>[] = [
    { key: 'started', header: 'Started', sortable: true, cell: (i) => <span className="font-mono text-xs">{formatDateTime(i.startedAt)}</span> },
    {
      key: 'resolved',
      header: 'Resolved',
      cell: (i) => (i.resolvedAt ? <span className="font-mono text-xs">{formatDateTime(i.resolvedAt)}</span> : <Badge tone="warning">Ongoing</Badge>),
    },
    {
      key: 'duration',
      header: 'Duration',
      sortable: true,
      align: 'right',
      cell: (i) => (i.resolvedAt ? formatDuration(i.durationSeconds) : <span className="text-fg-muted">ongoing</span>),
    },
    {
      key: 'transformer',
      header: 'Transformer',
      rowHeader: true,
      cell: (i) => (
        <span className="flex flex-col">
          <Link to={links.transformer(i.transformerId)} className="font-mono text-xs text-accent-ink hover:underline">
            {i.transformerCode}
          </Link>
          <span className="text-[0.7rem] text-fg-muted">{i.location}</span>
        </span>
      ),
    },
    { key: 'fault', header: 'Fault', cell: (i) => faultTypeLabel[i.faultType] },
    { key: 'severity', header: 'Peak severity', sortable: true, cell: (i) => <SeverityBadge value={i.severity} /> },
    {
      key: 'peak',
      header: 'Peak / threshold',
      align: 'right',
      cell: (i) => (
        <span>
          {formatWithUnit(i.peakValue, i.unit)}
          <span className="text-fg-muted"> / {formatWithUnit(i.threshold, i.unit)}</span>
        </span>
      ),
    },
    {
      key: 'recurrence',
      header: 'Recurrence',
      align: 'right',
      cell: (i) => (i.recurrenceCount > 0 ? <Badge tone="warning">×{i.recurrenceCount}</Badge> : <span className="text-fg-muted">0</span>),
    },
    { key: 'maintenance', header: 'Tasks', align: 'right', cell: (i) => formatNumber(i.maintenanceIds.length) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Operations" title="Fault history" description="Every fault incident from detection to resolution, with readings captured along the way." />

      <Panel bodyClassName="grid grid-cols-2 gap-3 p-3 md:grid-cols-4 xl:grid-cols-6">
        <TransformerFilter value={get('transformerId') ?? ''} onChange={setFilter('transformerId')} className="col-span-2" />
        <LocationFilter value={get('location') ?? ''} onChange={setFilter('location')} />
        <EnumFilter label="Fault type" value={params.faultType ?? ''} onChange={setFilter('faultType')} options={FAULT_TYPES} labels={faultTypeLabel} />
        <EnumFilter label="Severity" value={params.severity ?? ''} onChange={setFilter('severity')} options={SEVERITIES} labels={severityLabel} />
        <div className="col-span-2 flex flex-col gap-1.5 md:col-span-4 xl:col-span-5">
          <span className="font-mono text-label uppercase text-fg-muted">Started</span>
          <DateRangePicker value={range} onChange={setRange} label="Started between" />
        </div>
        {hasFilters && (
          <div className="col-span-2 flex items-end xl:col-span-1">
            <ClearFiltersButton onClick={clearFilters} />
          </div>
        )}
      </Panel>

      <Panel flush>
        {list.isPending ? (
          <LoadingBlock className="p-4" lines={8} label="Loading fault history" />
        ) : list.isError && !list.data ? (
          <ErrorState error={list.error} title="Could not load fault history" onRetry={() => void list.refetch()} retrying={list.isRefetching} />
        ) : (
          <>
            <Table
              caption="Fault incidents"
              columns={columns}
              rows={list.data.content}
              getRowId={(i) => i.id}
              sort={tableSort}
              onSortChange={onSortChange}
              onRowClick={(i) => open(i.id)}
              rowLabel={(i) => `Open ${faultTypeLabel[i.faultType]} incident on ${i.transformerCode}`}
              rowClassName={(i) => (i.id === focus ? 'bg-raised/60' : undefined)}
              updating={list.isPlaceholderData}
              maxHeight="calc(100dvh - 22rem)"
              empty={
                <EmptyState
                  title={hasFilters ? 'No incidents match these filters' : 'No fault incidents recorded'}
                  description={hasFilters ? 'Adjust or clear the filters.' : undefined}
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
                itemLabel="incidents"
                onPageChange={setPage}
                onSizeChange={setSize}
              />
            </div>
          </>
        )}
      </Panel>

      <IncidentDetailDrawer focusId={list.data ? focus : undefined} incident={list.data?.content.find((i) => i.id === focus)} onClose={close} />
    </div>
  );
}
