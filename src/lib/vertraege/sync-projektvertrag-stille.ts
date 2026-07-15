import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  bauvorhabenAusAuftrag,
  leistungsumfangAusPositionen,
  verguetungAusPositionen,
} from '@/lib/vertraege/build-vertrag-texte'
import { persistPdfForVertrag } from '@/lib/vertraege/persist-vertrag-pdf'
import { letzterHauptvertrag } from '@/lib/vertraege/portal-vertrag-helpers'
import type { HandwerkerVertragRow } from '@/lib/vertraege/types'
import type { AuftragPosition } from '@/lib/types'
import { auftragErfordertProjektvertrag } from '@/lib/auftraege/auftrag-erfordert-projektvertrag'

function unwrapJoin<T>(raw: T | T[] | null | undefined): T | null {
  if (!raw) return null
  return Array.isArray(raw) ? (raw[0] ?? null) : raw
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

export type SyncProjektvertragStilleResult =
  | { ok: true; updated: boolean; skipped?: boolean; reason?: string; vertrag_id?: string }
  | { ok: false; message: string }

async function loadVertragMeta(auftragId: string, handwerkerId: string) {
  const { data: zuordnung } = await supabaseAdmin
    .from('auftrag_handwerker')
    .select('id, projektvertrag_bestaetigt_am, gewerke(name)')
    .eq('auftrag_id', auftragId)
    .eq('handwerker_id', handwerkerId)
    .maybeSingle()

  const gewerk = unwrapJoin(
    (zuordnung as { gewerke?: { name: string } | { name: string }[] | null } | null)?.gewerke
  )
  const gewerkName = gewerk?.name ?? ''

  const { data: auf } = await supabaseAdmin
    .from('auftraege')
    .select('id, titel, kunden(plz, ort, adresse, strasse, hausnummer), auftrag_positionen(*)')
    .eq('id', auftragId)
    .maybeSingle()

  if (!auf) return { ok: false as const, message: 'Auftrag nicht gefunden' }

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

  return {
    ok: true as const,
    zuordnung,
    gewerkName,
    meta: {
      bauvorhaben: bauvorhabenAusAuftrag({
        titel: (auf.titel as string | null) ?? 'Auftrag',
        kunde_adresse: kundeAdr,
        kunde_plz: kunde?.plz ?? null,
        kunde_ort: kunde?.ort ?? null,
        gewerk_name: gewerkName,
      }),
      leistungsumfang: leistungsumfangAusPositionen(pos),
      verguetung_text: verguetungAusPositionen(pos),
    },
  }
}

function vertragIstBestaetigt(
  zuordnung: { projektvertrag_bestaetigt_am?: string | null } | null,
  hauptvertrag: HandwerkerVertragRow | null
): boolean {
  if (zuordnung?.projektvertrag_bestaetigt_am) return true
  if (!hauptvertrag) return false
  const st = (hauptvertrag.status ?? '').toLowerCase()
  return st === 'unterschrieben' || st === 'signiert' || Boolean(hauptvertrag.signiert_am)
}

/**
 * Aktualisiert den Haupt-Projektvertrag still aus den aktuellen Auftragspositionen
 * (Leistungsumfang + Vergütung + PDF), ohne Portal-Bestätigung oder Mail.
 */
export async function syncProjektvertragStille(
  auftragId: string,
  handwerkerId: string
): Promise<SyncProjektvertragStilleResult> {
  const aid = auftragId.trim()
  const hid = handwerkerId.trim()
  if (!aid || !hid) return { ok: false, message: 'Auftrag oder Handwerker fehlt.' }

  if (!(await auftragErfordertProjektvertrag(aid))) {
    return { ok: true, updated: false, skipped: true, reason: 'kein_bauprojekt' }
  }

  const loaded = await loadVertragMeta(aid, hid)
  if (!loaded.ok) return loaded

  const { data: vertraegeRaw } = await supabaseAdmin
    .from('handwerker_vertraege')
    .select('*')
    .eq('auftrag_id', aid)
    .eq('handwerker_id', hid)
    .eq('typ', 'projekt')
    .order('created_at', { ascending: false })

  const vertraege = (vertraegeRaw ?? []) as HandwerkerVertragRow[]
  const hauptvertrag = letzterHauptvertrag(vertraege, aid, hid)

  if (!vertragIstBestaetigt(loaded.zuordnung, hauptvertrag)) {
    return { ok: true, updated: false, skipped: true, reason: 'noch_nicht_bestaetigt' }
  }

  if (!hauptvertrag?.id) {
    return { ok: true, updated: false, skipped: true, reason: 'kein_hauptvertrag' }
  }

  const { meta } = loaded
  if (
    (hauptvertrag.bauvorhaben ?? '').trim() === meta.bauvorhaben.trim() &&
    (hauptvertrag.leistungsumfang ?? '').trim() === meta.leistungsumfang.trim() &&
    (hauptvertrag.verguetung_text ?? '').trim() === meta.verguetung_text.trim()
  ) {
    return { ok: true, updated: false, skipped: true, reason: 'unveraendert', vertrag_id: hauptvertrag.id }
  }

  const now = new Date().toISOString()
  const { error } = await supabaseAdmin
    .from('handwerker_vertraege')
    .update({
      bauvorhaben: meta.bauvorhaben,
      leistungsumfang: meta.leistungsumfang,
      verguetung_text: meta.verguetung_text,
      updated_at: now,
    })
    .eq('id', hauptvertrag.id)

  if (error) return { ok: false, message: error.message }

  const pdf = await persistPdfForVertrag(hauptvertrag.id)
  if (!pdf.ok) return pdf

  return { ok: true, updated: true, vertrag_id: hauptvertrag.id }
}

export function syncProjektvertragStilleFireAndForget(auftragId: string, handwerkerId: string) {
  void syncProjektvertragStille(auftragId, handwerkerId).then((r) => {
    if (!r.ok) {
      console.warn('[syncProjektvertragStille]', auftragId, handwerkerId, r.message)
      return
    }
    if (r.updated) {
      console.info('[syncProjektvertragStille] aktualisiert', auftragId, handwerkerId, r.vertrag_id)
    }
  })
}

export async function syncProjektvertragStilleFuerAuftrag(
  auftragId: string
): Promise<{ ok: true; handwerker: number } | { ok: false; message: string }> {
  const aid = auftragId.trim()
  if (!aid) return { ok: false, message: 'Auftrag fehlt.' }

  const { data: zuordnungen, error } = await supabaseAdmin
    .from('auftrag_handwerker')
    .select('handwerker_id, projektvertrag_bestaetigt_am')
    .eq('auftrag_id', aid)
    .not('projektvertrag_bestaetigt_am', 'is', null)

  if (error) return { ok: false, message: error.message }

  const hwIds = new Set(
    (zuordnungen ?? []).map((z) => String((z as { handwerker_id: string }).handwerker_id))
  )

  if (!hwIds.size) {
    const { data: vertraege } = await supabaseAdmin
      .from('handwerker_vertraege')
      .select('handwerker_id, status, signiert_am, dokument_art, parent_vertrag_id')
      .eq('auftrag_id', aid)
      .eq('typ', 'projekt')

    for (const v of vertraege ?? []) {
      const row = v as {
        handwerker_id: string
        status?: string | null
        signiert_am?: string | null
        dokument_art?: string | null
        parent_vertrag_id?: string | null
      }
      if (row.dokument_art === 'ergaenzung' || row.parent_vertrag_id) continue
      const st = (row.status ?? '').toLowerCase()
      if (st === 'unterschrieben' || st === 'signiert' || row.signiert_am) {
        hwIds.add(String(row.handwerker_id))
      }
    }
  }

  for (const hwId of Array.from(hwIds)) {
    await syncProjektvertragStille(aid, hwId)
  }

  return { ok: true, handwerker: hwIds.size }
}

const VERTRAG_RELEVANTE_POSITION_PATCH_KEYS = new Set([
  'leistung_name',
  'preis_partner',
  'preis_fix',
  'einheit',
  'menge',
  'handwerker_id',
])

export function positionPatchBenoetigtVertragSync(patch: Record<string, unknown>): boolean {
  return Object.keys(patch).some((k) => VERTRAG_RELEVANTE_POSITION_PATCH_KEYS.has(k))
}
