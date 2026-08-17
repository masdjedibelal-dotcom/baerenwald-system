import type { SupabaseClient } from '@supabase/supabase-js'
import type { RechnungAbschlagLink } from '@/lib/rechnungen/zahlungsplan'

export type MahnungAbschlagGezahlt = {
  rechnungsnummer: string
  label: string
  brutto: number
}

export type MahnungBetragKontext = {
  /** Brutto laut Rechnungsbeleg */
  rechnungsBrutto: number
  /** Zu mahnender Betrag (diese Rechnung) */
  offenerBetrag: number
  bereitsGezahltBrutto: number
  bereitsGezahlt: MahnungAbschlagGezahlt[]
  /** Keine Mahnung — z. B. nichts mehr offen */
  skipMahnung: boolean
}

function roundGeld(n: number): number {
  return Math.round(n * 100) / 100
}

function abschlagLabel(r: RechnungAbschlagLink): string {
  const idx = r.abschlag_index && r.abschlag_index > 0 ? r.abschlag_index : null
  const nr = r.rechnungsnummer?.trim()
  if (idx) return `Abschlag ${idx}${nr ? ` (${nr})` : ''}`
  if (nr) return nr
  return 'Abschlagsrechnung'
}

/** Bezahlte Abschläge desselben Auftrags (ohne aktuelle Rechnung). */
export function berechneMahnungBetragKontext(
  rechnung: {
    id: string
    brutto: number | null
    rechnung_art?: string | null
  },
  geschwister: RechnungAbschlagLink[]
): MahnungBetragKontext {
  const rechnungsBrutto = roundGeld(Math.max(0, Number(rechnung.brutto) || 0))
  const bereitsGezahlt: MahnungAbschlagGezahlt[] = []

  for (const s of geschwister) {
    if (s.id === rechnung.id) continue
    if (String(s.status ?? '').toLowerCase() !== 'bezahlt') continue
    if (String(s.beleg_typ ?? 'rechnung') === 'gutschrift') continue
    const art = String(s.rechnung_art ?? 'voll').toLowerCase()
    if (art !== 'abschlag') continue
    const brutto = roundGeld(Math.abs(Number(s.brutto) || 0))
    if (brutto <= 0) continue
    bereitsGezahlt.push({
      rechnungsnummer: s.rechnungsnummer?.trim() || '—',
      label: abschlagLabel(s),
      brutto,
    })
  }

  bereitsGezahlt.sort((a, b) => a.label.localeCompare(b.label, 'de'))

  const bereitsGezahltBrutto = roundGeld(bereitsGezahlt.reduce((sum, z) => sum + z.brutto, 0))
  const offenerBetrag = rechnungsBrutto
  const skipMahnung = offenerBetrag <= 0.005

  return {
    rechnungsBrutto,
    offenerBetrag,
    bereitsGezahltBrutto,
    bereitsGezahlt,
    skipMahnung,
  }
}

const MAHNUNG_GESCHWISTER_SELECT =
  'id, auftrag_id, rechnungsnummer, status, brutto, netto, mwst_betrag, rechnung_art, abschlag_index, zahlungsplan_abschlag_id, beleg_typ'

export async function loadGeschwisterRechnungenFuerMahnung(
  supabase: SupabaseClient,
  auftragId: string | null | undefined
): Promise<RechnungAbschlagLink[]> {
  const aid = auftragId?.trim()
  if (!aid) return []

  const { data, error } = await supabase
    .from('rechnungen')
    .select(MAHNUNG_GESCHWISTER_SELECT)
    .eq('auftrag_id', aid)
    .neq('status', 'storniert')

  if (error || !data?.length) return []

  return data.map((r) => ({
    id: String(r.id),
    rechnungsnummer: r.rechnungsnummer as string | null,
    status: r.status as string | null,
    brutto: r.brutto as number | null,
    netto: r.netto as number | null,
    mwst_betrag: r.mwst_betrag as number | null,
    rechnung_art: r.rechnung_art as string | null,
    abschlag_index: r.abschlag_index as number | null,
    zahlungsplan_abschlag_id: r.zahlungsplan_abschlag_id as string | null,
    beleg_typ: r.beleg_typ as string | null,
  }))
}

export async function loadGeschwisterMapFuerMahnung(
  supabase: SupabaseClient,
  auftragIds: string[]
): Promise<Map<string, RechnungAbschlagLink[]>> {
  const ids = [...new Set(auftragIds.map((x) => x.trim()).filter(Boolean))]
  const map = new Map<string, RechnungAbschlagLink[]>()
  if (!ids.length) return map

  const { data, error } = await supabase
    .from('rechnungen')
    .select(MAHNUNG_GESCHWISTER_SELECT)
    .in('auftrag_id', ids)
    .neq('status', 'storniert')

  if (error || !data?.length) return map

  for (const r of data) {
    const aid = String(r.auftrag_id ?? '').trim()
    if (!aid) continue
    const row: RechnungAbschlagLink = {
      id: String(r.id),
      rechnungsnummer: r.rechnungsnummer as string | null,
      status: r.status as string | null,
      brutto: r.brutto as number | null,
      netto: r.netto as number | null,
      mwst_betrag: r.mwst_betrag as number | null,
      rechnung_art: r.rechnung_art as string | null,
      abschlag_index: r.abschlag_index as number | null,
      zahlungsplan_abschlag_id: r.zahlungsplan_abschlag_id as string | null,
      beleg_typ: r.beleg_typ as string | null,
    }
    const list = map.get(aid) ?? []
    list.push(row)
    map.set(aid, list)
  }
  return map
}

export async function mahnungBetragKontextFuerRechnung(
  supabase: SupabaseClient,
  rechnung: {
    id: string
    auftrag_id?: string | null
    brutto: number | null
    rechnung_art?: string | null
  }
): Promise<MahnungBetragKontext> {
  const geschwister = await loadGeschwisterRechnungenFuerMahnung(supabase, rechnung.auftrag_id)
  return berechneMahnungBetragKontext(rechnung, geschwister)
}

export function mahnungBetragMailFelder(kontext: MahnungBetragKontext) {
  return {
    brutto: kontext.rechnungsBrutto,
    offenerBetrag: kontext.offenerBetrag,
    bereitsGezahltBrutto: kontext.bereitsGezahltBrutto,
    bereitsGezahlt: kontext.bereitsGezahlt.map((z) => ({
      label: z.label,
      brutto: z.brutto,
      rechnungsnummer: z.rechnungsnummer,
    })),
  }
}
