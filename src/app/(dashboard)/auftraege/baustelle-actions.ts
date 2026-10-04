'use server'

import { revalidateAuftragDetail } from '@/lib/crm-revalidate'
import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'
import {
parseStringListJson,
type AuftragBaustellenDokument,
type AuftragBaustelleTeam,
type AuftragRegiearbeit,
type AuftragWochenbericht,
type BaustellenDokumentTyp,
} from '@/lib/auftraege/baustelle-types'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import type { Kunde } from '@/lib/types'

async function gate(auftragId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, message: 'Nicht angemeldet' }
  const { data, error } = await supabase.from('auftraege').select('id').eq('id', auftragId).maybeSingle()
  if (error) logDbError('app/auftraege/baustelle-actions:auftraege', error)
  if (error || !data) return { ok: false as const, message: 'Auftrag nicht gefunden' }
  return { ok: true as const, userId: user.id }
}

function mapRegie(row: Record<string, unknown>): AuftragRegiearbeit {
  return {
    id: row.id as string,
    auftrag_id: row.auftrag_id as string,
    datum: String(row.datum ?? '').slice(0, 10),
    bezeichnung: String(row.bezeichnung ?? ''),
    beschreibung: (row.beschreibung as string | null) ?? null,
    personen_anzahl: Number(row.personen_anzahl) || 1,
    stunden: Number(row.stunden) || 0,
    material: (row.material as string | null) ?? null,
    sort_order: Number(row.sort_order) || 0,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  }
}

function mapWoche(row: Record<string, unknown>): AuftragWochenbericht {
  return {
    id: row.id as string,
    auftrag_id: row.auftrag_id as string,
    wochen_nummer: Number(row.wochen_nummer) || 1,
    kalenderwoche: Number(row.kalenderwoche) || 1,
    jahr: Number(row.jahr) || new Date().getFullYear(),
    von_datum: String(row.von_datum ?? '').slice(0, 10),
    bis_datum: String(row.bis_datum ?? '').slice(0, 10),
    fazit: (row.fazit as string | null) ?? null,
    ausblick: (row.ausblick as string | null) ?? null,
    pdf_url: (row.pdf_url as string | null) ?? null,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  }
}

function mapDokument(row: Record<string, unknown>): AuftragBaustellenDokument {
  return {
    id: row.id as string,
    auftrag_id: row.auftrag_id as string,
    typ: row.typ as AuftragBaustellenDokument['typ'],
    titel: String(row.titel ?? ''),
    datei_url: String(row.datei_url ?? ''),
    kalenderwoche: row.kalenderwoche != null ? Number(row.kalenderwoche) : null,
    jahr: row.jahr != null ? Number(row.jahr) : null,
    wochen_nummer: row.wochen_nummer != null ? Number(row.wochen_nummer) : null,
    quelle: (row.quelle as 'upload' | 'generiert') ?? 'upload',
    referenz_id: (row.referenz_id as string | null) ?? null,
    created_at: String(row.created_at ?? ''),
  }
}

export async function loadAuftragBaustelleTeam(auftragId: string): Promise<AuftragBaustelleTeam> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('auftraege')
    .select(
      'bauleiter_name, bauleiter_telefon, bauleiter_email, bau_mannschaft, bau_nachunternehmer_name, bau_nachunternehmer_firma'
    )
    .eq('id', auftragId)
    .maybeSingle()
  if (error) logDbError('app/auftraege/baustelle-actions:auftraege', error)
  const row = data as Record<string, unknown> | null
  return {
    bauleiter_name: (row?.bauleiter_name as string | null) ?? null,
    bauleiter_telefon: (row?.bauleiter_telefon as string | null) ?? null,
    bauleiter_email: (row?.bauleiter_email as string | null) ?? null,
    bau_mannschaft: parseStringListJson(row?.bau_mannschaft),
    bau_nachunternehmer_name: (row?.bau_nachunternehmer_name as string | null) ?? null,
    bau_nachunternehmer_firma: (row?.bau_nachunternehmer_firma as string | null) ?? null,
  }
}

export async function listAuftragRegiearbeiten(auftragId: string): Promise<AuftragRegiearbeit[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('auftrag_regiearbeiten')
    .select('*')
    .eq('auftrag_id', auftragId)
    .order('datum', { ascending: false })
  if (error) logDbError('app/auftraege/baustelle-actions:auftrag_regiearbeiten', error)
  if (error) return []
  return (data ?? []).map((r) => mapRegie(r as Record<string, unknown>))
}

export async function listAuftragWochenberichte(auftragId: string): Promise<AuftragWochenbericht[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('auftrag_wochenberichte')
    .select('*')
    .eq('auftrag_id', auftragId)
    .order('von_datum', { ascending: false })
  if (error) logDbError('app/auftraege/baustelle-actions:auftrag_wochenberichte', error)
  if (error) return []
  return (data ?? []).map((r) => mapWoche(r as Record<string, unknown>))
}

export async function listAuftragBaustellenDokumente(auftragId: string): Promise<AuftragBaustellenDokument[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('auftrag_baustellen_dokumente')
    .select('*')
    .eq('auftrag_id', auftragId)
    .order('created_at', { ascending: false })
  if (error) logDbError('app/auftraege/baustelle-actions:auftrag_baustellen_dokumente', error)
  if (error) return []
  return (data ?? []).map((r) => mapDokument(r as Record<string, unknown>))
}

