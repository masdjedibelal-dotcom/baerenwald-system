import { supabaseAdmin } from '@/lib/supabase-admin'
import { persistPdfForVertrag } from '@/lib/vertraege/persist-vertrag-pdf'
import { nextVertragsnummer } from '@/lib/vertraege/next-vertragsnummer'
import {
  bauvorhabenAusAuftrag,
  leistungsumfangAusPositionen,
  verguetungAusPositionen,
} from '@/lib/vertraege/build-vertrag-texte'
import type { AuftragPosition } from '@/lib/types'
import { auftragErfordertProjektvertrag } from '@/lib/auftraege/auftrag-erfordert-projektvertrag'

function unwrapJoin<T>(raw: T | T[] | null | undefined): T | null {
  if (!raw) return null
  return Array.isArray(raw) ? (raw[0] ?? null) : raw
}

async function resolveGewerkId(hint?: {
  gewerkId?: string | null
  gewerkSlug?: string | null
  gewerkName?: string | null
}): Promise<string | null> {
  if (hint?.gewerkId?.trim()) return hint.gewerkId.trim()
  const slug = hint?.gewerkSlug?.trim()
  if (slug) {
    const { data } = await supabaseAdmin.from('gewerke').select('id').eq('slug', slug).maybeSingle()
    if (data?.id) return String(data.id)
  }
  const name = hint?.gewerkName?.trim()
  if (name) {
    const { data } = await supabaseAdmin.from('gewerke').select('id').eq('name', name).maybeSingle()
    if (data?.id) return String(data.id)
  }
  return null
}

/** `auftrag_handwerker`-Zeile anlegen, falls noch keine existiert (Voraussetzung für Projektvertrag). */
export async function ensureAuftragHandwerkerZuordnung(
  auftragId: string,
  handwerkerId: string,
  hint?: {
    gewerkId?: string | null
    gewerkSlug?: string | null
    gewerkName?: string | null
  }
): Promise<{ ok: true; created: boolean } | { ok: false; message: string }> {
  const aid = auftragId.trim()
  const hid = handwerkerId.trim()
  if (!aid || !hid) return { ok: false, message: 'Auftrag oder Handwerker fehlt.' }

  const { data: existing } = await supabaseAdmin
    .from('auftrag_handwerker')
    .select('id')
    .eq('auftrag_id', aid)
    .eq('handwerker_id', hid)
    .maybeSingle()

  if (existing?.id) return { ok: true, created: false }

  let gewerkId = await resolveGewerkId(hint)
  if (!gewerkId) {
    const { data: pos } = await supabaseAdmin
      .from('auftrag_positionen')
      .select('gewerk_slug, gewerk_name')
      .eq('auftrag_id', aid)
      .eq('handwerker_id', hid)
      .limit(1)
      .maybeSingle()
    if (pos) {
      gewerkId = await resolveGewerkId({
        gewerkSlug: (pos as { gewerk_slug?: string | null }).gewerk_slug,
        gewerkName: (pos as { gewerk_name?: string | null }).gewerk_name,
      })
    }
  }

  if (!gewerkId) {
    return { ok: false, message: 'Gewerk für Handwerker-Zuordnung nicht ermittelbar.' }
  }

  const { error } = await supabaseAdmin.from('auftrag_handwerker').insert({
    auftrag_id: aid,
    handwerker_id: hid,
    gewerk_id: gewerkId,
    status: 'zugewiesen',
  })

  if (error) return { ok: false, message: error.message }
  return { ok: true, created: true }
}

async function handwerkerIdsAmAuftrag(auftragId: string): Promise<string[]> {
  const ids = new Set<string>()

  const { data: zuordnungen } = await supabaseAdmin
    .from('auftrag_handwerker')
    .select('handwerker_id')
    .eq('auftrag_id', auftragId)

  for (const z of zuordnungen ?? []) {
    const id = String((z as { handwerker_id: string }).handwerker_id ?? '').trim()
    if (id) ids.add(id)
  }

  const { data: positionen } = await supabaseAdmin
    .from('auftrag_positionen')
    .select('handwerker_id')
    .eq('auftrag_id', auftragId)
    .not('handwerker_id', 'is', null)

  for (const p of positionen ?? []) {
    const id = String((p as { handwerker_id: string }).handwerker_id ?? '').trim()
    if (id) ids.add(id)
  }

  return Array.from(ids)
}

/** Projektverträge für alle Handwerker am Auftrag erzeugen (Portal + Tab Dokumente). */
export async function provisionProjektVertraegeFuerAuftrag(
  auftragId: string,
  opts?: { handwerkerIds?: string[] }
): Promise<{ ok: true; provisioned: number; skipped: number } | { ok: false; message: string }> {
  const aid = auftragId.trim()
  if (!aid) return { ok: false, message: 'Auftrag fehlt.' }

  if (!(await auftragErfordertProjektvertrag(aid))) {
    return { ok: true, provisioned: 0, skipped: 0 }
  }

  const hwIds = opts?.handwerkerIds?.length
    ? Array.from(new Set(opts.handwerkerIds.map((id) => id.trim()).filter(Boolean)))
    : await handwerkerIdsAmAuftrag(aid)

  if (!hwIds.length) return { ok: true, provisioned: 0, skipped: 0 }

  let provisioned = 0
  let skipped = 0

  for (const hwId of hwIds) {
    const zuordnung = await ensureAuftragHandwerkerZuordnung(aid, hwId)
    if (!zuordnung.ok) {
      console.warn('[provisionProjektVertraegeFuerAuftrag] zuordnung:', aid, hwId, zuordnung.message)
      skipped++
      continue
    }

    const r = await provisionProjektVertragFuerHandwerker(aid, hwId)
    if (!r.ok) {
      console.warn('[provisionProjektVertraegeFuerAuftrag] vertrag:', aid, hwId, r.message)
      skipped++
      continue
    }
    if (r.created) provisioned++
    else skipped++
  }

  return { ok: true, provisioned, skipped }
}

