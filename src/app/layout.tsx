import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
})

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
      <body className={`${inter.className} min-h-dvh bg-bw-bg text-bw-text antialiased`}>{children}</body>
    </html>
  )
}
