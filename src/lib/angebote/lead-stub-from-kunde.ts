import { kundeDisplayName } from '@/lib/kunde-stammdaten'
import type { Kunde, LeadDetail } from '@/lib/types'

/**
 * Temporäre Lead-Hülle für den Angebots-Wizard ohne DB-Insert.
 * `id` bleibt leer — echte Anfrage entsteht erst beim Speichern/Fertigstellen.
 */
export function leadStubFromKunde(kunde: Kunde): LeadDetail {
  const name = kundeDisplayName(kunde)
  const now = new Date().toISOString()
  return {
    id: '',
    kunde_id: kunde.id,
    kanal: 'sonstiges',
    status: 'neu',
    situation: null,
    bereiche: [],
    preis_min: null,
    preis_max: null,
    budget_ca: null,
    plz: kunde.plz,
    zeitraum: null,
    kundentyp: kunde.typ || 'privat',
    funnel_daten: null,
    kontakt_name: name || null,
    kontakt_email: kunde.email,
    kontakt_telefon: kunde.telefon,
    kontakt_nachricht: null,
    notizen: null,
    erstellt_von: null,
    created_at: now,
    updated_at: now,
    kunden: kunde,
    angebote: [],
  }
}
