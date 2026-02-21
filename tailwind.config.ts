import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Neutrals — dominant palette
        bg:              '#FAFAF9',
        surface:         '#FFFFFF',
        border:          '#E7E5E4',
        'border-focus':  '#D6D3D1',
        text:            '#1C1917',
        'text-secondary':'#78716C',
        'text-tertiary': '#A8A29E',

        // Status — used sparingly
        confirmed:       '#16A34A',
        unconfirmed:     '#D97706',
        'not-started':   '#A8A29E',
        error:           '#DC2626',

        // Accent
        accent:          '#1C1917',
        'accent-hover':  '#292524',
        'accent-bg':     '#F5F5F4',

        // Cost highlight
        'cost-bg':       '#FEFCE8',

        // Legacy aliases (used in existing code — keep until fully migrated)
        primary:         '#1C1917',
        secondary:       '#78716C',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Geist Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '6px',
        sm:      '4px',
        md:      '6px',
        lg:      '8px',
        xl:      '10px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.04)',
        sm:   '0 1px 3px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}
export default config
