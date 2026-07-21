'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import {
  parseStringListJson,
  type AuftragBaustellenDokument,
  type AuftragBaustelleTeam,
  type AuftragRegiearbeit,
  type AuftragWochenbericht,
  type BaustellenDokumentTyp,
} from '@/lib/auftraege/baustelle-types'
import { kwZeitraum } from '@/lib/auftraege/kalenderwoche'
import { renderWochenberichtPdfBuffer } from '@/lib/auftraege/render-wochenbericht-pdf'
import { renderRegieberichtSammelPdfBuffer } from '@/lib/auftraege/render-regiebericht-sammel-pdf'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import type { Kunde } from '@/lib/types'

async function gate(auftragId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, message: 'Nicht angemeldet' }
  const { data, error } = await supabase.from('auftraege').select('id').eq('id', auftragId).maybeSingle()
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
  const { data } = await supabase
    .from('auftraege')
    .select(
      'bauleiter_name, bauleiter_telefon, bauleiter_email, bau_mannschaft, bau_nachunternehmer_name, bau_nachunternehmer_firma'
    )
    .eq('id', auftragId)
    .maybeSingle()
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

export async function saveAuftragBaustelleTeam(
  auftragId: string,
  team: AuftragBaustelleTeam
): Promise<{ ok: true } | { ok: false; message: string }> {
  const g = await gate(auftragId)
  if (!g.ok) return g
  const supabase = createClient()
  const { error } = await supabase
    .from('auftraege')
    .update({
      bauleiter_name: team.bauleiter_name?.trim() || null,
      bauleiter_telefon: team.bauleiter_telefon?.trim() || null,
      bauleiter_email: team.bauleiter_email?.trim() || null,
      bau_mannschaft: team.bau_mannschaft.filter((x) => x.trim()),
      bau_nachunternehmer_name: team.bau_nachunternehmer_name?.trim() || null,
      bau_nachunternehmer_firma: team.bau_nachunternehmer_firma?.trim() || null,
    })
    .eq('id', auftragId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true }
}

export async function listAuftragRegiearbeiten(auftragId: string): Promise<AuftragRegiearbeit[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('auftrag_regiearbeiten')
    .select('*')
    .eq('auftrag_id', auftragId)
    .order('datum', { ascending: false })
  if (error) return []
  return (data ?? []).map((r) => mapRegie(r as Record<string, unknown>))
}

