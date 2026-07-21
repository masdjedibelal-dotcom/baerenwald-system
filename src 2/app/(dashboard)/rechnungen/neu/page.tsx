import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { RechnungNeuPageClient } from '@/components/rechnungen/RechnungNeuPageClient'
import {
  loadRechnungWizardBootstrapFromAuftrag,
  loadRechnungWizardKunde,
} from '@/app/(dashboard)/rechnungen/wizard-actions'
import { buildStandaloneRechnungWizardBootstrap } from '@/lib/rechnungen/rechnung-wizard-bootstrap-helpers'
import { defaultRechnungWizardMeta } from '@/lib/rechnungen/rechnung-wizard-types'
import type { Gewerk, Preisliste } from '@/lib/types'
import type { RechnungWizardBootstrap } from '@/lib/rechnungen/rechnung-wizard-types'

/**
 * Neue Rechnung:
 * - auftrag_id + neu=1 → immer neue Rechnung zum Auftrag (kein Auswahl-Modal)
 * - kunde_id → Direktrechnung für diesen Kunden
 * - auftrag_id ohne neu → Legacy-Auswahl
 */
export default async function RechnungNeuPage({
  searchParams,
}: {
  searchParams: { auftrag_id?: string; kunde_id?: string; neu?: string }
}) {
  const auftragId = searchParams.auftrag_id?.trim()
  const kundeId = searchParams.kunde_id?.trim()
  const forceNeu = searchParams.neu === '1'

  if (auftragId && !forceNeu) {
    redirect(`/auftraege/${auftragId}/rechnungen-auswahl`)
  }

  const supabase = createClient()
  const [firm, { data: gewerke }, { data: preisRaw }] = await Promise.all([
    fetchFirmenEinstellungen(supabase),
    supabase.from('gewerke').select('id, name, slug, aktiv').eq('aktiv', true).order('name'),
    supabase.from('preislisten').select('*').eq('aktiv', true),
  ])

  let bootstrap: RechnungWizardBootstrap = buildStandaloneRechnungWizardBootstrap(firm)

  if (auftragId && forceNeu) {
    const loaded = await loadRechnungWizardBootstrapFromAuftrag(auftragId)
    if (!loaded.ok) {
      redirect(`/rechnungen?err=${encodeURIComponent(loaded.message)}`)
    }
    bootstrap = loaded.bootstrap
  } else if (kundeId) {
    const k = await loadRechnungWizardKunde(kundeId)
    if (!k.ok) {
      redirect(`/rechnungen?err=${encodeURIComponent(k.message)}`)
    }
    bootstrap = {
      ...buildStandaloneRechnungWizardBootstrap(firm),
      kundeId: k.kunde.id,
      kunde: k.kunde,
      meta: defaultRechnungWizardMeta(k.zahlungszielTage, {
        kundeTyp: k.kunde.typ,
        firm,
      }),
    }
  }

  return (
    <RechnungNeuPageClient
      gewerke={(gewerke ?? []) as Gewerk[]}
      preislisten={(preisRaw ?? []) as Preisliste[]}
      firm={firm}
      bootstrap={bootstrap}
    />
  )
}
