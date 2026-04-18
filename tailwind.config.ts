import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2E7D52',
        canvas: '#F7F6F3',
        surface: '#FFFFFF',
        ink: '#1E1E1E',
        muted: '#6B6B6B',
        border: '#E5E3DF',
        danger: '#DC2626',
        warning: '#D97706',
        sidebar: '#1A3D2B',
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '8px',
        md: '8px',
        sm: '8px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}
export default config
