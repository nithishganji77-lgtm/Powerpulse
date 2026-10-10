import type { ReactNode } from 'react';
import { AlertOctagon } from 'lucide-react';
import clsx from 'clsx';
import type { Instant } from '@/types/api';
import { formatDateTime } from '@/utils/format';

export interface DetailItem {
  label: string;
  value: ReactNode;
  /** Span both columns. */
  wide?: boolean;
}

/** Compact two-column definition list for drawers. */
export function DetailGrid({ items, className }: { items: DetailItem[]; className?: string }) {
  return (
    <dl className={clsx('grid grid-cols-2 gap-x-4 gap-y-3', className)}>
      {items.map((it) => (
        <div key={it.label} className={clsx('min-w-0', it.wide && 'col-span-2')}>
          <dt className="font-mono text-label uppercase text-fg-muted">{it.label}</dt>
          <dd className="mt-0.5 break-words text-sm text-fg">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Titled section inside a drawer body. */
export function DrawerSection({
  title,
  actions,
  children,
  className,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx('border-b border-line px-4 py-4 last:border-b-0', className)} aria-label={title}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-mono text-label uppercase text-fg-muted">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}

export interface TimelineEntry {
  key: string;
  at: Instant;
  title: ReactNode;
  detail?: ReactNode;
  actor?: string | null;
}

/** Vertical event timeline (oldest first). */
export function Timeline({ items, emptyText = 'No events yet.' }: { items: TimelineEntry[]; emptyText?: string }) {
  if (items.length === 0) return <p className="text-xs text-fg-muted">{emptyText}</p>;
  return (
    <ol className="relative ml-1.5 border-l border-line">
      {items.map((e) => (
        <li key={e.key} className="relative pb-3 pl-4 last:pb-0">
          <span aria-hidden="true" className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full border border-line bg-raised" />
          <p className="text-sm text-fg">{e.title}</p>
          {e.detail && <p className="mt-0.5 whitespace-pre-wrap text-xs text-fg-muted">{e.detail}</p>}
          <p className="mt-0.5 font-mono text-[0.7rem] text-fg-muted">
            <time dateTime={e.at}>{formatDateTime(e.at)}</time>
            {e.actor ? ` · ${e.actor}` : ''}
          </p>
        </li>
      ))}
    </ol>
  );
}

/** Inline form-level error banner. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-sm border border-critical/50 bg-critical/10 px-3 py-2 text-sm text-critical">
      <AlertOctagon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

/** Short, readable id for cross-links ("#a1b2c3"). */
export function shortId(id: string): string {
  return `#${id.slice(-6)}`;
}
