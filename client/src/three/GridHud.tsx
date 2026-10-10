import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Box, Eye, Map as MapIcon, RotateCcw, ScanEye, LocateFixed, Zap } from 'lucide-react';
import type { TransformerStatus } from '@/types/api';
import { StatusIcon, STATUS_TEXT_CLASS } from './StatusIcon';
import type { ViewMode } from './CameraRig';
import {
  STATUS_ORDER,
  formatNumber,
  statusLabel,
  toggleStatus,
  type GridFilter,
  type GridNode,
  type NetworkStats,
} from './utils';

export const FLOW_CAPTION = 'Flow animation is a visualization of simulated load, not a validated power-flow simulation.';

const label = 'font-mono text-label uppercase text-fg-muted';
const panel = 'rounded border border-line bg-panel/90 backdrop-blur-sm';

// ---------- Stats ----------
export interface GridStatsProps {
  stats: NetworkStats;
  /** Rendered after filtering, to show "showing N of M". */
  visibleCount?: number;
  className?: string;
}

function Stat({ name, value, className, icon }: { name: string; value: string; className?: string; icon?: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className={clsx(label, 'flex items-center gap-1 whitespace-nowrap')}>
        {icon}
        {name}
      </dt>
      <dd className={clsx('tabular font-mono text-lg leading-6 text-fg', className)}>{value}</dd>
    </div>
  );
}

/** Network totals. Numbers come from the dashboard summary when available (same as the dashboard). */
export function GridStats({ stats, visibleCount, className }: GridStatsProps) {
  const loadPct = stats.totalCapacityKva > 0 ? (stats.totalLoadKva / stats.totalCapacityKva) * 100 : null;
  return (
    <section aria-label="Network summary" className={clsx(panel, 'p-3', className)}>
      <dl className="grid grid-cols-3 gap-x-4 gap-y-2 sm:grid-cols-5 xl:grid-cols-9">
        <Stat name="Total" value={String(stats.total)} />
        {STATUS_ORDER.map((s) => (
          <Stat
            key={s}
            name={statusLabel(s)}
            value={String(stats[s.toLowerCase() as 'healthy' | 'warning' | 'critical' | 'offline'])}
            className={STATUS_TEXT_CLASS[s]}
            icon={<StatusIcon status={s} size={11} className={STATUS_TEXT_CLASS[s]} />}
          />
        ))}
        <Stat name="Net health" value={stats.networkHealth === null ? '—' : `${stats.networkHealth}`} />
        <Stat
          name="Active faults"
          value={String(stats.activeFaults)}
          className={stats.activeFaults > 0 ? 'text-critical' : undefined}
        />
        <Stat
          name="Sim. load"
          value={loadPct === null ? '—' : `${formatNumber(loadPct, 0)}%`}
          icon={<Zap size={11} aria-hidden="true" />}
        />
        <Stat name="Load kVA" value={formatNumber(stats.totalLoadKva, 0)} />
      </dl>
      {visibleCount !== undefined && visibleCount !== stats.total && (
        <p className={clsx(label, 'mt-2')}>
          Showing {visibleCount} of {stats.total} transformers
        </p>
      )}
    </section>
  );
}

// ---------- Controls ----------
export type RenderMode = '3d' | '2d';

export interface GridControlsProps {
  filter: GridFilter;
  onFilterChange: (f: GridFilter) => void;
  locations: string[];
  /** Per-status counts shown on the chips. */
  counts?: Partial<Record<TransformerStatus, number>>;
  highlightFaults: boolean;
  onHighlightFaults: (v: boolean) => void;
  viewMode: ViewMode;
  onViewMode: (m: ViewMode) => void;
  canIndividual: boolean;
  onResetCamera: () => void;
  renderMode: RenderMode;
  onRenderMode: (m: RenderMode) => void;
  webglAvailable: boolean;
  className?: string;
}

const chip =
  'inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-label uppercase transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-40';

