import type { ReactNode } from 'react';
import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/components/ui/Button';

export interface FilterBarProps {
  /** Accessible name for the filter region. */
  label: string;
  /** Number of filters that differ from the defaults. */
  activeCount: number;
  onReset: () => void;
  /** Right-aligned extras in the header (e.g. result count). */
  meta?: ReactNode;
  /** Grid classes for the controls body. */
  bodyClassName?: string;
  children: ReactNode;
}

/** Unified filter toolbar: header with active-filter count and Reset, then a grid of controls. */
export function FilterBar({ label, activeCount, onReset, meta, bodyClassName, children }: FilterBarProps) {
  return (
    <section aria-label={label} className="min-w-0 rounded-sm border border-line bg-panel">
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line px-4 py-1.5">
        <p className="flex items-center gap-2 font-mono text-label uppercase text-fg-muted">
          <SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5" />
          Filters
          {activeCount > 0 ? (
            <span className="inline-flex h-5 items-center rounded-sm bg-ink px-1.5 text-[0.65rem] text-paper" aria-live="polite">
              {activeCount} active
            </span>
          ) : (
            <span className="hidden text-fg-muted/80 sm:inline" aria-live="polite">
              · none applied
            </span>
          )}
        </p>
        <div className="flex items-center gap-3">
          {meta}
          <Button variant="ghost" size="sm" icon={<RotateCcw />} onClick={onReset} disabled={activeCount === 0}>
            <span>
              Reset<span className="hidden sm:inline"> filters</span>
            </span>
          </Button>
        </div>
      </div>
      <div className={clsx('grid gap-3 p-4', bodyClassName)}>{children}</div>
    </section>
  );
}

/** Labelled on/off switch rendered as a checkbox (keeps native semantics and the label as accessible name). */
export function ToggleFilter({ label, checked, onChange, className }: { label: string; checked: boolean; onChange: (v: boolean) => void; className?: string }) {
  return (
    <label
      className={clsx(
        'flex h-9 cursor-pointer select-none items-center gap-2 rounded-sm border px-2.5 text-sm transition-colors duration-fast',
        checked ? 'border-fg/60 bg-raised/60 text-fg' : 'border-line bg-canvas text-fg-muted hover:text-fg',
        className,
      )}
    >
      <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--ink))]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
