import clsx from 'clsx';
import type { HealthFactor, TransformerStatus } from '@/types/api';
import { HealthGauge } from '@/components/ui/HealthGauge';
import { healthFactorLabel, humanize } from '@/utils/labels';
import { formatNumber } from '@/utils/format';

/** Health score + per-factor penalty bars (penalty / maxPenalty) with the backend's detail text. */
export function HealthBreakdown({ score, status, factors }: { score: number; status: TransformerStatus; factors: HealthFactor[] }) {
  return (
    <div className="flex flex-col gap-4">
      <HealthGauge score={score} status={status} size="lg" />
      <ul className="flex flex-col gap-3" aria-label="Health factors">
        {factors.map((f) => {
          const ratio = f.maxPenalty > 0 ? Math.min(1, f.penalty / f.maxPenalty) : 0;
          return (
            <li key={f.factor}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-fg">{healthFactorLabel[f.factor] ?? humanize(f.factor)}</span>
                <span className="tabular font-mono text-xs text-fg-muted">
                  −{formatNumber(f.penalty, 1)} / {formatNumber(f.maxPenalty)} pts
                </span>
              </div>
              <div
                className="mt-1 h-1.5 overflow-hidden rounded-sm bg-raised"
                role="img"
                aria-label={`${formatNumber(f.penalty, 1)} of ${formatNumber(f.maxPenalty)} penalty points`}
              >
                <div
                  className={clsx('h-full', ratio >= 0.66 ? 'bg-critical' : ratio >= 0.33 ? 'bg-warning' : ratio > 0 ? 'bg-steel' : 'bg-transparent')}
                  style={{ width: `${ratio * 100}%` }}
                />
              </div>
              {f.detail && <p className="mt-1 text-xs text-fg-muted">{f.detail}</p>}
            </li>
          );
        })}
      </ul>
      <p className="border-t border-line pt-3 text-xs text-fg-muted">
        Health is a transparent heuristic for prioritisation (100 minus factor penalties). It is not a probability of failure.
      </p>
    </div>
  );
}
