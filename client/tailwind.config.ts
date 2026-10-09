import type { Config } from 'tailwindcss';

// Colors, type and motion are CSS variables defined in src/styles/tokens.css so the landing page
// (light, editorial) and the app (dark, industrial) share one brand system.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1600px' },
    extend: {
      colors: {
        paper: v('paper'),
        ink: v('ink'),
        muted: v('muted'),
        accent: v('accent'),
        warning: v('warning'),
        critical: v('critical'),
        steel: v('steel'),
        healthy: v('healthy'),
        offline: v('offline'),
        // Dark application surfaces
        base: v('base'),
        panel: v('panel'),
        raised: v('raised'),
        line: v('line'),
        fg: v('fg'),
        'fg-muted': v('fg-muted'),
      },
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        'display-xl': ['var(--text-display-xl)', { lineHeight: '0.88', letterSpacing: '-0.04em' }],
        'display-lg': ['var(--text-display-lg)', { lineHeight: '0.9', letterSpacing: '-0.035em' }],
        'display-md': ['var(--text-display-md)', { lineHeight: '0.95', letterSpacing: '-0.03em' }],
        'display-sm': ['var(--text-display-sm)', { lineHeight: '1', letterSpacing: '-0.02em' }],
        metric: ['var(--text-metric)', { lineHeight: '1', letterSpacing: '-0.03em' }],
        label: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.08em' }],
      },
      maxWidth: { content: 'var(--layout-content)', prose: 'var(--layout-prose)' },
      transitionTimingFunction: { out: 'var(--ease-out)', 'in-out': 'var(--ease-in-out)' },
      transitionDuration: { fast: 'var(--dur-fast)', base: 'var(--dur-base)', slow: 'var(--dur-slow)' },
      borderRadius: { sm: '2px', DEFAULT: '4px', md: '6px' },
    },
  },
  plugins: [],
} satisfies Config;
