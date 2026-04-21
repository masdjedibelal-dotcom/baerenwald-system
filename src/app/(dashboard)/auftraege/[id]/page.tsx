import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { AuftragDetailClient } from '@/components/auftraege/AuftragDetailClient'
import { loadAuftragFinanzenClientPayload } from '@/app/(dashboard)/auftraege/load-auftrag-finanzen-client-props'
import { loadAuftragDetail, loadEmailLogForAuftrag, listFormularTemplates } from '@/app/(dashboard)/auftraege/actions'
import type { Preisliste } from '@/lib/types'

export default async function AuftragDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const [detail, templates, emailLog, finanzenPayload, gwRes, plRes] = await Promise.all([
    loadAuftragDetail(params.id),
    listFormularTemplates(),
    loadEmailLogForAuftrag(params.id),
    loadAuftragFinanzenClientPayload(params.id),
    supabase.from('gewerke').select('id, name, slug').eq('aktiv', true).order('name'),
    supabase.from('preislisten').select('*').order('gewerk_id'),
  ])

  if (!detail) notFound()

  return (
    <AuftragDetailClient
      detail={detail}
      templates={templates}
      emailLog={emailLog}
      finanzenPayload={finanzenPayload}
      gewerke={(gwRes.data ?? []) as { id: string; name: string; slug: string }[]}
      preislisten={(plRes.data ?? []) as Preisliste[]}
    />
  )
}
