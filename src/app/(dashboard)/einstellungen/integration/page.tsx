import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EinstellungenIntegrationClient } from '@/components/einstellungen/EinstellungenIntegrationClient'
import { loadComplianceTypen } from '@/app/(dashboard)/einstellungen/compliance/actions'
import { loadAllCustomFieldDefinitions } from '@/app/(dashboard)/einstellungen/felder/actions'
import {
  loadDatenschutzAnfragen,
  loadDatenschutzFaellige,
  loadDatenschutzFristen,
  loadDatenschutzLog,
} from '@/lib/datenschutz/queries'

export const metadata: Metadata = {
  title: 'Integrationen',
}

export default async function EinstellungenIntegrationPage() {
  const [compliance, felder, fristen, faellig, log, anfragen] = await Promise.all([
    loadComplianceTypen(),
    loadAllCustomFieldDefinitions(),
    loadDatenschutzFristen(),
    loadDatenschutzFaellige(),
    loadDatenschutzLog(200),
    loadDatenschutzAnfragen(),
  ])

  return (
    <div>
      <PageHeader description="Compliance, Datenschutz und erweiterte Felder." />
      <Suspense fallback={<p className="text-sm text-bw-text-muted">Laden …</p>}>
        <EinstellungenIntegrationClient
          compliance={compliance}
          felder={felder}
          datenschutz={{ fristen, faellig, log, anfragen }}
        />
      </Suspense>
    </div>
  )
}
