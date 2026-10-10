import { useDashboardTrends, useFaultFrequency, useHealthDistribution } from '@/hooks/useMonitoring';
import type { DashboardFilters, FaultFrequency, HealthBucket, TrendPoint } from '@/types/api';
import { Panel } from '@/components/ui/Panel';
import { QueryState } from '@/components/ui/QueryState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { healthTone } from '@/components/ui/HealthGauge';
import { toneColor } from '@/components/ui/tone';
import { BarChart, seriesColors, TimeSeriesChart } from '@/components/charts';
import { faultTypeLabel } from '@/utils/labels';
import type { FaultType } from '@/types/api';

const chartLoading = <Skeleton className="h-[240px] w-full" />;

export function TrendCharts({ filters }: { filters: DashboardFilters }) {
  const trends = useDashboardTrends(filters);
  const empty = <EmptyState compact title="No readings in this range" description="Try a wider time range or clear filters." />;
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      <Panel title="Temperature trend" description="Top-oil temperature per bucket, all matching transformers.">
        <QueryState query={trends} isEmpty={(d: TrendPoint[]) => d.length === 0} empty={empty} loading={chartLoading}>
          {(data) => (
            <TimeSeriesChart
              label="Average and maximum temperature over time, degrees Celsius"
              data={data as unknown as Record<string, unknown>[]}
              xKey="bucket"
              unit="°C"
              yLabel="Temperature (°C)"
              series={[
                { key: 'avgTemperatureC', label: 'Average', color: seriesColors.primary },
                { key: 'maxTemperatureC', label: 'Maximum', color: seriesColors.secondary, dashed: true },
              ]}
            />
          )}
        </QueryState>
      </Panel>
      <Panel title="Load trend" description="Load as % of rated capacity per bucket.">
        <QueryState query={trends} isEmpty={(d: TrendPoint[]) => d.length === 0} empty={empty} loading={chartLoading}>
          {(data) => (
            <TimeSeriesChart
              label="Average and maximum load over time, percent of rated capacity"
              data={data as unknown as Record<string, unknown>[]}
              xKey="bucket"
              unit="%"
              yLabel="Load (%)"
              series={[
                { key: 'avgLoadPct', label: 'Average', color: seriesColors.primary },
                { key: 'maxLoadPct', label: 'Maximum', color: seriesColors.secondary, dashed: true },
              ]}
            />
          )}
        </QueryState>
      </Panel>
    </div>
  );
}

export function DistributionCharts({ filters }: { filters: DashboardFilters }) {
  const health = useHealthDistribution({ location: filters.location });
  const faults = useFaultFrequency(filters);
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      <Panel title="Health distribution" description="Transformers per health-score band (0–100).">
        <QueryState
          query={health}
          isEmpty={(d: HealthBucket[]) => d.every((b) => b.count === 0)}
          empty={<EmptyState compact title="No transformers to score" />}
          loading={chartLoading}
        >
          {(data) => (
            <BarChart
              label="Number of transformers per health score band"
              data={data as unknown as Record<string, unknown>[]}
              categoryKey="range"
              series={[{ key: 'count', label: 'Transformers' }]}
              unit="transformers"
              valueLabel="Transformers"
              colorFor={(row) => {
                const b = row as unknown as HealthBucket;
                return toneColor[healthTone((b.min + b.max) / 2)];
              }}
            />
          )}
        </QueryState>
      </Panel>
      <Panel title="Fault frequency" description="Alerts raised per fault type in the selected range.">
        <QueryState
          query={faults}
          isEmpty={(d: FaultFrequency[]) => d.every((f) => f.count === 0)}
          empty={<EmptyState compact title="No faults recorded" description="No alerts were raised in this range." />}
          loading={chartLoading}
        >
          {(data) => (
            <BarChart
              horizontal
              label="Fault count and critical count per fault type"
              data={data as unknown as Record<string, unknown>[]}
              categoryKey="faultType"
              categoryFormatter={(v) => faultTypeLabel[v as FaultType] ?? v}
              series={[
                { key: 'count', label: 'All severities', color: seriesColors.primary },
                { key: 'critical', label: 'Critical', color: toneColor.critical },
              ]}
              unit="faults"
              valueLabel="Faults"
              height={260}
            />
          )}
        </QueryState>
      </Panel>
    </div>
  );
}
