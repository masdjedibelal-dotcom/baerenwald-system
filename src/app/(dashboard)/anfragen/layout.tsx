import { Suspense } from 'react'
import { AnfragenMasterDetailShell } from '@/components/anfragen/AnfragenMasterDetailShell'
import { LegacyDemoAnfragenBanner } from '@/components/anfragen/LegacyDemoAnfragenBanner'
import { loadAnfragenListe } from '@/lib/anfragen/anfragen-liste-data'

export default async function AnfragenLayout({ children }: { children: React.ReactNode }) {
  const { leads, legacyDemoCount, error } = await loadAnfragenListe()

  return (
    <div className="max-md:pb-mobile-fab-extra">
      <LegacyDemoAnfragenBanner count={legacyDemoCount} />
      {error ? (
        <div className="rounded-lg border border-status-cancel-bg bg-status-cancel-bg/30 p-4 text-sm text-status-cancel-text">
          <p className="font-medium">Anfragen konnten nicht geladen werden.</p>
          <p className="mt-1 opacity-90">{error}</p>
        </div>
      ) : (
        <AnfragenMasterDetailShell leads={leads}>{children}</AnfragenMasterDetailShell>
      )}
    </div>
  )
}