export function GridControls({
  filter,
  onFilterChange,
  locations,
  counts,
  highlightFaults,
  onHighlightFaults,
  viewMode,
  onViewMode,
  canIndividual,
  onResetCamera,
  renderMode,
  onRenderMode,
  webglAvailable,
  className,
}: GridControlsProps) {
  const is3d = renderMode === '3d';
  return (
    <div className={clsx(panel, 'flex flex-wrap items-center gap-x-4 gap-y-2 p-2', className)}>
      <fieldset className="flex flex-wrap items-center gap-1.5">
        <legend className="sr-only">Filter by status</legend>
        <span className={clsx(label, 'mr-1')} aria-hidden="true">
          Status
        </span>
        {STATUS_ORDER.map((s) => {
          const on = filter.statuses.includes(s);
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              onClick={() => onFilterChange({ ...filter, statuses: toggleStatus(filter.statuses, s) })}
              className={clsx(
                chip,
                on ? 'border-fg-muted bg-raised text-fg' : 'border-line text-fg-muted hover:text-fg',
              )}
            >
              <StatusIcon status={s} size={12} className={STATUS_TEXT_CLASS[s]} />
              {statusLabel(s)}
              {counts?.[s] !== undefined && <span className="tabular text-fg-muted">{counts[s]}</span>}
            </button>
          );
        })}
        {filter.statuses.length > 0 && (
          <button
            type="button"
            onClick={() => onFilterChange({ ...filter, statuses: [] })}
            className={clsx(chip, 'border-transparent text-fg-muted hover:text-fg')}
          >
            All
          </button>
        )}
      </fieldset>

      <label className="flex items-center gap-1.5">
        <span className={label}>Location</span>
        <select
          value={filter.location}
          onChange={(e) => onFilterChange({ ...filter, location: e.target.value })}
          className="rounded-sm border border-line bg-raised px-2 py-1 font-mono text-xs text-fg"
        >
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        aria-pressed={highlightFaults}
        onClick={() => onHighlightFaults(!highlightFaults)}
        className={clsx(
          chip,
          highlightFaults ? 'border-critical bg-critical/15 text-fg' : 'border-line text-fg-muted hover:text-fg',
        )}
      >
        <Eye size={12} aria-hidden="true" /> Highlight faults
      </button>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        {is3d && (
          <>
            <div role="group" aria-label="Camera view" className="flex">
              <button
                type="button"
                aria-pressed={viewMode === 'overview'}
                onClick={() => onViewMode('overview')}
                className={clsx(
                  chip,
                  'rounded-r-none',
                  viewMode === 'overview' ? 'border-accent bg-accent text-ink' : 'border-line text-fg-muted hover:text-fg',
                )}
              >
                <ScanEye size={12} aria-hidden="true" /> Overview
              </button>
              <button
                type="button"
                aria-pressed={viewMode === 'individual'}
                disabled={!canIndividual}
                title={canIndividual ? undefined : 'Select a transformer first'}
                onClick={() => onViewMode('individual')}
                className={clsx(
                  chip,
                  '-ml-px rounded-l-none',
                  viewMode === 'individual' ? 'border-accent bg-accent text-ink' : 'border-line text-fg-muted hover:text-fg',
                )}
              >
                <LocateFixed size={12} aria-hidden="true" /> Individual
              </button>
            </div>
            <button type="button" onClick={onResetCamera} className={clsx(chip, 'border-line text-fg-muted hover:text-fg')}>
              <RotateCcw size={12} aria-hidden="true" /> Reset view
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => onRenderMode(is3d ? '2d' : '3d')}
          disabled={!is3d && !webglAvailable}
          title={!webglAvailable ? '3D view needs WebGL, which is unavailable in this browser' : undefined}
          className={clsx(chip, 'border-line text-fg hover:bg-raised')}
        >
          {is3d ? <MapIcon size={12} aria-hidden="true" /> : <Box size={12} aria-hidden="true" />}
          {is3d ? '2D view' : '3D view'}
        </button>
      </div>
    </div>
  );
}

