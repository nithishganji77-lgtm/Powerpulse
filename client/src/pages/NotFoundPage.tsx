import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ButtonLink } from '@/components/ui/Button';

export default function NotFoundPage() {
  const { status } = useAuth();
  useEffect(() => {
    document.title = 'Not found · PowerPulse';
  }, []);
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-base px-6 text-center text-fg [color-scheme:dark]"
    >
      <p className="font-mono text-label uppercase text-fg-muted">404 · No signal</p>
      <h1 className="font-display text-display-sm font-semibold tracking-tight">This page isn’t on the grid.</h1>
      <p className="max-w-md text-sm text-fg-muted">The address may be mistyped, or the page has moved.</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {status === 'authenticated' ? (
          <ButtonLink to="/dashboard" variant="primary" arrow>
            Go to dashboard
          </ButtonLink>
        ) : (
          <ButtonLink to="/login" variant="primary" arrow>
            Sign in
          </ButtonLink>
        )}
        <ButtonLink to="/" variant="secondary">
          Home
        </ButtonLink>
      </div>
    </main>
  );
}
