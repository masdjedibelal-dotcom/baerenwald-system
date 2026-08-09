import { redirect } from 'next/navigation'

/**
 * FAB / Deep-Link: Angebots-Neu startet über Kundensuche auf /neu?art=angebot
 * bzw. mit lead_id direkt auf der Anfrage.
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
    redirect(`/neu?art=angebot&kunde_id=${encodeURIComponent(kundeId)}`)
  }

  if (searchParams.vorlage_id?.trim()) {
    redirect('/einstellungen/vorlagen')
  }

  redirect('/neu?art=angebot')
}
