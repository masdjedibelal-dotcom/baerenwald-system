import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { istGewerkBeschreibungPosition } from '@/lib/dokument-zeilen'
import { angebotPositionenToAuftragRows } from '@/lib/auftrag-positionen-map'
import { handwerkerAusGeschwisterPositionen } from '@/lib/auftraege/auftrag-position-handwerker-erbe'
import { buildGewerkEkMap } from '@/lib/partner/handwerker-einreichung'
import { provisionProjektvertragFireAndForget } from '@/lib/vertraege/provision-projektvertrag'
import type { AngebotHandwerkerRow, AngebotPosition, AuftragPosition } from '@/lib/types'

function norm(s: string): string {
  return s.trim().toLowerCase()
}

function findAuftragPosMatch(
  pool: AuftragPosition[],
  angPos: AngebotPosition
): AuftragPosition | null {
  const leistung = norm(String(angPos.leistung_name || angPos.leistung || angPos.beschreibung || ''))
  const slug = angPos.gewerk_slug?.trim() || null
  const gName = norm(angPos.gewerk_name || '')

  const scoped = pool.filter((p) => {
    if (slug && p.gewerk_slug?.trim() === slug) return true
    if (gName && norm(p.gewerk_name) === gName) return true
    return false
  })
  const candidates = scoped.length ? scoped : pool
  const exact = candidates.find((p) => norm(p.leistung_name) === leistung)
  if (exact) return exact
  if (candidates.length === 1) return candidates[0]!
  return null
}

/** Angebotspositionen → bestehende Auftragspositionen aktualisieren / neue anlegen. */
export async function syncAngebotPositionenZuAuftrag(input: {
  auftragId: string
  angebotPositionen: AngebotPosition[]
  angebotHandwerker?: AngebotHandwerkerRow[] | null
}): Promise<
  | { ok: true; neu: number; aktualisiert: number }
  | { ok: false; message: string }
> {
  const auftragId = input.auftragId.trim()
  const positionen = normalizeAngebotPositionen(input.angebotPositionen).filter(
    (p) => !istGewerkBeschreibungPosition(p)
  )
  if (!positionen.length) {
    return { ok: false, message: 'Keine Leistungspositionen zum Übernehmen.' }
  }

  const { data: existing, error: loadErr } = await supabaseAdmin
    .from('auftrag_positionen')
    .select('*')
    .eq('auftrag_id', auftragId)

  if (loadErr) return { ok: false, message: loadErr.message }

  const pool = (existing ?? []) as AuftragPosition[]
  const gewerkEk = buildGewerkEkMap(input.angebotHandwerker ?? [])
  const maxSort = pool.reduce((m, p) => Math.max(m, p.sort_order ?? 0), 0)
  let sortCursor = maxSort + 10
  let neu = 0
  let aktualisiert = 0

  for (const angPos of positionen) {
    const rows = angebotPositionenToAuftragRows(auftragId, [angPos], {
      gewerkEkByGewerkId: gewerkEk,
    })
    const row = rows[0]
    if (!row) continue

    let erbt: ReturnType<typeof handwerkerAusGeschwisterPositionen> = null
    if (!row.handwerker_id?.trim()) {
      erbt = handwerkerAusGeschwisterPositionen(pool, {
        gewerk_block_key: row.gewerk_block_key,
        gewerk_slug: row.gewerk_slug,
        gewerk_name: row.gewerk_name,
      })
      if (erbt) row.handwerker_id = erbt.handwerker_id
    }

    const match = findAuftragPosMatch(pool, angPos)
    if (match?.id) {
      const angebotHwId = angPos.handwerker_id?.trim() || null
      const bestehendHwId = match.handwerker_id?.trim() || null
      const resolvedHandwerkerId =
        angebotHwId || bestehendHwId || erbt?.handwerker_id || row.handwerker_id?.trim() || null

      const patch: Record<string, unknown> = {
        gewerk_slug: row.gewerk_slug,
        gewerk_name: row.gewerk_name,
        gewerk_block_key: row.gewerk_block_key,
        leistung_name: row.leistung_name,
        beschreibung: row.beschreibung,
        einheit: row.einheit,
        menge: row.menge,
        preis_fix: row.preis_fix,
        lohn_fix: row.lohn_fix,
        material_fix: row.material_fix,
      }

      if (resolvedHandwerkerId) {
        patch.handwerker_id = resolvedHandwerkerId
        if (
          erbt?.handwerker_status &&
          resolvedHandwerkerId !== bestehendHwId
        ) {
          patch.handwerker_status = erbt.handwerker_status
        }
      }

      const hatVerhandeltenPartnerPreis =
        match.preis_partner != null &&
        Number(match.preis_partner) > 0 &&
        Boolean(bestehendHwId)
      if (!hatVerhandeltenPartnerPreis && row.preis_partner != null) {
        patch.preis_partner = row.preis_partner
      }

      const { error } = await supabaseAdmin.from('auftrag_positionen').update(patch).eq('id', match.id)
      if (!error) aktualisiert++
      continue
    }

    const { error } = await supabaseAdmin.from('auftrag_positionen').insert({
      ...row,
      handwerker_status: erbt?.handwerker_status ?? null,
      sort_order: sortCursor,
    })
    sortCursor += 10
    if (!error) {
      neu++
      pool.push({
        id: '',
        auftrag_id: auftragId,
        gewerk_slug: row.gewerk_slug,
        gewerk_name: row.gewerk_name,
        gewerk_block_key: row.gewerk_block_key,
        leistung_name: row.leistung_name,
        handwerker_id: row.handwerker_id,
        handwerker_status: erbt?.handwerker_status ?? null,
      } as AuftragPosition)
    }
  }

  const gewerkNamen = Array.from(new Set(positionen.map((p) => p.gewerk_name).filter(Boolean)))
  if (gewerkNamen.length) {
    const { data: auftrag } = await supabaseAdmin
      .from('auftraege')
      .select('titel, kunden(name)')
      .eq('id', auftragId)
      .maybeSingle()
    if (auftrag) {
      const kRaw = auftrag.kunden as { name?: string } | { name?: string }[] | null
      const kunde = Array.isArray(kRaw) ? kRaw[0] : kRaw
      const titel = `${gewerkNamen.join(', ')} — ${kunde?.name ?? 'Kunde'}`.slice(0, 240)
      await supabaseAdmin.from('auftraege').update({ titel }).eq('id', auftragId)
    }
  }

  const hwRows = (input.angebotHandwerker ?? []).filter(
    (h) => (h.status ?? '').toLowerCase() === 'akzeptiert' || hasHwUebernommen(h)
  )
  for (const h of hwRows) {
    if (!h.handwerker_id || !h.gewerk_id) continue
    const { data: existingAh } = await supabaseAdmin
      .from('auftrag_handwerker')
      .select('id')
      .eq('auftrag_id', auftragId)
      .eq('handwerker_id', h.handwerker_id)
      .maybeSingle()
    if (existingAh?.id) continue
    await supabaseAdmin.from('auftrag_handwerker').insert({
      auftrag_id: auftragId,
      handwerker_id: h.handwerker_id,
      gewerk_id: h.gewerk_id,
      status: 'zugewiesen',
    })
  }

  provisionProjektvertragFireAndForget(auftragId)

  return { ok: true, neu, aktualisiert }
}

function hasHwUebernommen(h: AngebotHandwerkerRow): boolean {
  return (h.hw_status ?? '').toLowerCase() === 'uebernommen'
}
