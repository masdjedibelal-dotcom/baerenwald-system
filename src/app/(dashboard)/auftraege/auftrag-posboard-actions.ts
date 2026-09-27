'use server'

import { revalidateAuftragDetail } from '@/lib/crm-revalidate'
import { COPY_ERROR } from '@/lib/copy/errors'
import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'
import { syncAuftragIstBauprojekt } from '@/lib/auftraege/sync-auftrag-ist-bauprojekt'
import { syncAuftragFortschrittFromPositionen } from '@/app/(dashboard)/auftraege/positionen-steuerung-actions'
import {
  auftragDarfKorrektur,
  loadAuftragKorrekturKontext,
  auftragKorrekturSperrgrund,
} from '@/lib/angebote/auftrag-korrektur'
import type { PosBoardLine } from '@/lib/posboard/pos-board-line'
import { POS_BOARD_DEFAULT_GEWERK } from '@/lib/posboard/pos-board-line'
import type { AuftragPosition } from '@/lib/types'

async function assertAuftrag(auftragId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, message: 'Nicht angemeldet', supabase: null }
  const { data, error } = await supabase.from('auftraege').select('id').eq('id', auftragId).maybeSingle()
  if (error) logDbError('app/auftraege/auftrag-posboard-actions:auftraege', error)
  if (error || !data) return { ok: false as const, message: 'Auftrag nicht gefunden', supabase: null }
  return { ok: true as const, supabase }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(v: string | null | undefined): boolean {
  return Boolean(v && UUID_RE.test(v))
}

function slugFromGewerk(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'allgemein'
  )
}

function lineToRow(
  line: PosBoardLine,
  auftragId: string,
  sortOrder: number,
  base?: AuftragPosition | null
): Record<string, unknown> {
  const menge = Math.max(Number(line.menge) || 1, 0.0001)
  const unit = Math.round((Number(line.preis) || 0) * 100) / 100
  const lineTotal = Math.round(unit * menge * 100) / 100
  const gewerk = line.gewerk?.trim() || POS_BOARD_DEFAULT_GEWERK
  const isRegie = Boolean(line.regieSchein)
  return {
    auftrag_id: auftragId,
    leistung_name: line.name?.trim() || 'Position',
    beschreibung: line.beschreibung?.trim() || null,
    menge,
    einheit: line.einheit?.trim() || (isRegie ? 'h' : 'Stück'),
    gewerk_name: gewerk,
    gewerk_slug: base?.gewerk_slug?.trim() || slugFromGewerk(gewerk),
    gewerk_block_key: base?.gewerk_block_key ?? null,
    lohn_fix: unit,
    material_fix: 0,
    preis_fix: lineTotal,
    sort_order: sortOrder,
    handwerker_id: base?.handwerker_id ?? null,
    handwerker_status: base?.handwerker_status ?? null,
    leistung_status: base?.leistung_status ?? 'offen',
    preis_partner: base?.preis_partner ?? null,
    notizen_intern: base?.notizen_intern ?? null,
    absprachen: base?.absprachen ?? null,
    typ: isRegie ? 'regie' : base?.typ ?? 'lv',
    verguetung: isRegie ? 'aufwand' : 'festpreis',
    geschaetzt_std: isRegie ? menge : null,
    // PosBoard am Direktauftrag = Kundenpreis; Partner-Satz behalten wenn vorhanden
    stundensatz: isRegie ? (base?.stundensatz ?? unit) : null,
    stundensatz_kunde: isRegie ? unit : null,
  }
}

