import type { Metadata } from 'next'
import { PageHeader } from '@/components/layout/PageHeader'
import { CustomFieldsEinstellungenClient } from '@/components/einstellungen/CustomFieldsEinstellungenClient'
import { loadAllCustomFieldDefinitions } from '@/app/(dashboard)/einstellungen/felder/actions'

export const metadata: Metadata = {
  title: 'Custom Fields',
}

export default async function EinstellungenFelderPage() {
  const initial = await loadAllCustomFieldDefinitions()
  return (
    <div>
      <PageHeader
        title="Custom Fields"
        breadcrumbs={[
          { label: 'Einstellungen', href: '/einstellungen/firma' },
          { label: 'Custom Fields' },
        ]}
        description="Zusätzliche Felder für Anfragen, Aufträge und Kunden."
      />
      <CustomFieldsEinstellungenClient initial={initial} />
    </div>
  )
}
