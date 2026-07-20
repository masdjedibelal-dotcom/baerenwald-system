import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import {
  berechneRechnung,
  parseKleinunternehmerSetting,
} from '@/lib/rechnung-berechnung'
import { DEFAULT_MWST_SATZ } from '@/lib/rechnung-config'
import type { RechnungBerechnung } from '@/lib/rechnung-berechnung'
import type { AngebotPosition, RechnungBelegTyp } from '@/lib/types'

export type RechnungSpeichernInput = {
  positionen: AngebotPosition[]
  reverse_charge_13b?: boolean
}

export async function berechneRechnungMitFirmeneinstellungen(
  supabase: SupabaseClient,
  input: RechnungSpeichernInput
) {
  const positionen = normalizeAngebotPositionen(input.positionen)
  const firm = await fetchFirmenEinstellungen(supabase)
  const kleinunternehmer = parseKleinunternehmerSetting(firm.kleinunternehmer)
  const defaultMwstSatz = Math.max(0, parseInt(firm.mwst_satz, 10) || DEFAULT_MWST_SATZ)

  const berechnung = berechneRechnung(positionen, {
    kleinunternehmer,
    reverseCharge13b: Boolean(input.reverse_charge_13b),
    defaultMwstSatz,
  })

  return { positionen, firm, berechnung, kleinunternehmer, defaultMwstSatz }
}

export function positionenFuerGutschrift(positionen: AngebotPosition[]): AngebotPosition[] {
  return positionen.map((p) => {
    const m = p.menge || 1
    const netto = (p.lohn_netto + p.material_netto) * m
    const negNetto = -netto
    return {
      ...p,
      lohn_netto: -p.lohn_netto,
      material_netto: -p.material_netto,
      gesamt_min: negNetto,
      gesamt_max: negNetto,
    }
  })
}

const COMPLIANCE_COLUMN_MARKERS = [
  'beleg_typ',
  'bezug_rechnung_id',
  'reverse_charge_13b',
  'hinweis_35a',
  'mwst_aufschluesselung',
  'generate_beleg_nummer',
  'ust_id',
  'einleitung',
  'hinweise',
  'rechnung_art',
  'abschlag_index',
  'zahlungsplan_abschlag_id',
  'mail_einleitung',
  'mail_betreff',
  'zahlungsbedingungen',
] as const

/** PostgREST-Schema-Cache: Migration 20260521120000_rechnungen_compliance fehlt. */
export function isRechnungComplianceSchemaError(message: string | undefined): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  return COMPLIANCE_COLUMN_MARKERS.some((col) => m.includes(col))
}

export function rechnungComplianceMigrationHinweis(): string {
  return (
    'Datenbank-Schema veraltet: Bitte Migrationen ausführen — ' +
    'npm run db:rechnungen-compliance und npm run db:rechnung-nummer ' +
    '(SUPABASE_DB_URL in .env.local). Rechnungsnummern: RE2026-2069, RE2026-2070, …'
  )
}

export function dbFelderAusBerechnung(
  berechnung: RechnungBerechnung,
  extra: {
    reverse_charge_13b: boolean
    beleg_typ?: RechnungBelegTyp
    bezug_rechnung_id?: string | null
  },
  opts?: { ohneCompliance?: boolean }
) {
  const basis = {
    lohn_netto: berechnung.lohn_netto,
    material_netto: berechnung.material_netto,
    netto: berechnung.netto,
    mwst_satz: berechnung.mwst_satz,
    mwst_betrag: berechnung.mwst_betrag,
    brutto: berechnung.brutto,
  }
  if (opts?.ohneCompliance) return basis
  return {
    ...basis,
    mwst_aufschluesselung: berechnung.mwst_aufschluesselung,
    reverse_charge_13b: extra.reverse_charge_13b,
    beleg_typ: extra.beleg_typ ?? 'rechnung',
    bezug_rechnung_id: extra.bezug_rechnung_id ?? null,
  }
}

type RechnungBerechnungExtra = Parameters<typeof dbFelderAusBerechnung>[1]

function mapRechnungDbError(message: string | undefined): string | undefined {
  if (message && isRechnungComplianceSchemaError(message)) {
    return rechnungComplianceMigrationHinweis()
  }
  return message
}

