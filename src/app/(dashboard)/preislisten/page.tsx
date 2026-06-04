import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import { PreislistenClient } from '@/components/preislisten/PreislistenClient'
import type { Gewerk, Preisliste } from '@/lib/types'
import { sortPreislistenRows } from '@/lib/preislisten-sort'

export const metadata: Metadata = {
  title: 'Preislisten',
}

export const revalidate = 60

function normalizePreislistenRow(r: Record<string, unknown>): Preisliste {
  const base = r as unknown as Preisliste
  return {
    ...base,
    kategorie: typeof base.kategorie === 'string' ? base.kategorie : '',
  }
}

/** Editor — primärer Einstieg über Einstellungen → Preislisten. */
export default async function PreislistenPage() {
  const supabase = createClient()
  const [{ data: rows, error }, { data: gewerke }] = await Promise.all([
    supabase
      .from('preislisten')
      .select('*, gewerke(id, name, slug, aktiv)')
      .eq('aktiv', true)
      .order('leistung', { ascending: true }),
    supabase.from('gewerke').select('id, name, slug, aktiv').order('name', { ascending: true }),
  ])

  if (error) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
        <p className="font-medium">Preislisten konnten nicht geladen werden.</p>
        <p className="mt-1 opacity-90">{error.message}</p>
      </div>
    )
  }

  const gw = (gewerke ?? []) as Gewerk[]
  const normalized = (rows ?? []).map((r) => normalizePreislistenRow(r as Record<string, unknown>))
  const sorted = sortPreislistenRows(normalized)

  return (
    <div className="rounded-xl bg-app-grouped p-4 md:p-6">
      <PreislistenClient initialRows={sorted} gewerkeAlle={gw} />
    </div>
  )
}
