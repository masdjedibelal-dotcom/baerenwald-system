import type { SupabaseClient } from '@supabase/supabase-js'

export type HwRechnungStatus = 'eingereicht' | 'bezahlt' | 'abgelehnt'

export type HwEingangsrechnungListeRow = {
  zuweisungId: string
  angebotId: string
  auftragId: string | null
  handwerkerId: string
  handwerkerName: string
  handwerkerEmail: string | null
  handwerkerTelefon: string | null
  iban: string | null
  steuernummer: string | null
  ustid: string | null
  gewerkName: string | null
  kundeName: string | null
  auftragTitel: string | null
  angebotsnr: string | null
  betragBrutto: number | null
  pdfPath: string
  eingereichtAt: string | null
  status: HwRechnungStatus
  bezahltAt: string | null
  auftragHref: string | null
  angebotHref: string
}

export function normalizeHwRechnungStatus(raw: string | null | undefined): HwRechnungStatus {
  const s = (raw ?? '').trim().toLowerCase()
  if (s === 'bezahlt') return 'bezahlt'
  if (s === 'abgelehnt') return 'abgelehnt'
  return 'eingereicht'
}

export function hwRechnungStatusLabel(status: HwRechnungStatus): string {
  if (status === 'bezahlt') return 'Bezahlt'
  if (status === 'abgelehnt') return 'Abgelehnt'
  return 'Offen'
}

export function hwRechnungIstErledigt(status: HwRechnungStatus): boolean {
  return status === 'bezahlt' || status === 'abgelehnt'
}

type RawZuweisung = {
  id: string
  angebot_id: string
  handwerker_id: string
  hw_rechnung_pdf_url: string | null
  hw_rechnung_eingereicht_at: string | null
  hw_rechnung_status: string | null
  hw_rechnung_bezahlt_at: string | null
  hw_rechnung_betrag_brutto: number | null
  hw_preis_brutto: number | null
  handwerker?: {
    id: string
    name: string | null
    email: string | null
    telefon: string | null
    iban: string | null
    steuernummer: string | null
    ustid: string | null
  } | null
  gewerke?: { id: string; name: string | null } | null
  angebote?: {
    id: string
    angebotsnr: string | null
    titel: string | null
    kunde_id: string | null
    kunden?: { id: string; name: string | null; vorname: string | null; nachname: string | null } | null
  } | null
}

function kundeNameFromEmbed(k: {
  name: string | null
  vorname: string | null
  nachname: string | null
} | null | undefined): string | null {
  if (!k) return null
  const full = [k.vorname, k.nachname].filter(Boolean).join(' ').trim()
  if (full) return full
  return k.name?.trim() || null
}

export async function loadHwEingangsrechnungen(
  supabase: SupabaseClient
): Promise<{ rows: HwEingangsrechnungListeRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('angebot_handwerker')
    .select(
      `
      id,
      angebot_id,
      handwerker_id,
      hw_rechnung_pdf_url,
      hw_rechnung_eingereicht_at,
      hw_rechnung_status,
      hw_rechnung_bezahlt_at,
      hw_rechnung_betrag_brutto,
      hw_preis_brutto,
      handwerker:handwerker_id (
        id, name, email, telefon, iban, steuernummer, ustid
      ),
      gewerke:gewerk_id ( id, name ),
      angebote:angebot_id (
        id, angebotsnr, titel, kunde_id,
        kunden:kunde_id ( id, name, vorname, nachname )
      )
    `
    )
    .not('hw_rechnung_pdf_url', 'is', null)
    .order('hw_rechnung_eingereicht_at', { ascending: false, nullsFirst: false })
    .limit(500)

  if (error) return { rows: [], error: error.message }

  const raw = (data ?? []) as unknown as RawZuweisung[]
  const withPdf = raw.filter((r) => Boolean(r.hw_rechnung_pdf_url?.trim()))
  const angebotIds = Array.from(
    new Set(withPdf.map((r) => r.angebot_id).filter(Boolean))
  )

  const auftragByAngebot = new Map<string, { id: string; titel: string | null }>()
  if (angebotIds.length > 0) {
    const { data: auftraege } = await supabase
      .from('auftraege')
      .select('id, angebot_id, titel, created_at')
      .in('angebot_id', angebotIds)
      .order('created_at', { ascending: false })
    for (const a of auftraege ?? []) {
      const aid = String((a as { angebot_id?: string }).angebot_id ?? '')
      if (!aid || auftragByAngebot.has(aid)) continue
      auftragByAngebot.set(aid, {
        id: String((a as { id: string }).id),
        titel: (a as { titel?: string | null }).titel ?? null,
      })
    }
  }

  const rows: HwEingangsrechnungListeRow[] = withPdf.map((r) => {
    const hw = r.handwerker
    const ang = r.angebote
    const auf = auftragByAngebot.get(r.angebot_id) ?? null
    const betrag =
      r.hw_rechnung_betrag_brutto != null && Number.isFinite(Number(r.hw_rechnung_betrag_brutto))
        ? Number(r.hw_rechnung_betrag_brutto)
        : r.hw_preis_brutto != null && Number.isFinite(Number(r.hw_preis_brutto))
          ? Number(r.hw_preis_brutto)
          : null
    const status = normalizeHwRechnungStatus(r.hw_rechnung_status)
    return {
      zuweisungId: r.id,
      angebotId: r.angebot_id,
      auftragId: auf?.id ?? null,
      handwerkerId: r.handwerker_id,
      handwerkerName: hw?.name?.trim() || 'Handwerker',
      handwerkerEmail: hw?.email?.trim() || null,
      handwerkerTelefon: hw?.telefon?.trim() || null,
      iban: hw?.iban?.trim() || null,
      steuernummer: hw?.steuernummer?.trim() || null,
      ustid: hw?.ustid?.trim() || null,
      gewerkName: r.gewerke?.name?.trim() || null,
      kundeName: kundeNameFromEmbed(ang?.kunden ?? null),
      auftragTitel: auf?.titel?.trim() || ang?.titel?.trim() || null,
      angebotsnr: ang?.angebotsnr?.trim() || null,
      betragBrutto: betrag,
      pdfPath: String(r.hw_rechnung_pdf_url).trim(),
      eingereichtAt: r.hw_rechnung_eingereicht_at,
      status,
      bezahltAt: r.hw_rechnung_bezahlt_at,
      auftragHref: auf?.id ? `/auftraege/${auf.id}` : null,
      angebotHref: `/angebote/${r.angebot_id}`,
    }
  })

  return { rows, error: null }
}
