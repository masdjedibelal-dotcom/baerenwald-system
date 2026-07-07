import { redirect } from 'next/navigation'

/**
 * Legacy-Route: Angebote entstehen aus Anfragen (Wizard).
 * - mit lead_id → Angebots-Auswahl der Anfrage
 * - mit angebot_id → Angebot-Detail (Wizard dort)
 * - sonst → Angebotsliste
 */
export default async function AngebotNeuRedirectPage({
  searchParams,
}: {
  searchParams: {
    lead_id?: string
    angebot_id?: string
    kopie_von?: string
    vorlage_id?: string
  }
}) {
  const leadId = searchParams.lead_id?.trim()
  const angebotId = searchParams.angebot_id?.trim()
  const kopieVon = searchParams.kopie_von?.trim()

  if (kopieVon && leadId) {
    redirect(`/anfragen/${leadId}?angebot_kopie_von=${encodeURIComponent(kopieVon)}`)
  }

  if (leadId) {
    redirect(`/anfragen/${leadId}/angebote`)
  }

  if (angebotId) {
    redirect(`/angebote/${angebotId}`)
  }

  if (searchParams.vorlage_id?.trim()) {
    redirect('/einstellungen/vorlagen')
  }

  redirect('/angebote')
}
