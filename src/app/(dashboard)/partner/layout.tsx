import type { Metadata } from 'next'
import { PartnerMasterDetailShell } from '@/components/partner/PartnerMasterDetailShell'
import { loadPartnerListe } from '@/lib/partner/load-partner-liste'

export const metadata: Metadata = {
  title: 'Partner',
}

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const { partners, kategorien } = await loadPartnerListe()

  return (
    <PartnerMasterDetailShell partners={partners} kategorien={kategorien}>
      {children}
    </PartnerMasterDetailShell>
  )
}
