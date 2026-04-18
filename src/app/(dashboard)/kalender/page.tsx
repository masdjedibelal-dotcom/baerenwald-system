import type { Metadata } from 'next'
import { KalenderClient } from '@/components/kalender/KalenderClient'

export const metadata: Metadata = {
  title: 'Kalender',
}

export const revalidate = 30

export default function KalenderPage() {
  return <KalenderClient />
}
