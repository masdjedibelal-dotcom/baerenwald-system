import type { LeadStatus } from '@/lib/types'

type AngebotKurzStatus = { id: string; status: string }

/** Funnel-/StatusActions-Daten aus verknüpften Angeboten. */
export function leadAngebotFunnelFromListe(
  angebote: AngebotKurzStatus[] | null | undefined,
  funnelAngebotId?: string
): {
  angebot_id?: string
  angebot_href?: string
  angebot_angenommen: boolean
} {
  const list = Array.isArray(angebote) ? angebote : []
  const accepted = list.find((a) => a.status === 'kunde_akzeptiert')
  const preferred = accepted ?? list[0]
  const angebotId = preferred?.id ?? funnelAngebotId
  return {
    angebot_id: angebotId,
    angebot_href: angebotId ? `/angebote/${angebotId}` : undefined,
    angebot_angenommen: Boolean(accepted),
  }
}

export const LEAD_STATUS_VOR_ANGEBOT: LeadStatus[] = ['neu', 'kontaktiert', 'termin']

const VOR_ANGEBOT = LEAD_STATUS_VOR_ANGEBOT

export function leadStatusVorAngebot(status: LeadStatus): boolean {
  return VOR_ANGEBOT.includes(status)
}
