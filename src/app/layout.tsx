import type { Metadata, Viewport } from 'next'
import './globals.css'
/* Mock-Listen/Shell-Klassen (.vg-row, .listbar, …) — Tokens liegen in globals.css */
import '../styles/mock-design-system.css'
import '../styles/staff-funnel.css'

export const metadata: Metadata = {
  title: 'Bärenwald CRM',
  description: 'Bärenwald München',
  manifest: '/manifest.json',
  applicationName: 'Bärenwald CRM',
  appleWebApp: {
    capable: true,
    title: 'Bärenwald CRM',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
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