/** PosBoard → `auftrag_positionen` (bestehende HW-Zuordnung je ID behalten). */
export async function replaceAuftragPositionenFromPosBoard(
  auftragId: string,
  lines: PosBoardLine[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertAuftrag(auftragId)
  if (!gate.ok) return gate
  const supabase = gate.supabase!

  const { data: existing, error: loadErr } = await supabase
    .from('auftrag_positionen')
    .select('*')
    .eq('auftrag_id', auftragId)
  if (loadErr) logDbError('app/auftraege/auftrag-posboard-actions:auftrag_positionen', loadErr)

  if (loadErr) return { ok: false, message: loadErr.message }

  const baseById = new Map(
    ((existing ?? []) as AuftragPosition[]).map((p) => [p.id, p])
  )
  const keepIds = new Set(lines.map((l) => l.id).filter(Boolean))

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    // PosBoard-Client-IDs (`p-…`) sind keine UUIDs — nur echte DB-IDs updaten
    const base = isUuid(line.id) ? baseById.get(line.id) ?? null : null
    const row = lineToRow(line, auftragId, i, base)

    if (base) {
      const { error } = await supabase
        .from('auftrag_positionen')
        .update(row)
        .eq('id', line.id)
        .eq('auftrag_id', auftragId)
      if (error) logDbError('app/auftraege/auftrag-posboard-actions:auftrag_positionen', error)
      if (error) return { ok: false, message: error.message }
    } else {
      // id weglassen → Postgres generiert UUID (Client-IDs wie `p-…` sind ungültig)
      const { error } = await supabase.from('auftrag_positionen').insert(row)
      if (error) logDbError('app/auftraege/auftrag-posboard-actions:auftrag_positionen', error)
      if (error) return { ok: false, message: error.message }
    }
  }

  for (const p of existing ?? []) {
    const id = String((p as { id: string }).id)
    if (keepIds.has(id)) continue
    const hwId = (p as { handwerker_id?: string | null }).handwerker_id
    if (hwId) {
      const { error } = await supabase
        .from('auftrag_positionen')
        .update({ aenderung_typ: 'entfernt' })
        .eq('id', id)
        .eq('auftrag_id', auftragId)
      if (error) logDbError('app/auftraege/auftrag-posboard-actions:auftrag_positionen', error)
      if (error) return { ok: false, message: error.message }
    } else {
      const { error } = await supabase
        .from('auftrag_positionen')
        .delete()
        .eq('id', id)
        .eq('auftrag_id', auftragId)
      if (error) logDbError('app/auftraege/auftrag-posboard-actions:auftrag_positionen', error)
      if (error) return { ok: false, message: error.message }
    }
  }

  await syncAuftragIstBauprojekt(auftragId)
  await syncAuftragFortschrittFromPositionen(auftragId)

  revalidateAuftragDetail(auftragId)
  return { ok: true }
}

/**
 * Direktauftrag ohne Angebot: PosBoard → `auftrag_positionen`.
 * Mit verknüpftem Angebot → Angebot-Korrektur nutzen (nicht diesen Pfad).
 */
export async function saveAuftragLeistungenOhneAngebot(input: {
  auftragId: string
  positionen: PosBoardLine[]
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: COPY_ERROR.sessionExpired }

  const auftragId = input.auftragId.trim()
  if (!auftragId) return { ok: false, message: COPY_ERROR.validation }

  const { data: auftrag, error } = await supabase
    .from('auftraege')
    .select('id, angebot_id, status')
    .eq('id', auftragId)
    .maybeSingle()
  if (error) logDbError('app/auftraege/auftrag-posboard-actions:auftraege', error)
  if (error || !auftrag) return { ok: false, message: COPY_ERROR.notFound }

  if (String(auftrag.angebot_id ?? '').trim()) {
    return { ok: false, message: COPY_ERROR.leistungenOhneAngebotNurDirekt }
  }
  if ((auftrag.status ?? '') === 'storniert') {
    return { ok: false, message: COPY_ERROR.forbidden }
  }

  const korrektur = await loadAuftragKorrekturKontext(supabase, { auftragId })
  if (!auftragDarfKorrektur(korrektur)) {
    return { ok: false, message: auftragKorrekturSperrgrund(korrektur) }
  }

  const lines = (input.positionen ?? []).filter((l) => l.name?.trim())
  if (!lines.length) {
    return { ok: false, message: COPY_ERROR.validation }
  }

  return replaceAuftragPositionenFromPosBoard(auftragId, lines)
}
