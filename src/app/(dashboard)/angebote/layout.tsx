import type { Metadata } from 'next'
import { AngeboteMasterDetailShell } from '@/components/angebote/AngeboteMasterDetailShell'
import { loadAngeboteListe } from '@/lib/angebote/angebote-liste-data'

export const metadata: Metadata = {
  title: 'Angebote',
}

export default async function AngeboteLayout({ children }: { children: React.ReactNode }) {
  const { angebote, angebotIdsMitAuftrag, angebotIdsMitRechnung, error } = await loadAngeboteListe()

  if (error) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
        <p className="font-medium">Angebote konnten nicht geladen werden.</p>
        <p className="mt-1 opacity-90">{error}</p>
      </div>
    )
  }

  return (
    <AngeboteMasterDetailShell
      angebote={angebote}
      angebotIdsMitAuftrag={angebotIdsMitAuftrag}
      angebotIdsMitRechnung={angebotIdsMitRechnung}
    >
      {children}
    </AngeboteMasterDetailShell>
  )
}
