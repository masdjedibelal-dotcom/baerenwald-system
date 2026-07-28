import type { Metadata } from 'next'
import { HandwerkerMasterDetailShell } from '@/components/handwerker/HandwerkerMasterDetailShell'
import { loadHandwerkerListe } from '@/lib/handwerker/load-handwerker-liste'

export const metadata: Metadata = {
  title: 'Handwerker',
}

export default async function HandwerkerLayout({ children }: { children: React.ReactNode }) {
  const { rows, gewerkeOptionen } = await loadHandwerkerListe()

  return (
    <HandwerkerMasterDetailShell rows={rows} gewerkeOptionen={gewerkeOptionen}>
      {children}
    </HandwerkerMasterDetailShell>
  )
}
