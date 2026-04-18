import type { Metadata } from 'next'
import { PageHeader } from '@/components/layout/PageHeader'
import { DatenschutzPageClient } from '@/components/datenschutz/DatenschutzPageClient'
import {
  loadDatenschutzAnfragen,
  loadDatenschutzFaellige,
  loadDatenschutzFristen,
  loadDatenschutzLog,
} from '@/lib/datenschutz/queries'

export const metadata: Metadata = {
  title: 'Datenschutz',
}

export default async function DatenschutzPage() {
  const [fristen, faellig, log, anfragen] = await Promise.all([
    loadDatenschutzFristen(),
    loadDatenschutzFaellige(),
    loadDatenschutzLog(200),
    loadDatenschutzAnfragen(),
  ])

  return (
    <div>
      <PageHeader title="Datenschutz & DSGVO" />
      <DatenschutzPageClient fristen={fristen} faellig={faellig} log={log} anfragen={anfragen} />
    </div>
  )
}
