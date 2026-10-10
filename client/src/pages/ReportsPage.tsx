import { useMemo, useState } from 'react';
import { useUrlState } from '@/hooks/useUrlState';
import { useDateRangeParam } from '@/hooks/useListUrlParams';
import type { ReportFilters } from '@/types/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { SimulatedBadge } from '@/components/ui/Badge';
import { DateRangePicker, presetRange } from '@/components/ui/DateRangePicker';
import { Panel } from '@/components/ui/Panel';
import { CsvExportPanel } from '@/components/reports/CsvExportPanel';
import {
  DowntimeSection,
  FaultFrequencySection,
  IncidentDurationSection,
  MaintenanceSection,
  SummaryTiles,
  TransformerHealthSection,
} from '@/components/reports/ReportSections';
import { LocationFilter } from '@/components/workflow/FilterControls';
import { formatDateTime } from '@/utils/format';

export default function ReportsPage() {
  const { get, set } = useUrlState();
  const [urlRange, setRange] = useDateRangeParam();
  // Default: last 30 days, computed once so the query key stays stable.
  const [defaultRange] = useState(() => presetRange('30d'));
  const range = urlRange.from || urlRange.to ? urlRange : defaultRange;
  const location = get('location');

  const filters = useMemo<ReportFilters>(() => {
    const f: ReportFilters = {};
    if (range.from) f.from = range.from;
    if (range.to) f.to = range.to;
    if (location) f.location = location;
    return f;
  }, [range.from, range.to, location]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Analysis"
        title="Reports"
        description="Network health, incidents and maintenance performance for a period."
        meta={<SimulatedBadge />}
      />

      <Panel bodyClassName="flex flex-wrap items-end gap-4 p-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="font-mono text-label uppercase text-fg-muted">Period</span>
          <DateRangePicker value={range} onChange={setRange} allowClear={false} presets={['24h', '7d', '30d']} label="Report period" />
        </div>
        <LocationFilter value={location ?? ''} onChange={(v) => set({ location: v })} className="w-full sm:w-56" allLabel="All locations" />
        <p className="font-mono text-xs text-fg-muted">
          {formatDateTime(range.from)} → {range.to ? formatDateTime(range.to) : 'now'}
        </p>
      </Panel>

      <SummaryTiles filters={filters} />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <FaultFrequencySection filters={filters} />
        <MaintenanceSection filters={filters} />
      </div>

      <TransformerHealthSection filters={filters} />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <IncidentDurationSection filters={filters} />
        <DowntimeSection filters={filters} />
      </div>

      <CsvExportPanel filters={filters} />
    </div>
  );
}
