import { createClient } from '@/lib/supabase-server'
import { normalizeAngebotPositionen, summenAusPositionen } from '@/lib/angebot-positionen'
import type {
  AuftragHandwerkerRow,
  Eingangsrechnung,
  EingangsrechnungKategorie,
  Einbehalt,
} from '@/lib/types'

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function addYearsFromTodayForFreigabe(years: number): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + years)
  return d.toISOString().slice(0, 10)
}

function normalizeEinbehalt(raw: Record<string, unknown>): Einbehalt {
  return {
    id: String(raw.id),
    auftrag_id: String(raw.auftrag_id),
    handwerker_id: String(raw.handwerker_id),
    rechnung_brutto: num(raw.rechnung_brutto),
    einbehalt_prozent: num(raw.einbehalt_prozent),
    einbehalt_betrag: num(raw.einbehalt_betrag),
    bezahlt_betrag: num(raw.bezahlt_betrag),
    status: raw.status as Einbehalt['status'],
    freigabe_datum: String(raw.freigabe_datum ?? ''),
    freigegeben_at: raw.freigegeben_at ? String(raw.freigegeben_at) : null,
    notizen: raw.notizen ? String(raw.notizen) : null,
    created_at: raw.created_at ? String(raw.created_at) : undefined,
    handwerker: (raw.handwerker as Einbehalt['handwerker']) ?? null,
    buergschaften: Array.isArray(raw.buergschaften)
      ? (raw.buergschaften as Einbehalt['buergschaften']) ?? []
      : [],
  }
}

function normalizeEingang(raw: Record<string, unknown>): Eingangsrechnung {
  return {
    id: String(raw.id),
    auftrag_id: String(raw.auftrag_id),
    lieferant: String(raw.lieferant ?? ''),
    beschreibung: raw.beschreibung ? String(raw.beschreibung) : null,
    kategorie: String(raw.kategorie ?? 'material') as EingangsrechnungKategorie,
    betrag_netto: num(raw.betrag_netto),
    mwst_satz: num(raw.mwst_satz),
    betrag_brutto: num(raw.betrag_brutto),
    rechnungsdatum: raw.rechnungsdatum ? String(raw.rechnungsdatum) : null,
    faellig_am: raw.faellig_am ? String(raw.faellig_am) : null,
    bezahlt: Boolean(raw.bezahlt),
    bezahlt_am: raw.bezahlt_am ? String(raw.bezahlt_am) : null,
    beleg_url: raw.beleg_url ? String(raw.beleg_url) : null,
    notizen: raw.notizen ? String(raw.notizen) : null,
    created_at: raw.created_at ? String(raw.created_at) : undefined,
  }
}

export type AuftragFinanzenClientPayload = {
  einbehalte: Einbehalt[]
  eingangsrechnungen: Eingangsrechnung[]
  zuweisungen: AuftragHandwerkerRow[]
  defaultFreigabeDatum: string
  metrics: {
    kundenBrutto: number | null
    kostenGesamt: number
    margeEuro: number | null
    margePct: number | null
    kalkMargeMitte: number
    abweichung: number | null
    hatEingang: boolean
    breakdownRows: { key: string; label: string; betrag: number; pct: number }[]
    breakdownGesamt: number
    summeEingangsBrutto: number
    summeEinbehaltBrutto: number
  }
}

