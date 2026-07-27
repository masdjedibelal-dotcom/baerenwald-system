import type { Config } from 'tailwindcss'
import forms from '@tailwindcss/forms'
import plugin from 'tailwindcss/plugin'

/** CSS-Var-Farbe mit Tailwind-/Opacity-Support (`bg-bw-border/50`). */
function withAlpha(cssVar: string) {
  return ({ opacityValue }: { opacityValue?: string }) => {
    if (opacityValue === undefined) return `var(${cssVar})`
    // Tailwind übergibt oft `var(--tw-*-opacity)` — Number() → NaN → transparenter Hintergrund.
    if (/var\s*\(/.test(opacityValue)) {
      return `color-mix(in srgb, var(${cssVar}) calc(${opacityValue} * 100%), transparent)`
    }
    const n = Number(opacityValue)
    if (Number.isNaN(n)) return `var(${cssVar})`
    return `color-mix(in srgb, var(${cssVar}) ${n * 100}%, transparent)`
  }
}

/**
 * Farben/Radien/Schatten spiegeln die Mock-:root-Tokens in globals.css.
 * bw-* = Aliase auf Mock-Werte (keine Parallelwelt).
 * bw-accent bleibt bewusst (Legacy), nichts Neues darauf aufbauen.
 */
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}', './src/app/globals.css'],
  theme: {
    extend: {
      colors: {
        'bw-primary': withAlpha('--green'),
        'bw-dark': withAlpha('--green-dark'),
        'bw-mid': withAlpha('--text-2'),
        'bw-light': withAlpha('--text-3'),
        'bw-pale': withAlpha('--text-4'),
        'bw-green-bg': withAlpha('--green-50'),

        /* Legacy Gold — behalten, nicht neu verwenden */
        'bw-accent': withAlpha('--bw-accent'),
        'bw-accent-bg': withAlpha('--bw-accent-bg'),

        'bw-bg': withAlpha('--bg'),
        'app-grouped': withAlpha('--bg-soft'),
        'bw-bg-soft': withAlpha('--bg-soft'),
        'bw-card': withAlpha('--card'),
        'bw-hover': withAlpha('--bg-soft'),
        /** Surface-Stufen — Alias auf bestehende Tokens (kein zweites Farbsystem) */
        'bw-surface': withAlpha('--card'),
        'bw-surface-2': withAlpha('--bg-soft'),
        'bw-surface-alt': withAlpha('--bg-soft'),
        'bw-muted': withAlpha('--text-3'),
        'bw-border': withAlpha('--border'),
        'bw-border-strong': withAlpha('--border-strong'),
        'bw-text': withAlpha('--text'),
        'bw-text-mid': withAlpha('--text-2'),
        'bw-text-muted': withAlpha('--text-3'),
        'bw-text-subtle': withAlpha('--text-4'),
        'bw-link': withAlpha('--green'),
        'bw-success': withAlpha('--green'),

        green: withAlpha('--green'),
        'green-dark': withAlpha('--green-dark'),
        'green-50': withAlpha('--green-50'),
        'bg-soft': withAlpha('--bg-soft'),

        'status-new-bg': withAlpha('--blue-bg'),
        'status-new-text': withAlpha('--blue-tx'),
        'status-contact-bg': withAlpha('--yel-bg'),
        'status-contact-text': withAlpha('--yel-tx'),
        'status-offer-bg': withAlpha('--status-offer-bg'),
        'status-offer-text': withAlpha('--status-offer-text'),
        'status-order-bg': withAlpha('--grn-bg'),
        'status-order-text': withAlpha('--grn-tx'),
        'status-done-bg': withAlpha('--gray-bg'),
        'status-done-text': withAlpha('--gray-tx'),
        'status-cancel-bg': withAlpha('--red-bg'),
        'status-cancel-text': withAlpha('--red-tx'),

        'sidebar-bg': withAlpha('--green-dark'),
        'sidebar-hover': withAlpha('--sidebar-hover'),
        'sidebar-active': withAlpha('--green'),
        'sidebar-text': withAlpha('--sidebar-text'),
        'sidebar-muted': withAlpha('--sidebar-muted'),

        primary: withAlpha('--green'),
        canvas: withAlpha('--bg'),
        surface: withAlpha('--card'),
        ink: withAlpha('--text'),
        muted: withAlpha('--text-3'),
        border: withAlpha('--border'),
        danger: withAlpha('--red-tx'),
        warning: '#c0622b',
        sidebar: withAlpha('--green-dark'),
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"Segoe UI"',
          'system-ui',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        xs: ['11.5px', { lineHeight: '1.4' }],
        sm: ['13px', { lineHeight: '1.5' }],
        base: ['14px', { lineHeight: '1.5' }],
        md: ['15px', { lineHeight: '1.5' }],
        lg: ['18px', { lineHeight: '1.4' }],
        xl: ['22px', { lineHeight: '1.3' }],
        '2xl': ['28px', { lineHeight: '1.2' }],
        chip: ['12.5px', { lineHeight: '1.4' }],
      },
      spacing: {
        11: '44px',
        18: '72px',
        22: '88px',
        'sidebar-rail': 'var(--sidebar-w)',
        topbar: 'var(--topbar-h)',
        'sidebar-expanded': 'var(--sidebar-expanded)',
      },
      borderWidth: {
        hairline: '0.5px',
      },
      zIndex: {
        header: '20',
        sidepanel: '40',
        'sidepanel-pop': '45',
        modal: '500',
        search: '100',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 2px 8px rgba(0,0,0,0.08)',
        lg: '0 4px 16px rgba(0,0,0,0.12)',
        card: 'var(--shadow)',
        pop: 'var(--shadow-pop)',
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: 'var(--r-sm)',
        xl: 'var(--r)',
        '2xl': 'var(--r-lg)',
        mock: 'var(--r)',
        'mock-sm': 'var(--r-sm)',
        'mock-lg': 'var(--r-lg)',
        pill: 'var(--r-pill)',
      },
      animation: {
        skeleton: 'skeleton 1.5s ease-in-out infinite',
        'slide-up': 'slideUp 200ms ease',
        'slide-right': 'slideRight 200ms ease',
        'fade-in': 'fadeIn 150ms ease',
      },
      keyframes: {
        skeleton: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [
    /** Nur Klassen-Strategie: sonst setzt forms `gray.500`-Rahmen auf alle Inputs (wirkt schwarz). */
    forms({ strategy: 'class' }),
    /** @apply border-hairline in globals.css — explizit, damit Netlify/Linux-Build nicht scheitert */
    plugin(({ addUtilities, theme }) => {
      addUtilities({
        '.border-hairline': {
          borderWidth: theme('borderWidth.hairline', '0.5px'),
        },
      })
    }),
  ],
}

export default config
