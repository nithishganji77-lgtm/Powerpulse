import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'group/btn relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-sm font-sans font-medium ' +
  'transition-colors duration-fast ease-out disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-ink hover:bg-accent/85 active:bg-accent/75',
  secondary: 'border border-line bg-raised text-fg hover:border-fg-muted/60 hover:bg-raised/70',
  ghost: 'text-fg-muted hover:bg-raised hover:text-fg',
  danger: 'border border-critical/60 bg-critical/10 text-critical hover:bg-critical/20',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-11 px-5 text-sm',
};

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
}

/** Class string for anything that should look like a button (e.g. anchors). */
export function buttonClasses({ variant = 'secondary', size = 'md', block, className }: ButtonStyleOptions = {}) {
  return clsx(base, variants[variant], sizes[size], block && 'w-full', className);
}

function Content({ icon, arrow, children }: { icon?: ReactNode; arrow?: boolean; children?: ReactNode }) {
  return (
    <>
      {icon && <span className="-ml-0.5 inline-flex shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
      {children}
      {arrow && (
        <ArrowRight
          aria-hidden="true"
          className="h-4 w-4 shrink-0 transition-transform duration-base ease-out group-hover/btn:translate-x-1 motion-reduce:transition-none"
        />
      )}
    </>
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, Omit<ButtonStyleOptions, 'className'> {
  loading?: boolean;
  /** Leading icon (lucide element). */
  icon?: ReactNode;
  /** Trailing arrow that slides on hover. */
  arrow?: boolean;
}

/**
 * Primary action control. `loading` disables the button, shows a spinner and sets aria-busy.
 * Variants: primary (accent, one per view), secondary, ghost, danger.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, className, loading, icon, arrow, disabled, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses({ variant, size, block, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <Content icon={loading ? <Spinner size="xs" /> : icon} arrow={arrow}>
        {children}
      </Content>
    </button>
  );
});

export interface ButtonLinkProps extends LinkProps, Omit<ButtonStyleOptions, 'className'> {
  icon?: ReactNode;
  arrow?: boolean;
}

/** A react-router Link styled as a Button. */
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  { variant, size, block, className, icon, arrow, children, ...rest },
  ref,
) {
  return (
    <Link ref={ref} className={buttonClasses({ variant, size, block, className: className as string })} {...rest}>
      <Content icon={icon} arrow={arrow}>
        {children}
      </Content>
    </Link>
  );
});
