import type { NeueAnfragePayload } from '@/app/(dashboard)/anfragen/actions'
import type { StaffFunnelState } from '@/lib/anfragen/staff-funnel-types'
import { needsBeratungPfad } from '@/lib/anfragen/staff-funnel-steps'
import { normalizeSituation } from '@/lib/vorab-formular-config'

export function staffFunnelKontaktName(state: StaffFunnelState): string {
  const firma = state.firmaName.trim()
  if (firma) return firma
  const person = [state.vorname.trim(), state.nachname.trim()].filter(Boolean).join(' ')
  return person
}

export function staffFunnelToPayload(state: StaffFunnelState): NeueAnfragePayload | { error: string } {
  const name = staffFunnelKontaktName(state)
  if (!name) {
    return { error: 'Bitte Kunde/Name angeben (Firma oder Vor-/Nachname).' }
  }
  if (!state.email.trim() && !state.telefon.trim()) {
    return { error: 'Bitte mindestens E-Mail oder Telefon angeben.' }
  }
  if (!state.situation) {
    return { error: 'Bitte eine Situation wählen.' }
  }
  if (state.situation !== 'gewerbe' && state.bereiche.length === 0) {
    return { error: 'Bitte mindestens einen Bereich wählen.' }
  }

  const situationNorm = normalizeSituation(state.situation) || state.situation
  const beratung = needsBeratungPfad(state) || state.preisModus === 'komplex'

  const fachdetails = Object.fromEntries(
    Object.entries(state.fachdetails)
      .filter(([, v]) => v)
      .map(([k, v]) => [k, [v]])
  )
  if (state.badAusstattung && !fachdetails.bad_ausstattung) {
    fachdetails.bad_ausstattung = [state.badAusstattung]
  }

  const funnel_daten: Record<string, unknown> = {
    situation: state.situation,
    bereiche: state.bereiche,
    kundentyp: state.kundentyp || null,
    vorname: state.vorname.trim() || null,
    nachname: state.nachname.trim() || null,
    strasse: state.strasse.trim() || null,
    hausnummer: state.hausnummer.trim() || null,
    plz: state.plz.trim() || null,
    ort: state.ort.trim() || null,
    zeitraum: state.zeitraum || null,
    zustand: state.zustand || null,
    dringlichkeit: state.dringlichkeit || null,
    zugaenglichkeit: state.zugaenglichkeit || null,
    badAusstattung: state.badAusstattung || null,
    umfang: state.umfang || null,
    fachdetails,
    groessen: state.groessen,
    groessen_einheiten: state.groessenEinheiten,
    preis_modus: beratung ? 'komplex' : 'normal',
    funnel_quelle: 'crm_staff_funnel',
    quelle: 'crm_staff_funnel',
    preis_hinweis: state.preisHinweis || null,
    beratung_text: state.beratungText.trim() || null,
  }

  const kundentyp = state.kundentyp.trim() || null

  return {
    kunde_id: state.kundeId,
    name,
    vorname: state.vorname.trim() || null,
    nachname: state.nachname.trim() || null,
    email: state.email.trim(),
    telefon: state.telefon.trim(),
    plz: state.plz.trim(),
    strasse: state.strasse.trim() || null,
    hausnummer: state.hausnummer.trim() || null,
    ort: state.ort.trim() || null,
    kanal: state.kanal,
    situation: situationNorm,
    bereiche: state.situation === 'gewerbe' ? ['gewerbe'] : state.bereiche,
    preis_min: beratung ? null : state.preisMin,
    preis_max: beratung ? null : state.preisMax,
    zeitraum: state.zeitraum || state.dringlichkeit || null,
    kundentyp,
    kontakt_nachricht: [state.freitext.trim(), state.beratungText.trim()].filter(Boolean).join('\n\n') || null,
    funnel_daten,
    notizen: state.interneNotiz.trim(),
    ist_bauprojekt: state.istBauprojekt,
  }
}
