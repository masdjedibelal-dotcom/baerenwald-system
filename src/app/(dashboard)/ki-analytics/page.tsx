import { KiHubClient } from '@/components/ki-hub/KiHubClient'
import { loadKiClusterAnalysen } from '@/lib/ki/queries'

export const metadata = {
  title: 'KI Hub — Bärenwald CRM',
}

export const dynamic = 'force-dynamic'

export default async function KiAnalyticsPage() {
  const analysen = await loadKiClusterAnalysen()

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
      <KiHubClient initialAnalysen={analysen} />
    </div>
  )
}
