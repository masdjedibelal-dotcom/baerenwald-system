import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import { listKatalogPositionen } from '@/app/(dashboard)/katalog/actions'
import { KatalogPreislistenClient } from '@/components/preislisten/KatalogPreislistenClient'
import { PreislistenClient } from '@/components/preislisten/PreislistenClient'
import type { Gewerk, Preisliste } from '@/lib/types'
import { sortPreislistenRows } from '@/lib/preislisten-sort'

export const metadata: Metadata = {
  title: 'Preislisten',
}

function normalizePreislistenRow(r: Record<string, unknown>): Preisliste {
  const base = r as unknown as Preisliste
  return {
    ...base,
    kategorie: typeof base.kategorie === 'string' ? base.kategorie : '',
  }
}

/** Einstellungen → Preise: Katalog (neu) + Legacy-Preisliste bis Umstellung. */
export default async function EinstellungenPreisePage() {
  const supabase = createClient()
  const [{ data: rows, error }, { data: gewerke }, katalogRows] = await Promise.all([
    supabase
      .from('preislisten')
      .select('*, gewerke(id, name, slug, aktiv)')
      .eq('aktiv', true)
      .order('leistung', { ascending: true }),
    supabase.from('gewerke').select('id, name, slug, aktiv').order('name', { ascending: true }),
    listKatalogPositionen({ nurAktiv: false }),
  ])

  const gw = (gewerke ?? []) as Gewerk[]
  const hatKatalog = katalogRows.length > 0

  if (error && !hatKatalog) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
        <p className="font-medium">Preislisten konnten nicht geladen werden.</p>
        <p className="mt-1 opacity-90">{error.message}</p>
      </div>
    )
  }

  const normalized = (rows ?? []).map((r) => normalizePreislistenRow(r as Record<string, unknown>))
  const sorted = sortPreislistenRows(normalized)

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h2 className="text-[15px] font-semibold text-bw-text">Preiskatalog</h2>
        <p className="text-[12px] text-bw-text-muted">
          Positionen mit Varianten. Freie Angebotspositionen werden nicht mehr zurückgeschrieben.
        </p>
        <KatalogPreislistenClient gewerkeAlle={gw} initialRows={katalogRows} />
      </section>

      {sorted.length > 0 ? (
        <section className="space-y-2 border-t border-bw-border pt-6">
          <h2 className="text-[15px] font-semibold text-bw-text-muted">
            Legacy-Preisliste {hatKatalog ? '(Übergang)' : ''}
          </h2>
          <PreislistenClient initialRows={sorted} gewerkeAlle={gw} />
        </section>
      ) : null}
    </div>
  )
}