export async function createBaustellenDokumentEintrag(input: {
  auftragId: string
  typ: BaustellenDokumentTyp
  titel: string
  datei_url: string
  kalenderwoche?: number | null
  jahr?: number | null
  wochen_nummer?: number | null
  quelle?: 'upload' | 'generiert'
  referenz_id?: string | null
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const g = await gate(input.auftragId)
  if (!g.ok) return g
  const supabase = createClient()
  const { data, error } = await supabase
    .from('auftrag_baustellen_dokumente')
    .insert({
      auftrag_id: input.auftragId,
      typ: input.typ,
      titel: input.titel.trim(),
      datei_url: input.datei_url,
      kalenderwoche: input.kalenderwoche ?? null,
      jahr: input.jahr ?? null,
      wochen_nummer: input.wochen_nummer ?? null,
      quelle: input.quelle ?? 'upload',
      referenz_id: input.referenz_id ?? null,
    })
    .select('id')
    .single()
  if (error) logDbError('app/auftraege/baustelle-actions:auftrag_baustellen_dokumente', error)
  if (error || !data) return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen' }

  await insertAuftragTimelineEvent({
    auftrag_id: input.auftragId,
    typ: 'notiz_intern',
    titel: `Baustellen-Dokument: ${input.titel.trim()}`,
    beschreibung: input.typ,
    foto_urls: [input.datei_url],
    erstellt_von: g.userId,
  })

  revalidateAuftragDetail(input.auftragId)
  return { ok: true, id: data.id as string }
}

type TagesberichtKurz = {
  tag_nummer: number
  datum: string
  wetter?: string | null
  zusammenfassung?: string | null
  leistungen: string[]
  behinderungen?: string | null
  personal_namen: string[]
}

export async function loadWochenberichtPdfDaten(
  wochenberichtId: string,
  auftragId: string
): Promise<
  | {
      ok: true
      woche: AuftragWochenbericht
      tagesberichte: TagesberichtKurz[]
      regiearbeiten: AuftragRegiearbeit[]
      team: AuftragBaustelleTeam
      auftragTitel: string
      kunde: Kunde | null
      auftraggeberName: string
    }
  | { ok: false; message: string }
> {
  const supabase = createClient()
  const { data: wRow, error } = await supabase
    .from('auftrag_wochenberichte')
    .select('*')
    .eq('id', wochenberichtId)
    .eq('auftrag_id', auftragId)
    .maybeSingle()
  if (error) logDbError('app/auftraege/baustelle-actions:auftrag_wochenberichte', error)
  if (error || !wRow) return { ok: false, message: 'Wochenbericht nicht gefunden' }
  const woche = mapWoche(wRow as Record<string, unknown>)

  const [{ data: tages }, { data: regie }, team, { data: auf }] = await Promise.all([
    supabase
      .from('auftrag_bautagesberichte')
      .select('tag_nummer, datum, wetter, zusammenfassung, leistungen, behinderungen, personal_namen, auftraggeber_name')
      .eq('auftrag_id', auftragId)
      .gte('datum', woche.von_datum)
      .lte('datum', woche.bis_datum)
      .order('tag_nummer', { ascending: true }),
    supabase
      .from('auftrag_regiearbeiten')
      .select('*')
      .eq('auftrag_id', auftragId)
      .gte('datum', woche.von_datum)
      .lte('datum', woche.bis_datum)
      .order('datum', { ascending: true }),
    loadAuftragBaustelleTeam(auftragId),
    supabase.from('auftraege').select('titel, kunden(*)').eq('id', auftragId).maybeSingle(),
  ])
  const kundenRaw = (auf as { kunden?: Kunde | Kunde[] | null; titel?: string | null } | null)?.kunden
  const kunde = Array.isArray(kundenRaw) ? kundenRaw[0] ?? null : kundenRaw ?? null
  const titel = (auf as { titel?: string | null } | null)?.titel?.trim() || kunde?.name?.trim() || 'Bauprojekt'

  const tagesberichte: TagesberichtKurz[] = (tages ?? []).map((r) => {
    const row = r as Record<string, unknown>
    return {
      tag_nummer: Number(row.tag_nummer) || 1,
      datum: String(row.datum ?? '').slice(0, 10),
      wetter: (row.wetter as string | null) ?? null,
      zusammenfassung: (row.zusammenfassung as string | null) ?? null,
      leistungen: parseStringListJson(row.leistungen),
      behinderungen: (row.behinderungen as string | null) ?? null,
      personal_namen: parseStringListJson(row.personal_namen),
    }
  })

  const auftraggeber =
    (tages?.[0] as { auftraggeber_name?: string | null } | undefined)?.auftraggeber_name?.trim() ||
    kunde?.name?.trim() ||
    '—'

  return {
    ok: true,
    woche,
    tagesberichte,
    regiearbeiten: (regie ?? []).map((r) => mapRegie(r as Record<string, unknown>)),
    team,
    auftragTitel: titel,
    kunde,
    auftraggeberName: auftraggeber,
  }
}