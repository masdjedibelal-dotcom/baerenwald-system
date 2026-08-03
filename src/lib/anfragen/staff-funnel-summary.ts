import {
  DRINGLICHKEIT_OPTIONS,
  STAFF_SITUATIONEN,
  UMFANG_OPTIONS,
  ZEITRAUM_ERNEUERN_OPTIONS,
  ZUGAENGLICHKEIT_OPTIONS,
  ZUSTAND_OPTIONS,
  type StaffFunnelState,
} from '@/lib/anfragen/staff-funnel-types'
import { staffFunnelKontaktName } from '@/lib/anfragen/staff-funnel-payload'
import {
  fachdetailDisplayLabel,
  fachdetailPropLabel,
  groesseDisplay,
} from '@/lib/lead-funnel-daten'
import { groessePropLabel, KUNDENTYP_OPTIONS } from '@/lib/vorab-formular-config'
import { BEREICH_LABELS, KANAL_LABELS } from '@/lib/utils'

export type StaffFunnelSummaryRow = { label: string; value: string }

function optLabel(
  options: { value: string; label: string }[],
  value: string
): string {
  const v = value.trim()
  if (!v) return ''
  return options.find((o) => o.value === v)?.label ?? v
}

/**
 * Alle ausgefüllten Funnel-Felder für die Prüfen-Zusammenfassung (Staff-Funnel).
 * Gleiche Logik wie Anzeige in den Vorgangs-Details.
 */
export function buildStaffFunnelSummaryRows(state: StaffFunnelState): StaffFunnelSummaryRow[] {
  const rows: StaffFunnelSummaryRow[] = []
  const push = (label: string, value: string | null | undefined) => {
    const v = (value ?? '').trim()
    if (v) rows.push({ label, value: v })
  }

  push('Kunde', staffFunnelKontaktName(state))
  if (state.email.trim()) push('E-Mail', state.email)
  if (state.telefon.trim()) push('Telefon', state.telefon)
  push('Kanal', KANAL_LABELS[state.kanal] ?? state.kanal)

  const sit = STAFF_SITUATIONEN.find((s) => s.value === state.situation)
  push('Situation', sit?.label ?? state.situation)

  if (state.situation === 'gewerbe') {
    push('Bereiche', 'Gewerbe')
  } else if (state.bereiche.length) {
    push(
      'Bereiche',
      state.bereiche.map((b) => BEREICH_LABELS[b] ?? b).join(', ')
    )
  }

  push('Umfang / Rhythmus', optLabel(UMFANG_OPTIONS, state.umfang))
  push('Zugänglichkeit', optLabel(ZUGAENGLICHKEIT_OPTIONS, state.zugaenglichkeit))
  push('Zustand', optLabel(ZUSTAND_OPTIONS, state.zustand))

  const groessenEntries = Object.entries(state.groessen)
    .filter(([, v]) => Number.isFinite(v) && v > 0)
    .sort(([a], [b]) =>
      (BEREICH_LABELS[a] ?? a).localeCompare(BEREICH_LABELS[b] ?? b, 'de')
    )
  for (const [bereich, wert] of groessenEntries) {
    push(
      groessePropLabel(bereich),
      groesseDisplay(bereich, wert, state.groessenEinheiten[bereich])
    )
  }

  if (state.badAusstattung.trim()) {
    push(
      fachdetailPropLabel('bad_ausstattung', state.bereiche),
      fachdetailDisplayLabel('bad_ausstattung', state.badAusstattung)
    )
  }

  for (const [key, raw] of Object.entries(state.fachdetails)) {
    const v = (raw ?? '').trim()
    if (!v) continue
    if (key === 'bad_ausstattung' && state.badAusstattung.trim() === v) continue
    push(fachdetailPropLabel(key, state.bereiche), fachdetailDisplayLabel(key, v))
  }

  push('Dringlichkeit', optLabel(DRINGLICHKEIT_OPTIONS, state.dringlichkeit))
  push('Zeitraum', optLabel(ZEITRAUM_ERNEUERN_OPTIONS, state.zeitraum))
  push(
    'Kundentyp',
    KUNDENTYP_OPTIONS.find((k) => k.value === state.kundentyp)?.label ?? state.kundentyp
  )

  const adresse = [state.strasse.trim(), state.hausnummer.trim()].filter(Boolean).join(' ')
  push('Adresse', adresse)
  push('Ort', [state.plz, state.ort].filter((x) => x.trim()).join(' '))

  if (state.kundentyp === 'verwaltung') {
    const mieter = [state.mieterVorname.trim(), state.mieterNachname.trim()]
      .filter(Boolean)
      .join(' ')
    push('Mieter', mieter)
    const leistung = [
      [state.objektStrasse.trim(), state.objektHausnummer.trim()].filter(Boolean).join(' '),
      [state.objektPlz.trim(), state.objektOrt.trim()].filter(Boolean).join(' '),
    ]
      .filter(Boolean)
      .join(', ')
    push('Leistungsort', leistung)
  }

  if (state.preisModus === 'komplex') {
    push('Preis', 'Beratung / komplex')
  } else if (state.preisMin != null || state.preisMax != null) {
    push(
      'Preisrahmen',
      `${state.preisMin ?? '—'} – ${state.preisMax ?? '—'} €`
    )
  }
  push('Preis-Hinweis', state.preisHinweis)
  push('Beratung', state.beratungText)
  push('Freitext', state.freitext)
  push('Interne Notiz', state.interneNotiz)
  if (state.istBauprojekt) push('Bauprojekt', 'Ja')

  return rows
}