export async function createAuftragRegiearbeit(input: {
  auftrag_id: string
  datum: string
  bezeichnung: string
  beschreibung?: string | null
  personen_anzahl: number
  stunden: number
  material?: string | null
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const g = await gate(input.auftrag_id)
  if (!g.ok) return g
  const supabase = createClient()
  const { data, error } = await supabase
    .from('auftrag_regiearbeiten')
    .insert({
      auftrag_id: input.auftrag_id,
      datum: input.datum,
      bezeichnung: input.bezeichnung.trim(),
      beschreibung: input.beschreibung?.trim() || null,
      personen_anzahl: Math.max(1, input.personen_anzahl),
      stunden: Math.max(0, input.stunden),
      material: input.material?.trim() || null,
    })
    .select('id')
    .single()
  if (error || !data) return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen' }
  revalidatePath(`/auftraege/${input.auftrag_id}`)
  return { ok: true, id: data.id as string }
}

export async function updateAuftragRegiearbeit(
  id: string,
  auftragId: string,
  input: Omit<Parameters<typeof createAuftragRegiearbeit>[0], 'auftrag_id'>
): Promise<{ ok: true } | { ok: false; message: string }> {
  const g = await gate(auftragId)
  if (!g.ok) return g
  const supabase = createClient()
  const { error } = await supabase
    .from('auftrag_regiearbeiten')
    .update({
      datum: input.datum,
      bezeichnung: input.bezeichnung.trim(),
      beschreibung: input.beschreibung?.trim() || null,
      personen_anzahl: Math.max(1, input.personen_anzahl),
      stunden: Math.max(0, input.stunden),
      material: input.material?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('auftrag_id', auftragId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true }
}

export async function deleteAuftragRegiearbeit(
  id: string,
  auftragId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const g = await gate(auftragId)
  if (!g.ok) return g
  const supabase = createClient()
  const { error } = await supabase.from('auftrag_regiearbeiten').delete().eq('id', id).eq('auftrag_id', auftragId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true }
}

export async function listAuftragWochenberichte(auftragId: string): Promise<AuftragWochenbericht[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('auftrag_wochenberichte')
    .select('*')
    .eq('auftrag_id', auftragId)
    .order('von_datum', { ascending: false })
  if (error) return []
  return (data ?? []).map((r) => mapWoche(r as Record<string, unknown>))
}

async function naechsteWochenNummer(auftragId: string): Promise<number> {
  const supabase = createClient()
  const { data } = await supabase
    .from('auftrag_wochenberichte')
    .select('wochen_nummer')
    .eq('auftrag_id', auftragId)
    .order('wochen_nummer', { ascending: false })
    .limit(1)
    .maybeSingle()
  return ((data as { wochen_nummer?: number } | null)?.wochen_nummer ?? 0) + 1
}

export async function createAuftragWochenbericht(input: {
  auftrag_id: string
  kalenderwoche: number
  jahr: number
  fazit?: string | null
  ausblick?: string | null
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const g = await gate(input.auftrag_id)
  if (!g.ok) return g
  const { von, bis } = kwZeitraum(input.kalenderwoche, input.jahr)
  const wochenNummer = await naechsteWochenNummer(input.auftrag_id)
  const supabase = createClient()
  const { data, error } = await supabase
    .from('auftrag_wochenberichte')
    .insert({
      auftrag_id: input.auftrag_id,
      wochen_nummer: wochenNummer,
      kalenderwoche: input.kalenderwoche,
      jahr: input.jahr,
      von_datum: von,
      bis_datum: bis,
      fazit: input.fazit?.trim() || null,
      ausblick: input.ausblick?.trim() || null,
    })
    .select('id')
    .single()
  if (error || !data) return { ok: false, message: error?.message ?? 'Anlegen fehlgeschlagen' }
  revalidatePath(`/auftraege/${input.auftrag_id}`)
  return { ok: true, id: data.id as string }
}

export async function updateAuftragWochenbericht(
  id: string,
  auftragId: string,
  patch: { fazit?: string | null; ausblick?: string | null }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const g = await gate(auftragId)
  if (!g.ok) return g
  const supabase = createClient()
  const { error } = await supabase
    .from('auftrag_wochenberichte')
    .update({
      fazit: patch.fazit?.trim() || null,
      ausblick: patch.ausblick?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('auftrag_id', auftragId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true }
}

export async function deleteAuftragWochenbericht(
  id: string,
  auftragId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const g = await gate(auftragId)
  if (!g.ok) return g
  const supabase = createClient()
  const { error } = await supabase.from('auftrag_wochenberichte').delete().eq('id', id).eq('auftrag_id', auftragId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true }
}

export async function listAuftragBaustellenDokumente(auftragId: string): Promise<AuftragBaustellenDokument[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('auftrag_baustellen_dokumente')
    .select('*')
    .eq('auftrag_id', auftragId)
    .order('created_at', { ascending: false })
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
  if (error || !data) return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen' }

  await insertAuftragTimelineEvent({
    auftrag_id: input.auftragId,
    typ: 'notiz_intern',
    titel: `Baustellen-Dokument: ${input.titel.trim()}`,
    beschreibung: input.typ,
    foto_urls: [input.datei_url],
    erstellt_von: g.userId,
  })

  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true, id: data.id as string }
}

export async function deleteBaustellenDokument(
  id: string,
  auftragId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const g = await gate(auftragId)
  if (!g.ok) return g
  const supabase = createClient()
  const { error } = await supabase
    .from('auftrag_baustellen_dokumente')
    .delete()
    .eq('id', id)
    .eq('auftrag_id', auftragId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true }
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

export async function loadRegieSammelPdfDaten(
  auftragId: string,
  vonDatum: string,
  bisDatum: string,
  kalenderwoche: number,
  jahr: number
): Promise<
  | {
      ok: true
      regiearbeiten: AuftragRegiearbeit[]
      team: AuftragBaustelleTeam
      auftragTitel: string
      kunde: Kunde | null
      auftraggeberName: string
      kalenderwoche: number
      jahr: number
      vonDatum: string
      bisDatum: string
    }
  | { ok: false; message: string }
> {
  const supabase = createClient()
  const [{ data: regie }, team, { data: auf }, { data: tages }] = await Promise.all([
    supabase
      .from('auftrag_regiearbeiten')
      .select('*')
      .eq('auftrag_id', auftragId)
      .gte('datum', vonDatum)
      .lte('datum', bisDatum)
      .order('datum', { ascending: true }),
    loadAuftragBaustelleTeam(auftragId),
    supabase.from('auftraege').select('titel, kunden(*)').eq('id', auftragId).maybeSingle(),
    supabase
      .from('auftrag_bautagesberichte')
      .select('auftraggeber_name')
      .eq('auftrag_id', auftragId)
      .limit(1)
      .maybeSingle(),
  ])

  const kundenRaw = (auf as { kunden?: Kunde | Kunde[] | null; titel?: string | null } | null)?.kunden
  const kunde = Array.isArray(kundenRaw) ? kundenRaw[0] ?? null : kundenRaw ?? null
  const titel = (auf as { titel?: string | null } | null)?.titel?.trim() || kunde?.name?.trim() || 'Bauprojekt'
  const auftraggeber =
    (tages as { auftraggeber_name?: string | null } | null)?.auftraggeber_name?.trim() ||
    kunde?.name?.trim() ||
    '—'

  return {
    ok: true,
    regiearbeiten: (regie ?? []).map((r) => mapRegie(r as Record<string, unknown>)),
    team,
    auftragTitel: titel,
    kunde,
    auftraggeberName: auftraggeber,
    kalenderwoche,
    jahr,
    vonDatum,
    bisDatum,
  }
}

async function persistGeneriertesPdf(
  auftragId: string,
  typ: BaustellenDokumentTyp,
  titel: string,
  buffer: Buffer,
  meta: { kalenderwoche?: number; jahr?: number; wochen_nummer?: number; referenz_id?: string }
): Promise<string> {
  const path = `baustellen-dokumente/${auftragId}/${Date.now()}-${typ}.pdf`
  const { error: upErr } = await supabaseAdmin.storage
    .from('protokolle')
    .upload(path, buffer, { contentType: 'application/pdf', upsert: true })
  if (upErr) throw new Error(upErr.message)
  const { data: pub } = supabaseAdmin.storage.from('protokolle').getPublicUrl(path)
  await createBaustellenDokumentEintrag({
    auftragId,
    typ,
    titel,
    datei_url: pub.publicUrl,
    kalenderwoche: meta.kalenderwoche ?? null,
    jahr: meta.jahr ?? null,
    wochen_nummer: meta.wochen_nummer ?? null,
    quelle: 'generiert',
    referenz_id: meta.referenz_id ?? null,
  })
  return pub.publicUrl
}

export async function generateUndSpeichereWochenberichtPdf(
  wochenberichtId: string,
  auftragId: string
): Promise<{ ok: true; pdfUrl: string } | { ok: false; message: string }> {
  const loaded = await loadWochenberichtPdfDaten(wochenberichtId, auftragId)
  if (!loaded.ok) return loaded
  const firm = await fetchFirmenEinstellungen(supabaseAdmin)
  const buffer = await renderWochenberichtPdfBuffer(firm, loaded)
  try {
    const pdfUrl = await persistGeneriertesPdf(
      auftragId,
      'wochenbericht',
      `Wochenbericht ${String(loaded.woche.wochen_nummer).padStart(2, '0')} KW ${loaded.woche.kalenderwoche}`,
      buffer,
      {
        kalenderwoche: loaded.woche.kalenderwoche,
        jahr: loaded.woche.jahr,
        wochen_nummer: loaded.woche.wochen_nummer,
        referenz_id: wochenberichtId,
      }
    )
    await supabaseAdmin
      .from('auftrag_wochenberichte')
      .update({ pdf_url: pdfUrl, updated_at: new Date().toISOString() })
      .eq('id', wochenberichtId)
    revalidatePath(`/auftraege/${auftragId}`)
    return { ok: true, pdfUrl }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'PDF fehlgeschlagen' }
  }
}

export async function generateUndSpeichereRegieSammelPdf(
  auftragId: string,
  kalenderwoche: number,
  jahr: number
): Promise<{ ok: true; pdfUrl: string } | { ok: false; message: string }> {
  const { von, bis } = kwZeitraum(kalenderwoche, jahr)
  const loaded = await loadRegieSammelPdfDaten(auftragId, von, bis, kalenderwoche, jahr)
  if (!loaded.ok) return loaded
  if (!loaded.regiearbeiten.length) {
    return { ok: false, message: 'Keine Regiearbeiten in dieser Kalenderwoche.' }
  }
  const firm = await fetchFirmenEinstellungen(supabaseAdmin)
  const buffer = await renderRegieberichtSammelPdfBuffer(firm, loaded)
  try {
    const pdfUrl = await persistGeneriertesPdf(
      auftragId,
      'regiebericht',
      `Regiebericht KW ${kalenderwoche}/${jahr}`,
      buffer,
      { kalenderwoche, jahr }
    )
    revalidatePath(`/auftraege/${auftragId}`)
    return { ok: true, pdfUrl }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'PDF fehlgeschlagen' }
  }
}