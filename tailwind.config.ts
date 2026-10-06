import type { Config } from 'tailwindcss';

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        line: v('line'),
        fg: v('fg'),
        muted: v('muted'),
        accent: v('accent'),
        loss: v('loss'),
        gain: v('gain'),
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { DEFAULT: '6px', md: '6px', lg: '8px' },
      keyframes: {
        slidein: {
          from: { transform: 'translateY(-8px)', opacity: '0', backgroundColor: 'rgb(var(--accent) / 0.08)' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        sweep: { from: { width: '0%' }, to: { width: '100%' } },
      },
      animation: {
        slidein: 'slidein 420ms ease-out',
      },
    },
  },
  plugins: [],
};
export default config;
