/**
 * Lädt die gemeinsame Bericht-Datenquelle (Phase 12 / Spec §16).
 */

import {
  listAuftragPositionEintraege,
  listAuftragTagesspannen,
} from '@/app/(dashboard)/auftraege/position-lebenszyklus-actions'
import {
  buildBerichtDatenquelle,
  type BerichtDatenquelle,
  type BerichtMaterialZeile,
  type BerichtPositionMeta,
} from '@/lib/auftraege/bericht-datenquelle'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Kunde } from '@/lib/types'

function kundeName(k: Kunde | null): string {
  if (!k) return '—'
  return k.name?.trim() || [k.vorname, k.nachname].filter(Boolean).join(' ').trim() || '—'
}

function kundeAdresse(k: Kunde | null): string {
  if (!k) return '—'
  const str = [k.strasse, k.hausnummer].filter(Boolean).join(' ').trim()
  const ort = [k.plz, k.ort].filter(Boolean).join(' ').trim()
  return [str, ort].filter(Boolean).join(', ') || k.adresse?.trim() || '—'
}

export async function loadBerichtDatenquelle(
  auftragId: string
): Promise<
  | { ok: true; data: BerichtDatenquelle; kunde: Kunde | null }
  | { ok: false; message: string }
> {
  const { data: auf, error: aufErr } = await supabaseAdmin
    .from('auftraege')
    .select('id, titel, kunden(*)')
    .eq('id', auftragId)
    .maybeSingle()

  if (aufErr || !auf) {
    return { ok: false, message: aufErr?.message || 'Auftrag nicht gefunden.' }
  }

  const kundeRaw = auf.kunden
  const kunde = (Array.isArray(kundeRaw) ? kundeRaw[0] : kundeRaw) as Kunde | null

  const { data: posRows } = await supabaseAdmin
    .from('auftrag_positionen')
    .select(
      'id, leistung_name, beschreibung, typ, verguetung, gewerk_name, stundensatz, preis_partner, geschaetzt_std, handwerker(name, firma)'
    )
    .eq('auftrag_id', auftragId)
    .order('sort_order', { ascending: true })

  const positionen: BerichtPositionMeta[] = (posRows ?? []).map((p) => {
    const hwRaw = p.handwerker
    const hw = Array.isArray(hwRaw) ? hwRaw[0] : hwRaw
    return {
      id: String(p.id),
      leistung_name: String(p.leistung_name ?? 'Leistung'),
      beschreibung: p.beschreibung ?? null,
      typ: p.typ ?? null,
      verguetung: p.verguetung ?? null,
      gewerk_name: p.gewerk_name ?? null,
      stundensatz: Number(p.stundensatz ?? p.preis_partner) || null,
      geschaetzt_std: p.geschaetzt_std != null ? Number(p.geschaetzt_std) : null,
      handwerker_name: hw?.name ?? null,
      handwerker_firma: hw?.firma ?? null,
    }
  })

  const posIds = positionen.map((p) => p.id)
  const material: BerichtMaterialZeile[] = []
  if (posIds.length) {
    const { data: mats } = await supabaseAdmin
      .from('position_material')
      .select('position_id, bezeichnung, menge, einzelpreis')
      .in('position_id', posIds)
    for (const m of mats ?? []) {
      const menge = Number(m.menge) || 0
      const einzelpreis = Number(m.einzelpreis) || 0
      material.push({
        position_id: String(m.position_id),
        bezeichnung: String(m.bezeichnung ?? 'Material'),
        menge,
        einzelpreis,
        gesamt: Math.round(menge * einzelpreis * 100) / 100,
      })
    }
  }

  const [eintraege, schichten] = await Promise.all([
    listAuftragPositionEintraege(auftragId),
    listAuftragTagesspannen(auftragId),
  ])

  const data = buildBerichtDatenquelle({
    auftragId,
    projektTitel: String(auf.titel ?? 'Auftrag').trim() || 'Auftrag',
    projektAdresse: kundeAdresse(kunde),
    auftraggeberName: kundeName(kunde),
    eintraege,
    schichten,
    positionen,
    material,
  })

  return { ok: true, data, kunde }
}
