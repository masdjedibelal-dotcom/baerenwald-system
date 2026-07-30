'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { syncAuftragIstBauprojekt } from '@/lib/auftraege/sync-auftrag-ist-bauprojekt'
import { syncAuftragFortschrittFromPositionen } from '@/app/(dashboard)/auftraege/positionen-steuerung-actions'
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
  if (error || !data) return { ok: false as const, message: 'Auftrag nicht gefunden', supabase: null }
  return { ok: true as const, supabase }
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
    stundensatz: isRegie ? unit : null,
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

  if (loadErr) return { ok: false, message: loadErr.message }

  const baseById = new Map(
    ((existing ?? []) as AuftragPosition[]).map((p) => [p.id, p])
  )
  const keepIds = new Set(lines.map((l) => l.id).filter(Boolean))

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const base = baseById.get(line.id) ?? null
    const row = lineToRow(line, auftragId, i, base)

    if (base) {
      const { error } = await supabase
        .from('auftrag_positionen')
        .update(row)
        .eq('id', line.id)
        .eq('auftrag_id', auftragId)
      if (error) return { ok: false, message: error.message }
    } else {
      const { error } = await supabase.from('auftrag_positionen').insert({
        id: line.id,
        ...row,
      })
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
      if (error) return { ok: false, message: error.message }
    } else {
      const { error } = await supabase
        .from('auftrag_positionen')
        .delete()
        .eq('id', id)
        .eq('auftrag_id', auftragId)
      if (error) return { ok: false, message: error.message }
    }
  }

  await syncAuftragIstBauprojekt(auftragId)
  await syncAuftragFortschrittFromPositionen(auftragId)

  revalidatePath(`/auftraege/${auftragId}`)
  revalidatePath('/auftraege')
  revalidatePath('/vorgaenge')
  return { ok: true }
}
