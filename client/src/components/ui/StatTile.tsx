import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { toneBg, toneText, type Tone } from './tone';
import { Skeleton } from './Skeleton';

export interface StatTileProps {
  label: string;
  /** Pre-formatted value (string) or number. "—" when unknown. */
  value: ReactNode;
  unit?: string;
  /** Secondary line (e.g. "of 1,200 kVA capacity", formula explanation). */
  hint?: ReactNode;
  /** Small delta/secondary metric shown next to the hint (e.g. "3 critical"). */
  delta?: ReactNode;
  tone?: Tone;
  /** Status icon shown with the label so tone is never color-only. */
  icon?: ReactNode;
  loading?: boolean;
  /** Makes the whole tile a link. */
  to?: string;
  /** Native tooltip with extra explanation (e.g. formula). */
  title?: string;
  className?: string;
}

/** KPI tile: mono label, large tabular value with unit, hint line, tone rail. */
export function StatTile({ label, value, unit, hint, delta, tone = 'neutral', icon, loading, to, title, className }: StatTileProps) {
  const body = (
    <>
      <span aria-hidden="true" className={clsx('absolute inset-y-0 left-0 w-0.5', toneBg[tone], tone === 'neutral' && 'opacity-30')} />
      <div className="flex items-center gap-1.5 font-mono text-label uppercase text-fg-muted">
        {icon && <span className={clsx('[&>svg]:h-3.5 [&>svg]:w-3.5', toneText[tone])}>{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-20" />
      ) : (
        <p className="mt-1.5 flex items-baseline gap-1">
          <span className="tabular font-display text-3xl font-semibold tracking-tight text-fg">{value}</span>
          {unit && <span className="font-mono text-xs text-fg-muted">{unit}</span>}
        </p>
      )}
      {(hint || delta) && (
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-fg-muted">
          {delta && <span className={clsx('font-mono', toneText[tone])}>{delta}</span>}
          {hint && <span>{hint}</span>}
        </p>
      )}
    </>
  );
  const cls = clsx(
    'relative block min-w-0 overflow-hidden rounded-sm border border-line bg-panel py-3 pl-4 pr-3',
    to && 'transition-colors duration-fast hover:border-fg-muted/50 hover:bg-raised/40',
    className,
  );
  if (to) {
    return (
      <Link to={to} className={cls} title={title} data-stat={label}>
        {body}
      </Link>
    );
  }
  return (
    <div className={cls} title={title} aria-busy={loading || undefined} data-stat={label}>
      {body}
    </div>
  );
}
