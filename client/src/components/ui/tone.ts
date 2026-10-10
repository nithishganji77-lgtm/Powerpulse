/** Shared tone vocabulary for badges, tiles and gauges. Status tones always ship with text and/or an icon. */
export type Tone = 'neutral' | 'accent' | 'healthy' | 'warning' | 'critical' | 'offline' | 'steel';

/** Text color class per tone. */
export const toneText: Record<Tone, string> = {
  neutral: 'text-fg',
  accent: 'text-accent',
  healthy: 'text-healthy',
  warning: 'text-warning',
  critical: 'text-critical',
  offline: 'text-offline',
  steel: 'text-steel',
};

/** Background (solid) class per tone, for bars and dots. */
export const toneBg: Record<Tone, string> = {
  neutral: 'bg-fg-muted',
  accent: 'bg-accent',
  healthy: 'bg-healthy',
  warning: 'bg-warning',
  critical: 'bg-critical',
  offline: 'bg-offline',
  steel: 'bg-steel',
};

/** Hairline-bordered, tinted chip styling per tone. */
export const toneChip: Record<Tone, string> = {
  neutral: 'border-line bg-raised text-fg-muted',
  accent: 'border-accent/40 bg-accent/10 text-accent',
  healthy: 'border-healthy/40 bg-healthy/10 text-healthy',
  warning: 'border-warning/40 bg-warning/10 text-warning',
  critical: 'border-critical/50 bg-critical/10 text-critical',
  offline: 'border-offline/40 bg-offline/10 text-offline',
  steel: 'border-steel/40 bg-steel/10 text-steel',
};

/** CSS rgb() color per tone, for SVG/charts (reads the design tokens). */
export const toneColor: Record<Tone, string> = {
  neutral: 'rgb(var(--fg-muted))',
  accent: 'rgb(var(--accent))',
  healthy: 'rgb(var(--healthy))',
  warning: 'rgb(var(--warning))',
  critical: 'rgb(var(--critical))',
  offline: 'rgb(var(--offline))',
  steel: 'rgb(var(--steel))',
};
