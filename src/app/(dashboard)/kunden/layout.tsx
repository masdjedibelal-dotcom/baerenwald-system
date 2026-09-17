import type { Metadata } from 'next'
import { KundenMasterDetailShell } from '@/components/kunden/KundenMasterDetailShell'
import { loadKundenListe } from '@/lib/kunden/kunden-liste-data'

export const metadata: Metadata = {
  title: 'Kunden',
}

export default async function KundenLayout({ children }: { children: React.ReactNode }) {
  let kunden: Awaited<ReturnType<typeof loadKundenListe>> = []
  try {
    kunden = await loadKundenListe()
  } catch (e) {
    console.error('KundenLayout', e)
  }

  return <KundenMasterDetailShell kunden={kunden}>{children}</KundenMasterDetailShell>
}
