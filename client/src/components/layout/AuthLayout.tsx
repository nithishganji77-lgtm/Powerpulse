import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Split layout for /login and /demo: light editorial brand column (landing palette)
 * and a dark industrial working column (app palette).
 */
export function AuthLayout({ aside, children }: { aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
      <div className="flex flex-col justify-between gap-10 bg-paper px-5 py-6 text-ink sm:px-10 sm:py-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1.5 rounded-sm font-mono text-label uppercase text-muted hover:text-ink">
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            Back to home
          </Link>
          <span className="font-mono text-label uppercase text-muted">Transformer monitoring</span>
        </div>
        <div>
          <p className="font-display text-display-sm font-semibold tracking-tight">PowerPulse</p>
          <p className="mt-3 max-w-md font-display text-display-md font-semibold leading-[0.95] tracking-tight">
            See the fault before the failure.
          </p>
          {aside && <div className="mt-6 max-w-md text-sm leading-relaxed text-muted">{aside}</div>}
        </div>
        <p className="hidden font-mono text-label uppercase text-muted lg:block">
          Monitoring · Fault detection · Maintenance
        </p>
      </div>
      <div className="flex items-center justify-center bg-canvas px-5 py-10 text-fg [color-scheme:light] sm:px-10">
        <main id="main-content" className="w-full max-w-sm">
          {children}
        </main>
      </div>
    </div>
  );
}
