import type { KundeDetailPayload } from '@/lib/kunden/load-kunde-detail'

function neuesteLeadId(kunde: KundeDetailPayload): string | null {
  const leads = [...(kunde.leads ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  return leads[0]?.id ?? null
}

/** Angebot mit Kundenakzept, noch ohne Auftrag — für „Auftrag erstellen“. */
export function findeAngebotFuerAuftrag(kunde: KundeDetailPayload): string | null {
  for (const l of kunde.leads ?? []) {
    for (const a of l.angebote ?? []) {
      if (a.status === 'kunde_akzeptiert' && !a.auftrag_id) return a.id
    }
  }
  return null
}

export function kundeNeueAnfrageHref(kundeId: string): string {
  return `/anfragen?neu=1&kunde_id=${encodeURIComponent(kundeId)}`
}

export function kundeNeuesAngebotHref(kunde: KundeDetailPayload): string {
  const leadId = neuesteLeadId(kunde)
  if (leadId) {
    return `/anfragen/${leadId}?angebot_wizard=1`
  }
  return `/anfragen?neu=1&kunde_id=${encodeURIComponent(kunde.id)}&ziel=angebot`
}

export function kundeNeuerAuftragHref(kunde: KundeDetailPayload): string {
  const angebotId = findeAngebotFuerAuftrag(kunde)
  if (angebotId) return `/angebote/${angebotId}`
  const leadId = neuesteLeadId(kunde)
  if (leadId) return `/anfragen/${leadId}?angebot_wizard=1`
  return `/anfragen?neu=1&kunde_id=${encodeURIComponent(kunde.id)}&ziel=angebot`
}
