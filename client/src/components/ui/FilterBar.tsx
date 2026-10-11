import type { ReactNode } from 'react';
import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';
import { Button } from './Button';

export interface FilterBarProps {
  /** Labelled controls (usually <Field> + Input/Select). Heights are normalised to the 36px control size. */
  children: ReactNode;
  /** Number of filters currently applied (drives the indicator and enables Reset). */
  activeCount: number;
  /** Clears every filter owned by this bar. */
  onReset: () => void;
  /** Accessible name of the toolbar region. */
  label?: string;
  /** Optional right-aligned slot rendered before the reset action (e.g. a sort select). */
  trailing?: ReactNode;
  /** Optional row under the controls (e.g. a validation message). */
  footer?: ReactNode;
  className?: string;
}

/**
 * Reusable filter toolbar: labelled controls that wrap responsively, an active-filter count
 * (text, not color-only) and a "Reset filters" action that is disabled when nothing is applied.
 *
 * <FilterBar activeCount={n} onReset={reset}>
 *   <Field label="Location" className="w-full sm:w-48"><Select …/></Field>
 * </FilterBar>
 */
export function FilterBar({ children, activeCount, onReset, label = 'Filters', trailing, footer, className }: FilterBarProps) {
  const active = activeCount > 0;
  return (
    <section
      aria-label={label}
      className={clsx('min-w-0 rounded-sm border border-line bg-panel', className)}
      data-active-filters={activeCount}
    >
      <div className="flex flex-wrap items-end gap-x-3 gap-y-3 px-3 py-3 sm:px-4">
        {children}
        <div className="ml-auto flex min-h-9 flex-wrap items-center justify-end gap-2 self-end">
          {trailing}
          <span
            className={clsx(
              'inline-flex h-9 items-center gap-1.5 whitespace-nowrap font-mono text-label uppercase',
              active ? 'text-fg' : 'text-fg-muted',
            )}
            aria-live="polite"
          >
            {active && <SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5" />}
            {active ? (
              <>
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-sm bg-ink px-1 text-[0.625rem] text-paper">
                  {activeCount}
                </span>
                {activeCount === 1 ? 'filter active' : 'filters active'}
              </>
            ) : (
              <span className="sr-only">No filters applied</span>
            )}
          </span>
          <Button variant="ghost" size="md" icon={<RotateCcw />} onClick={onReset} disabled={!active}>
            Reset filters
          </Button>
        </div>
      </div>
      {footer && <div className="border-t border-line px-3 py-2 sm:px-4">{footer}</div>}
    </section>
  );
}
