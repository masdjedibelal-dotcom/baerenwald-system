import type { Config } from 'tailwindcss'
import forms from '@tailwindcss/forms'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'bw-primary': '#2E7D52',
        'bw-dark': '#1A3D2B',
        'bw-mid': '#3D6B4F',
        'bw-light': '#6B9E80',
        'bw-pale': '#A8C5A0',
        'bw-green-bg': '#EAF3DE',

        'bw-accent': '#C4922A',
        'bw-accent-bg': '#FDF3E3',

        'bw-bg': '#F7F6F3',
        'bw-card': '#FFFFFF',
        'bw-hover': '#F0F4F0',
        'bw-border': '#E2E8E2',
        'bw-text': '#1E1E1E',
        'bw-text-mid': '#4A5568',
        'bw-text-muted': '#6B7280',
        'bw-link': '#2E7D52',

        'status-new-bg': '#EBF5FB',
        'status-new-text': '#1D6FA4',
        'status-contact-bg': '#FEF9E7',
        'status-contact-text': '#9A7D0A',
        'status-offer-bg': '#FEF0E6',
        'status-offer-text': '#C0622B',
        'status-order-bg': '#EAF3DE',
        'status-order-text': '#1A5C35',
        'status-done-bg': '#F2F4F2',
        'status-done-text': '#4A5568',
        'status-cancel-bg': '#FDEDEC',
        'status-cancel-text': '#A93226',

        'sidebar-bg': '#1A3D2B',
        'sidebar-hover': '#243D2E',
        'sidebar-active': '#2E7D52',
        'sidebar-text': '#A8C5A0',
        'sidebar-muted': '#6B9E80',

        // Legacy (bestehende Komponenten)
        primary: '#2E7D52',
        canvas: '#F7F6F3',
        surface: '#FFFFFF',
        ink: '#1E1E1E',
        muted: '#6B7280',
        border: '#E2E8E2',
        danger: '#A93226',
        warning: '#C0622B',
        sidebar: '#1A3D2B',
        'bw-success': '#2E7D52',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '1.4' }],
        sm: ['13px', { lineHeight: '1.5' }],
        base: ['14px', { lineHeight: '1.6' }],
        md: ['15px', { lineHeight: '1.5' }],
        lg: ['18px', { lineHeight: '1.4' }],
        xl: ['22px', { lineHeight: '1.3' }],
        '2xl': ['28px', { lineHeight: '1.2' }],
      },
      spacing: {
        18: '72px',
        22: '88px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 2px 8px rgba(0,0,0,0.08)',
        lg: '0 4px 16px rgba(0,0,0,0.12)',
        card: '0 1px 3px rgba(0,0,0,0.06)',
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
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
  plugins: [forms],
}

export default config
