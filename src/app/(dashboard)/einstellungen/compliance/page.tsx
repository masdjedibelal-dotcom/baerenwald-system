import type { Metadata } from 'next'
import { PageHeader } from '@/components/layout/PageHeader'
import { ComplianceEinstellungenClient } from '@/components/einstellungen/ComplianceEinstellungenClient'
import { loadComplianceTypen } from '@/app/(dashboard)/einstellungen/compliance/actions'

export const metadata: Metadata = {
  title: 'Compliance',
}

export default async function EinstellungenCompliancePage() {
  const initial = await loadComplianceTypen()
  return (
    <div>
      <PageHeader
        title="Compliance"
        breadcrumbs={[
          { label: 'Einstellungen', href: '/einstellungen/firma' },
          { label: 'Compliance' },
        ]}
        description="Dokumenttypen für Handwerker-Compliance."
      />
      <ComplianceEinstellungenClient initial={initial} />
    </div>
  )
}