export function provisionProjektvertragFireAndForget(
  auftragId: string,
  handwerkerId?: string | null
) {
  const ids = handwerkerId?.trim() ? [handwerkerId.trim()] : undefined
  void provisionProjektVertraegeFuerAuftrag(auftragId, ids ? { handwerkerIds: ids } : undefined).then(
    (r) => {
      if (!r.ok) {
        console.warn('[provisionProjektvertrag]', auftragId, r.message)
        return
      }
      if (r.provisioned > 0) {
        console.info('[provisionProjektvertrag] erzeugt', auftragId, r.provisioned)
      }
    }
  )
}

function positionenFuerZuordnung(
  positionen: AuftragPosition[],
  handwerkerId: string,
  gewerkName: string
): AuftragPosition[] {
  const gn = gewerkName.trim().toLowerCase()
  return positionen.filter(
    (p) =>
      p.handwerker_id === handwerkerId ||
      (gn && p.gewerk_name?.trim().toLowerCase() === gn)
  )
}

/** Legt nach CRM-Übernahme einen Projektvertrag an (pdf_erzeugt), falls noch keiner existiert. */
export async function provisionProjektVertragFuerHandwerker(
  auftragId: string,
  handwerkerId: string
): Promise<{ ok: true; vertrag_id: string; created: boolean } | { ok: false; message: string }> {
  const { data: existing } = await supabaseAdmin
    .from('handwerker_vertraege')
    .select('id, pdf_url')
    .eq('auftrag_id', auftragId)
    .eq('handwerker_id', handwerkerId)
    .eq('typ', 'projekt')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.pdf_url?.trim()) {
    return { ok: true, vertrag_id: existing.id as string, created: false }
  }

  const { data: zuordnung } = await supabaseAdmin
    .from('auftrag_handwerker')
    .select('gewerk_id, gewerke(name)')
    .eq('auftrag_id', auftragId)
    .eq('handwerker_id', handwerkerId)
    .maybeSingle()

  if (!zuordnung) {
    return { ok: false, message: 'Keine Handwerker-Zuordnung am Auftrag.' }
  }

  const gewerk = unwrapJoin(
    (zuordnung as { gewerke?: { name: string } | { name: string }[] | null }).gewerke
  )
  const gewerkName = gewerk?.name ?? ''
  const gewerkId = (zuordnung as { gewerk_id?: string | null }).gewerk_id ?? null

  const { data: auf } = await supabaseAdmin
    .from('auftraege')
    .select('id, titel, kunden(plz, ort, adresse, strasse, hausnummer), auftrag_positionen(*)')
    .eq('id', auftragId)
    .maybeSingle()

  if (!auf) return { ok: false, message: 'Auftrag nicht gefunden' }

  const positionen = (auf.auftrag_positionen ?? []) as AuftragPosition[]
  const pos = positionenFuerZuordnung(positionen, handwerkerId, gewerkName)
  const kunde = auf.kunden as {
    adresse?: string | null
    strasse?: string | null
    hausnummer?: string | null
    plz?: string | null
    ort?: string | null
  } | null
  const kundeAdr =
    kunde?.adresse?.trim() ||
    [kunde?.strasse, kunde?.hausnummer].filter(Boolean).join(' ').trim() ||
    null

  const now = new Date().toISOString()
  const vertragsNr = await nextVertragsnummer(supabaseAdmin, 'projekt')

  let vertragId = existing?.id as string | undefined

  const row = {
    typ: 'projekt' as const,
    vertrags_nr: vertragsNr,
    auftrag_id: auftragId,
    handwerker_id: handwerkerId,
    gewerk_id: gewerkId,
    gewerk_name: gewerkName || null,
    bauvorhaben: bauvorhabenAusAuftrag({
      titel: (auf.titel as string | null) ?? 'Auftrag',
      kunde_adresse: kundeAdr,
      kunde_plz: kunde?.plz ?? null,
      kunde_ort: kunde?.ort ?? null,
      gewerk_name: gewerkName,
    }),
    leistungsumfang: leistungsumfangAusPositionen(pos),
    verguetung_text: verguetungAusPositionen(pos),
    regiesatz_netto: 56,
    einbehalt_prozent: 5,
    zahlungsziel_tage: 14,
    aufmass_rhythmus_tage: 14,
    notizen: 'Automatisch erzeugt — Partner bestätigt im Portal.',
    updated_at: now,
  }

  if (vertragId) {
    const { error } = await supabaseAdmin.from('handwerker_vertraege').update(row).eq('id', vertragId)
    if (error) return { ok: false, message: error.message }
  } else {
    const { data: ins, error } = await supabaseAdmin
      .from('handwerker_vertraege')
      .insert({ ...row, status: 'entwurf', created_at: now })
      .select('id')
      .single()
    if (error || !ins) return { ok: false, message: error?.message ?? 'Vertrag anlegen fehlgeschlagen' }
    vertragId = ins.id as string
  }

  const pdf = await persistPdfForVertrag(vertragId)
  if (!pdf.ok) return pdf

  return { ok: true, vertrag_id: vertragId, created: true }
}