/** Insert mit Fallback ohne Compliance-Spalten, falls Migration noch fehlt. */
export async function rechnungInsertMitSchemaFallback(
  supabase: SupabaseClient,
  row: Record<string, unknown>,
  berechnung: RechnungBerechnung,
  extra: RechnungBerechnungExtra
): Promise<{ data: { id: string } | null; error: { message: string } | null }> {
  const build = (ohneCompliance: boolean, ohneTexte = false, ohneAbschlag = false) => {
    const {
      einleitung,
      hinweise,
      mail_einleitung,
      mail_betreff,
      zahlungsbedingungen,
      rechnung_art,
      abschlag_index,
      zahlungsplan_abschlag_id,
      ...restRow
    } = row
    let base = ohneTexte ? restRow : row
    if (ohneTexte && zahlungsbedingungen) {
      const zb = String(zahlungsbedingungen).trim()
      const prev = String(hinweise ?? (restRow as { hinweise?: string }).hinweise ?? '').trim()
      if (zb) {
        base = {
          ...base,
          hinweise: prev ? `${prev}\n\n${zb}` : zb,
        }
      }
    }
    if (ohneAbschlag) {
      const {
        mail_einleitung: _m1,
        mail_betreff: _m2,
        rechnung_art: _r,
        abschlag_index: _a,
        zahlungsplan_abschlag_id: _z,
        ...restAbschlag
      } = base as Record<string, unknown>
      base = restAbschlag
    }
    return {
      ...base,
      ...dbFelderAusBerechnung(berechnung, extra, { ohneCompliance }),
    }
  }

  let result = await supabase.from('rechnungen').insert(build(false)).select('id').single()
  if (result.error && isRechnungComplianceSchemaError(result.error.message)) {
    result = await supabase.from('rechnungen').insert(build(true)).select('id').single()
  }
  if (result.error && isRechnungComplianceSchemaError(result.error.message)) {
    result = await supabase.from('rechnungen').insert(build(true, true)).select('id').single()
  }
  if (result.error && isRechnungComplianceSchemaError(result.error.message)) {
    result = await supabase.from('rechnungen').insert(build(true, true, true)).select('id').single()
  }

  if (result.error) {
    return { data: null, error: { message: mapRechnungDbError(result.error.message) ?? 'Speichern fehlgeschlagen' } }
  }
  return { data: result.data as { id: string }, error: null }
}

/** Update mit Fallback ohne Compliance-Spalten. */
export async function rechnungUpdateMitSchemaFallback(
  supabase: SupabaseClient,
  id: string,
  row: Record<string, unknown>,
  berechnung: RechnungBerechnung,
  extra: RechnungBerechnungExtra
): Promise<{ error: { message: string } | null }> {
  const build = (ohneCompliance: boolean, ohneTexte = false, ohneAbschlag = false) => {
    const {
      einleitung,
      hinweise,
      mail_einleitung,
      mail_betreff,
      zahlungsbedingungen,
      rechnung_art,
      abschlag_index,
      zahlungsplan_abschlag_id,
      ...restRow
    } = row
    let base = ohneTexte ? restRow : row
    if (ohneTexte && zahlungsbedingungen) {
      const zb = String(zahlungsbedingungen).trim()
      const prev = String(hinweise ?? (restRow as { hinweise?: string }).hinweise ?? '').trim()
      if (zb) {
        base = {
          ...base,
          hinweise: prev ? `${prev}\n\n${zb}` : zb,
        }
      }
    }
    if (ohneAbschlag) {
      const {
        mail_einleitung: _m1,
        mail_betreff: _m2,
        rechnung_art: _r,
        abschlag_index: _a,
        zahlungsplan_abschlag_id: _z,
        ...restAbschlag
      } = base as Record<string, unknown>
      base = restAbschlag
    }
    return {
      ...base,
      ...dbFelderAusBerechnung(berechnung, extra, { ohneCompliance }),
    }
  }

  let result = await supabase.from('rechnungen').update(build(false)).eq('id', id)
  if (result.error && isRechnungComplianceSchemaError(result.error.message)) {
    result = await supabase.from('rechnungen').update(build(true)).eq('id', id)
  }
  if (result.error && isRechnungComplianceSchemaError(result.error.message)) {
    result = await supabase.from('rechnungen').update(build(true, true)).eq('id', id)
  }
  if (result.error && isRechnungComplianceSchemaError(result.error.message)) {
    result = await supabase.from('rechnungen').update(build(true, true, true)).eq('id', id)
  }

  if (result.error) {
    return { error: { message: mapRechnungDbError(result.error.message) ?? 'Speichern fehlgeschlagen' } }
  }
  return { error: null }
}
