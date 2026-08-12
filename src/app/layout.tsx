import type { Metadata, Viewport } from 'next'
import './globals.css'
/* Mock-Listen/Shell-Klassen (.vg-row, .listbar, …) — Tokens liegen in globals.css */
import '../styles/mock-design-system.css'
import '../styles/staff-funnel.css'

export const metadata: Metadata = {
  title: 'Bärenwald CRM',
  description: 'Bärenwald München',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/brand/logo-mark-green.png', type: 'image/png' }],
    apple: [{ url: '/brand/logo-mark-green.png', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1A3D2B',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de">
      <body className="min-h-dvh bg-bw-bg text-bw-text antialiased">{children}</body>
    </html>
  )
}