export async function loadAuftragFinanzenClientPayload(auftragId: string): Promise<AuftragFinanzenClientPayload | null> {
  const supabase = createClient()

  const { data: auf, error: aErr } = await supabase
    .from('auftraege')
    .select(
      `
      id,
      angebote(gesamt_min, gesamt_max, positionen),
      auftrag_handwerker(
        id, handwerker_id, gewerk_id,
        handwerker(id, name, firma),
        gewerke(name)
      )
    `
    )
    .eq('id', auftragId)
    .maybeSingle()

  if (aErr || !auf) return null

  const { data: einRaw } = await supabase
    .from('einbehalte')
    .select(
      `
      *,
      handwerker(id, name, firma),
      buergschaften(*)
    `
    )
    .eq('auftrag_id', auftragId)
    .order('created_at', { ascending: false })

  const { data: erRaw } = await supabase
    .from('eingangsrechnungen')
    .select('*')
    .eq('auftrag_id', auftragId)
    .order('created_at', { ascending: false })

  const { data: rechRows } = await supabase
    .from('rechnungen')
    .select('id, brutto, status, created_at')
    .eq('auftrag_id', auftragId)
    .order('created_at', { ascending: false })

  const row = auf as Record<string, unknown>
  const ang = row.angebote as { gesamt_min?: unknown; gesamt_max?: unknown; positionen?: unknown } | null
  const pos = normalizeAngebotPositionen(ang?.positionen ?? [])
  const summen = summenAusPositionen(pos, 19)

  const einbehalte = (einRaw ?? []).map((e) => normalizeEinbehalt(e as Record<string, unknown>))
  const eingangsrechnungen = (erRaw ?? []).map((e) => normalizeEingang(e as Record<string, unknown>))

  const rechnungen = (rechRows ?? []) as { id: string; brutto: number | null; status: string }[]
  const kundenRechnung = rechnungen.find((r) => r.status !== 'entwurf' && r.brutto != null)

  const summeEingangsBrutto = eingangsrechnungen.reduce((s, e) => s + e.betrag_brutto, 0)
  const summeEinbehaltBrutto = einbehalte.reduce((s, e) => s + e.rechnung_brutto, 0)
  const kostenGesamt = summeEingangsBrutto + summeEinbehaltBrutto
  const kundenBrutto = kundenRechnung?.brutto ?? null
  const margeEuro = kundenBrutto != null ? kundenBrutto - kostenGesamt : null
  const margePct = kundenBrutto != null && kundenBrutto > 0 ? (margeEuro! / kundenBrutto) * 100 : null

  const kalkMargeMitte = (summen.margeMin + summen.margeMax) / 2
  const hatEingang = eingangsrechnungen.length > 0
  const margeEcht = margeEuro
  const abweichung = hatEingang && margeEcht != null ? margeEcht - kalkMargeMitte : null

  const katSum = (k: EingangsrechnungKategorie) =>
    eingangsrechnungen.filter((e) => e.kategorie === k).reduce((s, e) => s + e.betrag_brutto, 0)

  const breakdown = [
    { key: 'lohn', label: 'Handwerker-Lohn (Eingang)', betrag: katSum('lohn') },
    { key: 'material', label: 'Material', betrag: katSum('material') },
    { key: 'geraete', label: 'Geräte / Miete', betrag: katSum('geraete') },
    { key: 'entsorgung', label: 'Entsorgung', betrag: katSum('entsorgung') },
    { key: 'sonstiges', label: 'Sonstiges', betrag: katSum('sonstiges') },
    { key: 'hw_einbehalt', label: 'Handwerker-Rechnungen (brutto, Einbehaltbasis)', betrag: summeEinbehaltBrutto },
  ]

  const breakdownGesamt = breakdown.reduce((s, b) => s + b.betrag, 0)
  const breakdownRows = breakdown.map((b) => ({
    ...b,
    pct: breakdownGesamt > 0 ? (b.betrag / breakdownGesamt) * 100 : 0,
  }))

  const hwRows = (row.auftrag_handwerker ?? []) as AuftragHandwerkerRow[]

  return {
    einbehalte,
    eingangsrechnungen,
    zuweisungen: hwRows,
    defaultFreigabeDatum: addYearsFromTodayForFreigabe(5),
    metrics: {
      kundenBrutto,
      kostenGesamt,
      margeEuro,
      margePct,
      kalkMargeMitte,
      abweichung,
      hatEingang,
      breakdownRows,
      breakdownGesamt,
      summeEingangsBrutto,
      summeEinbehaltBrutto,
    },
  }
}
