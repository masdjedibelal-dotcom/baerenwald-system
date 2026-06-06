import type { Metadata } from 'next'
import { RechnungenMasterDetailShell } from '@/components/rechnungen/RechnungenMasterDetailShell'
import { loadRechnungenListe } from '@/lib/rechnungen/rechnungen-liste-data'

export const metadata: Metadata = {
  title: 'Rechnungen',
}

export default async function RechnungenLayout({ children }: { children: React.ReactNode }) {
  const { rows, error, rlsHint } = await loadRechnungenListe()

  if (error) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
        <p className="font-medium">Rechnungen konnten nicht geladen werden.</p>
        <p className="mt-1 opacity-90">{error}</p>
        {rlsHint ? <p className="mt-2 text-xs opacity-80">{rlsHint}</p> : null}
      </div>
    )
  }

  return <RechnungenMasterDetailShell rows={rows}>{children}</RechnungenMasterDetailShell>
}
