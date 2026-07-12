import type { Metadata } from 'next'
import { AuftraegeMasterDetailShell } from '@/components/auftraege/AuftraegeMasterDetailShell'
import { loadAuftraegeListe } from '@/lib/auftraege/auftraege-liste-data'

export const metadata: Metadata = {
  title: 'Aufträge',
}

export default async function AuftraegeLayout({ children }: { children: React.ReactNode }) {
  const { auftraege, pipelineKontextByAuftragId, error } = await loadAuftraegeListe()

  if (error) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
        <p className="font-medium">Aufträge konnten nicht geladen werden.</p>
        <p className="mt-1 opacity-90">{error}</p>
      </div>
    )
  }

  return (
    <AuftraegeMasterDetailShell
      auftraege={auftraege}
      pipelineKontextByAuftragId={pipelineKontextByAuftragId}
    >
      {children}
    </AuftraegeMasterDetailShell>
  )
}