// ---------- Legend ----------
export function GridLegend({ className, showFlow = true }: { className?: string; showFlow?: boolean }) {
  return (
    <section aria-label="Legend" className={clsx(panel, 'space-y-1.5 p-2.5', className)}>
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {STATUS_ORDER.map((s) => (
          <li key={s} className={clsx('flex items-center gap-1 font-mono text-label uppercase', STATUS_TEXT_CLASS[s])}>
            <StatusIcon status={s} size={12} />
            {statusLabel(s)}
          </li>
        ))}
        <li className="flex items-center gap-1 font-mono text-label uppercase text-critical">
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full border-2 border-critical" />
          Active fault ring
        </li>
        <li className="flex items-center gap-1 font-mono text-label uppercase text-fg-muted">
          <span aria-hidden="true" className="inline-block h-0 w-3 border-t border-dashed border-fg-muted" />
          Offline line · no flow
        </li>
        {showFlow && (
          <>
            <li className="flex items-center gap-1 font-mono text-label uppercase text-fg-muted">
              <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-accent" />
              Flow · density = load
            </li>
            <li className="flex items-center gap-1 font-mono text-label uppercase text-fg-muted">
              <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-warning" />
              Flow · load ≥ 90%
            </li>
          </>
        )}
      </ul>
      {showFlow && <p className="max-w-md text-[11px] leading-4 text-fg-muted">{FLOW_CAPTION}</p>}
    </section>
  );
}

// ---------- Keyboard-accessible transformer list ----------
export interface TransformerListProps {
  nodes: GridNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onHover?: (id: string | null) => void;
  className?: string;
}

const LIST_RANK: Record<TransformerStatus, number> = { CRITICAL: 0, WARNING: 1, OFFLINE: 2, HEALTHY: 3 };

/** Every visible transformer as a button: the non-hover, keyboard path to selection and focus. */
export function TransformerList({ nodes, selectedId, onSelect, onHover, className }: TransformerListProps) {
  // Most urgent first, then by code.
  const sorted = [...nodes].sort((a, b) => LIST_RANK[a.status] - LIST_RANK[b.status] || a.code.localeCompare(b.code));
  return (
    <nav aria-label="Transformers on the grid" className={clsx(panel, 'flex min-h-0 flex-col', className)}>
      <h2 className={clsx(label, 'border-b border-line px-3 py-2')}>Transformers ({nodes.length})</h2>
      {sorted.length === 0 ? (
        <p className="px-3 py-4 text-sm text-fg-muted">No transformers match the current filters.</p>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
          {sorted.map((n) => {
            const selected = n.id === selectedId;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => onSelect(n.id)}
                  onMouseEnter={() => onHover?.(n.id)}
                  onMouseLeave={() => onHover?.(null)}
                  onFocus={() => onHover?.(n.id)}
                  onBlur={() => onHover?.(null)}
                  className={clsx(
                    'flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors duration-fast hover:bg-raised focus-visible:bg-raised',
                    selected && 'bg-raised shadow-[inset_2px_0_0_rgb(var(--accent))]',
                  )}
                >
                  <StatusIcon status={n.status} size={13} className={clsx('shrink-0', STATUS_TEXT_CLASS[n.status])} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-xs font-semibold text-fg">{n.code}</span>
                    <span className="block truncate text-[11px] text-fg-muted">{n.location}</span>
                  </span>
                  <span className="text-right">
                    <span className={clsx('block font-mono text-[10px] uppercase tracking-[0.08em]', STATUS_TEXT_CLASS[n.status])}>
                      {statusLabel(n.status)}
                    </span>
                    <span className="tabular block font-mono text-[11px] text-fg-muted">
                      {n.status === 'OFFLINE' ? '—' : `H ${Math.round(n.healthScore)}`}
                      {n.activeFaultCount > 0 && <span className="text-critical">
                          {' '}
                          · {n.activeFaultCount} fault{n.activeFaultCount === 1 ? '' : 's'}
                        </span>}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
