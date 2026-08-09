import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { RechnungNeuPageClient } from '@/components/rechnungen/RechnungNeuPageClient'
import { RechnungNeuKundeGate } from '@/components/rechnungen/RechnungNeuKundeGate'
import {
  loadRechnungWizardBootstrapFromAuftrag,
  loadRechnungWizardKunde,
} from '@/app/(dashboard)/rechnungen/wizard-actions'
import { buildStandaloneRechnungWizardBootstrap } from '@/lib/rechnungen/rechnung-wizard-bootstrap-helpers'
import { defaultRechnungWizardMeta } from '@/lib/rechnungen/rechnung-wizard-types'
import type { Gewerk, Preisliste } from '@/lib/types'
import type { RechnungWizardBootstrap } from '@/lib/rechnungen/rechnung-wizard-types'

/**
 * Neue Rechnung — DocumentCanvas-Wizard (Mock).
 * - ohne kunde/auftrag → Kundenwahl im Canvas
 * - auftrag_id + neu=1 → Rechnung zum Auftrag
 * - kunde_id → Direktrechnung
 * - auftrag_id ohne neu → Auswahl bestehender Entwürfe
 */
export default async function RechnungNeuPage({
  searchParams,
}: {
  searchParams: { auftrag_id?: string; kunde_id?: string; neu?: string; err?: string }
}) {
  const auftragId = searchParams.auftrag_id?.trim()
  const kundeId = searchParams.kunde_id?.trim()
  const forceNeu = searchParams.neu === '1'

  if (auftragId && !forceNeu) {
    redirect(`/auftraege/${auftragId}/rechnungen-auswahl`)
  }

  if (!auftragId && !kundeId) {
    return <RechnungNeuKundeGate initialError={searchParams.err} />
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
      return <RechnungNeuKundeGate initialError={k.message} />
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
