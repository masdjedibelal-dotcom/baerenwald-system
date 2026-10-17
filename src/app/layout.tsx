import type { Metadata, Viewport } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
/* Mock-Listen/Shell-Klassen (.vg-row, .listbar, …) — Tokens liegen in globals.css */
import '../styles/mock-design-system.css'
import '../styles/staff-funnel.css'
import { istTeo, MARKE, MARKE_ID } from '@/lib/marke'

/* Servus TEO: Manrope (nur geladen, wenn die Marke TEO aktiv ist — CSS nutzt die Variable nur bei data-marke="teo") */
const ICON_DIR = istTeo ? '/icons/teo' : '/icons'
const teoSchrift = Manrope({ subsets: ['latin'], variable: '--font-teo', display: 'swap' })

export const metadata: Metadata = {
  title: `${MARKE.name} CRM`,
  description: MARKE.nameLang,
  manifest: istTeo ? '/manifest-teo.json' : '/manifest.json',
  applicationName: MARKE.name,
  appleWebApp: {
    capable: true,
    title: MARKE.name,
    /* Mit viewport-fit=cover: Statusleiste über Content → Safe-Area-Insets greifen */
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: `${ICON_DIR}/pwa-192.png`, sizes: '192x192', type: 'image/png' },
      { url: `${ICON_DIR}/pwa-512.png`, sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: `${ICON_DIR}/apple-touch-icon.png`, sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: MARKE.themeColor,
  /* Pflicht für env(safe-area-inset-*) in Home-Screen-PWA */
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de" data-marke={MARKE_ID} className={istTeo ? teoSchrift.variable : undefined}>
      <body className="min-h-dvh bg-bw-bg text-bw-text antialiased">{children}</body>
    </html>
  )
}
