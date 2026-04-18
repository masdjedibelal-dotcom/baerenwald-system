import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bärenwald CRM',
  description: 'Internes CRM-Dashboard für Bärenwald',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de">
      <body className="min-h-dvh bg-canvas text-ink antialiased">{children}</body>
    </html>
  )
}
