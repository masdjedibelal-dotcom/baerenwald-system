import { createClient } from '@/lib/supabase-server'
import { loadWizardContext } from '@/lib/wizard-context'
import { AngebotNeuFromKundeClient } from '@/components/angebote/AngebotNeuFromKundeClient'
import { AngebotNeuKundeGate } from '@/components/angebote/AngebotNeuKundeGate'
import { redirect } from 'next/navigation'
import type { Handwerker, Kunde } from '@/lib/types'

/**
 * FAB / Deep-Link „Neues Angebot“:
 * Ohne kunde_id → Kundenschritt (wie Anfrage-Funnel).
 * Mit lead_id → Wizard auf Anfrage.
 * Mit kunde_id → Wizard ohne vorab angelegte Anfrage (Lead erst beim Speichern).
 */
export default async function AngebotNeuRedirectPage({
  searchParams,
}: {
  searchParams: {
    lead_id?: string
    angebot_id?: string
    kopie_von?: string
    vorlage_id?: string
    kunde_id?: string
  }
}) {
  const leadId = searchParams.lead_id?.trim()
  const angebotId = searchParams.angebot_id?.trim()
  const kopieVon = searchParams.kopie_von?.trim()
  const kundeId = searchParams.kunde_id?.trim()

  if (kopieVon && leadId) {
    redirect(`/anfragen/${leadId}?angebot_kopie_von=${encodeURIComponent(kopieVon)}`)
  }

  if (leadId) {
    redirect(`/anfragen/${leadId}?angebot_wizard=1`)
  }

  if (angebotId) {
    redirect(`/angebote/${angebotId}`)
  }

  if (kundeId) {
    const supabase = createClient()
    const [{ data: kunde, error }, wizard, { data: handwerker }] = await Promise.all([
      supabase.from('kunden').select('*').eq('id', kundeId).maybeSingle(),
      loadWizardContext(supabase),
      supabase
        .from('handwerker')
        .select('id, name, email, telefon, firma, aktiv')
        .eq('aktiv', true)
        .order('name')
        .limit(200),
    ])

    if (error || !kunde) {
      return (
        <AngebotNeuKundeGate
          initialError={
            error?.message ||
            'Kunde nicht gefunden oder keine Berechtigung — bitte erneut wählen.'
          }
        />
      )
    }

    return (
      <AngebotNeuFromKundeClient
        kunde={kunde as Kunde}
        gewerke={wizard.gewerke}
        preislisten={wizard.preislisten}
        firm={wizard.firm}
        handwerker={(handwerker ?? []) as Handwerker[]}
      />
    )
  }

  if (searchParams.vorlage_id?.trim()) {
    redirect('/einstellungen/vorlagen')
  }

  return <AngebotNeuKundeGate />
}
