import { useState } from 'react';
import { Download } from 'lucide-react';
import { reportService } from '@/services/reportService';
import type { CsvExportType, ReportFilters } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { errorMessage } from '@/components/ui/ErrorState';
import { Panel } from '@/components/ui/Panel';
import { useToast } from '@/components/ui/Toast';
import { TransformerFilter } from '@/components/workflow/FilterControls';

const EXPORTS: { type: Exclude<CsvExportType, 'readings'>; label: string }[] = [
  { type: 'transformer-health', label: 'Transformer health' },
  { type: 'fault-history', label: 'Fault history' },
  { type: 'maintenance', label: 'Maintenance' },
];

/** CSV downloads through the authenticated session (GET /reports/export.csv). */
export function CsvExportPanel({ filters }: { filters: ReportFilters }) {
  const toast = useToast();
  const [busy, setBusy] = useState<CsvExportType | null>(null);
  const [transformerId, setTransformerId] = useState('');
  const [readingsError, setReadingsError] = useState<string>();

  const run = async (type: CsvExportType, label: string) => {
    if (type === 'readings' && !transformerId) {
      setReadingsError('Choose a transformer to export its readings');
      return;
    }
    setBusy(type);
    try {
      await reportService.exportCsv(type, type === 'readings' ? { ...filters, transformerId } : filters);
      toast.success(`${label} CSV downloaded`);
    } catch (e) {
      toast.error(`Could not export ${label.toLowerCase()} CSV`, errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Panel title="Export CSV" description="Uses the date range and location selected above.">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {EXPORTS.map((e) => (
            <Button
              key={e.type}
              size="sm"
              variant="secondary"
              icon={<Download />}
              loading={busy === e.type}
              disabled={busy !== null && busy !== e.type}
              onClick={() => void run(e.type, e.label)}
            >
              {e.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2 border-t border-line pt-4">
          <div className="min-w-[14rem] flex-1">
            <TransformerFilter
              label="Readings for transformer"
              allLabel="Select a transformer"
              value={transformerId}
              error={readingsError}
              onChange={(v) => {
                setTransformerId(v);
                setReadingsError(undefined);
              }}
            />
          </div>
          <Button
            size="md"
            variant="secondary"
            icon={<Download />}
            loading={busy === 'readings'}
            disabled={busy !== null && busy !== 'readings'}
            onClick={() => void run('readings', 'Readings')}
          >
            Readings
          </Button>
        </div>
      </div>
    </Panel>
  );
}
