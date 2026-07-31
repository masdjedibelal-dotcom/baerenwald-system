import type { NeueAnfragePayload } from '@/app/(dashboard)/anfragen/actions'
import type { StaffFunnelState } from '@/lib/anfragen/staff-funnel-types'
import { STAFF_ANLIEGEN, anliegenToSituation } from '@/lib/anfragen/staff-funnel-types'
import { needsBeratungPfad } from '@/lib/anfragen/staff-funnel-steps'
import { normalizeSituation } from '@/lib/vorab-formular-config'
import { situationBereichTitel } from '@/lib/vorgang/vorgang-anzeige-titel'

export function staffFunnelKontaktName(state: StaffFunnelState): string {
  const firma = state.firmaName.trim()
  if (firma) return firma
  const person = [state.vorname.trim(), state.nachname.trim()].filter(Boolean).join(' ')
  return person
}

/** Wie Website: Titel aus Situation + Bereichen; sonst Anliegen-Label / Freitext. */
export function resolveStaffFunnelVorhaben(state: StaffFunnelState): string {
  const manual = state.vorhaben.trim()
  if (manual) return manual
  if (state.erfassungsModus === 'frei') return ''
  const sit = state.situation || anliegenToSituation(state.anliegen) || ''
  const fromCards = situationBereichTitel(sit, state.bereiche)
  if (fromCards) return fromCards
  return STAFF_ANLIEGEN.find((a) => a.id === state.anliegen)?.label ?? ''
}

export function staffFunnelToPayload(state: StaffFunnelState): NeueAnfragePayload | { error: string } {
  const isFrei = state.erfassungsModus === 'frei'
  const name = staffFunnelKontaktName(state)
  if (!name) {
    return { error: 'Bitte Kunde/Name angeben (Firma oder Vor-/Nachname).' }
  }
  if (!state.email.trim() && !state.telefon.trim()) {
    return { error: 'Bitte mindestens E-Mail oder Telefon angeben.' }
  }

  const vorhaben = resolveStaffFunnelVorhaben(state)
  if (isFrei && !vorhaben) {
    return { error: 'Bitte Vorhaben angeben.' }
  }

  const situationRaw =
    state.situation || anliegenToSituation(state.anliegen) || (isFrei ? 'erneuern' : '')
  if (!situationRaw) {
    return { error: 'Bitte ein Anliegen wählen.' }
  }
  if (!vorhaben && !isFrei) {
    return { error: 'Bitte ein Anliegen wählen.' }
  }

  const isGewerbe = state.anliegen === 'gewerbe' || situationRaw === 'gewerbe'
  const isTermin = state.anliegen === 'termin'
  const isHv = state.anliegen === 'hausverwaltung'

  if (!isFrei && !isGewerbe && !isTermin && state.bereiche.length === 0) {
    return { error: 'Bitte mindestens einen Bereich wählen.' }
  }

  const situationNorm = normalizeSituation(situationRaw) || situationRaw
  const beratung =
    isTermin ||
    isGewerbe ||
    needsBeratungPfad({ ...state, situation: situationNorm }) ||
    state.preisModus === 'komplex'

  const fachdetails = Object.fromEntries(
    Object.entries(state.fachdetails)
      .filter(([, v]) => v)
      .map(([k, v]) => [k, [v]])
  )
  if (state.badAusstattung && !fachdetails.bad_ausstattung) {
    fachdetails.bad_ausstattung = [state.badAusstattung]
  }

  const beschreibung = [state.freitext.trim(), state.beratungText.trim()]
    .filter(Boolean)
    .join('\n\n')

  const funnel_daten: Record<string, unknown> = {
    situation: situationNorm,
    anliegen: state.anliegen || null,
    vorhaben: vorhaben || null,
    bereiche: isGewerbe ? ['gewerbe'] : state.bereiche,
    kundentyp: state.kundentyp || (isHv ? 'verwaltung' : null),
    vorname: state.vorname.trim() || null,
    nachname: state.nachname.trim() || null,
    strasse: state.strasse.trim() || null,
    hausnummer: state.hausnummer.trim() || null,
    plz: state.plz.trim() || null,
    ort: state.ort.trim() || null,
    zeitraum: state.zeitraum || null,
    budget_hinweis: state.budgetHinweis.trim() || null,
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
    erfassungs_modus: state.erfassungsModus,
    preis_hinweis: state.preisHinweis || null,
    beratung_text: state.beratungText.trim() || null,
  }

  const kundentyp =
    state.kundentyp.trim() ||
    (isHv ? 'verwaltung' : isGewerbe ? 'gewerbe' : null)

  const kanal = isHv ? 'hv_manuell' : state.kanal

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
    kanal,
    situation: situationNorm,
    bereiche: isGewerbe ? ['gewerbe'] : state.bereiche,
    preis_min: beratung ? null : state.preisMin,
    preis_max: beratung ? null : state.preisMax,
    zeitraum: state.zeitraum || state.dringlichkeit || null,
    kundentyp,
    kontakt_nachricht:
      [vorhaben, beschreibung].filter(Boolean).join('\n\n') || null,
    funnel_daten,
    notizen: state.interneNotiz.trim(),
    ist_bauprojekt: state.istBauprojekt,
    anlass: isHv ? 'meldung' : undefined,
    auftraggeber_kunde_id:
      isHv && state.kundeId && kundentyp === 'verwaltung' ? state.kundeId : undefined,
  }
}
