import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Crosshair, ExternalLink, X } from 'lucide-react';
import clsx from 'clsx';
import type { TransformerDto } from '@/types/api';
import { StatusBadge, STATUS_BG_CLASS } from './StatusIcon';
import { formatAge, formatNumber } from './utils';

export interface DetailPanelProps {
  transformer: TransformerDto;
  onClose: () => void;
  onFocus?: () => void;
  className?: string;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-line bg-raised/60 px-2 py-1.5">
      <dt className="font-mono text-[10px] uppercase leading-4 tracking-[0.08em] text-fg-muted">{label}</dt>
      <dd className="tabular font-mono text-sm text-fg">{value}</dd>
    </div>
  );
}

const btn =
  'inline-flex items-center justify-center gap-1.5 rounded-sm border px-2.5 py-1.5 font-mono text-label uppercase transition-colors duration-fast focus-visible:outline-none';

/** Selected-transformer details for the grid view. Esc or the close button clears the selection. */
export function DetailPanel({ transformer: t, onClose, onFocus, className }: DetailPanelProps) {
  const navigate = useNavigate();
  const r = t.latestReading;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <section
      aria-labelledby="grid-detail-title"
      className={clsx('rounded border border-line bg-panel/95 p-3 text-fg shadow-lg backdrop-blur-sm', className)}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-label uppercase text-fg-muted">Selected transformer</p>
          <h2 id="grid-detail-title" className="truncate font-mono text-base font-semibold text-fg">
            {t.code}
          </h2>
          <p className="truncate text-sm text-fg-muted">
            {t.name} · {t.location}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="rounded-sm p-1 text-fg-muted hover:bg-raised hover:text-fg"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </header>

      <div className="mt-3 flex items-center justify-between gap-2">
        <StatusBadge status={t.status} />
        <span className="font-mono text-label uppercase text-fg-muted">
          Health <span className="tabular text-sm text-fg">{t.status === 'OFFLINE' ? '—' : Math.round(t.healthScore)}</span>
          <span className="text-fg-muted">/100</span>
        </span>
      </div>
      <div
        className="mt-1.5 h-1 w-full overflow-hidden rounded-sm bg-raised"
        role="meter"
        aria-label="Health score"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(t.healthScore)}
      >
        <div className={clsx('h-full', STATUS_BG_CLASS[t.status])} style={{ width: `${Math.max(0, Math.min(100, t.healthScore))}%` }} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        <Metric label="Temp" value={formatNumber(r?.temperatureC, 1, ' °C')} />
        <Metric label="Oil level" value={formatNumber(r?.oilLevelPct, 0, ' %')} />
        <Metric label="Load" value={formatNumber(r?.loadPct, 0, ' %')} />
        <Metric label="Voltage" value={formatNumber(r?.voltageV, 0, ' V')} />
        <Metric label="Current" value={formatNumber(r?.currentA, 0, ' A')} />
        <Metric label="Capacity" value={formatNumber(t.ratedCapacityKva, 0, ' kVA')} />
      </dl>

      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="font-mono text-label uppercase text-fg-muted">Last reading</dt>
          <dd className={clsx('font-mono text-xs', t.stale ? 'text-warning' : 'text-fg')}>
            {formatAge(t.readingAgeSeconds)}
            {t.stale && ' · stale'}
            {r?.source === 'SIMULATED' && <span className="text-fg-muted"> · simulated</span>}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="font-mono text-label uppercase text-fg-muted">Active faults</dt>
          <dd className={clsx('font-mono text-xs', t.activeFaultCount > 0 ? 'text-critical' : 'text-fg')}>
            {t.activeFaultCount}
            {t.highestActiveSeverity && ` · highest ${t.highestActiveSeverity.toLowerCase()}`}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {onFocus && (
          <button type="button" onClick={onFocus} className={clsx(btn, 'border-line text-fg hover:bg-raised')}>
            <Crosshair size={13} aria-hidden="true" /> Focus
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate(`/transformers/${t.id}`)}
          className={clsx(btn, 'border-accent bg-accent text-ink hover:bg-accent/90')}
        >
          <ExternalLink size={13} aria-hidden="true" /> View details
        </button>
        <button
          type="button"
          onClick={() => navigate(`/alerts?transformerId=${encodeURIComponent(t.id)}`)}
          className={clsx(btn, 'border-line text-fg hover:bg-raised')}
        >
          <Bell size={13} aria-hidden="true" /> View alerts
        </button>
      </div>
    </section>
  );
}
