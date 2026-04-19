import { createClient } from '@/lib/supabase-server'
import {
  HandwerkerListeClient,
  type HandwerkerZeile,
} from '@/components/handwerker/HandwerkerListeClient'

export default async function HandwercherPage({
  searchParams,
}: {
  searchParams: { filter?: string }
}) {
  const supabase = createClient()

  const einsatzFilter = searchParams.filter === 'einsatz'

  let einsatzIds: string[] = []
  if (einsatzFilter) {
    const { data: zu } = await supabase
      .from('auftrag_handwerker')
      .select('handwerker_id')
      .in('status', ['zugewiesen', 'in_arbeit'])
    einsatzIds = Array.from(
      new Set((zu ?? []).map((r) => r.handwerker_id as string))
    )
  }

  const { data, error } = await supabase
    .from('handwerker')
    .select('id, name, firma, email, telefon, gewerke, compliance_status, created_at')
    .order('name', { ascending: true })

  if (error) {
    return (
      <div className="rounded-lg border border-status-cancel-bg p-4 text-sm text-status-cancel-text">
        Handwercher konnten nicht geladen werden: {error.message}
      </div>
    )
  }

  let rows = (data ?? []) as HandwerkerZeile[]
  if (einsatzFilter) {
    if (einsatzIds.length === 0) {
      rows = []
    } else {
      const set = new Set(einsatzIds)
      rows = rows.filter((r) => set.has(r.id))
    }
  }

  return (
    <HandwerkerListeClient
      rows={rows}
      einsatzFilterAktiv={einsatzFilter}
    />
  )
}
