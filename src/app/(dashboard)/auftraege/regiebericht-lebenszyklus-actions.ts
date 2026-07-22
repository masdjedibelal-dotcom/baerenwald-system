'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import { listAuftragPositionEintraege } from '@/app/(dashboard)/auftraege/position-lebenszyklus-actions'
import {
  RegieberichtPdfDocument,
  type RegieberichtPdfInput,
} from '@/lib/pdf/regiebericht-pdf'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'

/**
 * Regiebericht-PDF aus position_eintraege (neue Quelle §7).
 * Aggregiert Aufwand-Zeiten + Material einer Regie-Position.
 */
export async function renderRegieberichtFromLebenszyklus(
  auftragId: string,
  positionId?: string | null
): Promise<{ ok: true; buffer: Buffer; filename: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet.' }

  const { data: auf } = await supabaseAdmin
    .from('auftraege')
    .select('id, titel, kunden(name, adresse, plz, ort)')
    .eq('id', auftragId)
    .maybeSingle()
  if (!auf) return { ok: false, message: 'Auftrag nicht gefunden.' }

  let posQuery = supabaseAdmin
    .from('auftrag_positionen')
    .select(
      'id, leistung_name, beschreibung, stundensatz, preis_partner, verguetung, typ, handwerker_id, handwerker(name, firma), gewerk_name'
    )
    .eq('auftrag_id', auftragId)
    .eq('typ', 'regie')

  if (positionId) posQuery = posQuery.eq('id', positionId)

  const { data: posRows } = await posQuery.order('sort_order', { ascending: true }).limit(1)
  const pos = posRows?.[0]
  if (!pos) return { ok: false, message: 'Keine Regie-Position gefunden.' }

  const eintraege = (await listAuftragPositionEintraege(auftragId)).filter(
    (e) => e.position_id === String(pos.id)
  )
  const minuten = eintraege.reduce((s, e) => s + (Number(e.zeit_minuten) || 0), 0)
  const stunden = Math.round((minuten / 60) * 100) / 100
  const stundensatz = Number(pos.stundensatz ?? pos.preis_partner) || 0
  const lohnNetto = Math.round(stunden * stundensatz * 100) / 100

  const { data: mats } = await supabaseAdmin
    .from('position_material')
    .select('bezeichnung, menge, einzelpreis')
    .eq('position_id', pos.id)
  let materialNetto = 0
  const matNames: string[] = []
  for (const m of mats ?? []) {
    const z = Number(m.menge) * Number(m.einzelpreis)
    materialNetto += z
    matNames.push(String(m.bezeichnung))
  }
  materialNetto = Math.round(materialNetto * 100) / 100
  const netto = lohnNetto + materialNetto
  const mwst = Math.round(netto * 0.19 * 100) / 100
  const brutto = Math.round((netto + mwst) * 100) / 100

  const fotoUrls = eintraege
    .flatMap((e) => e.eintrag_fotos ?? [])
    .map((f) => f.display_url || f.storage_path)
    .filter((u): u is string => Boolean(u))
    .slice(0, 8)

  const hwRaw = pos.handwerker
  const hw = Array.isArray(hwRaw) ? hwRaw[0] : hwRaw
  const kundeRaw = auf.kunden
  const kunde = (Array.isArray(kundeRaw) ? kundeRaw[0] : kundeRaw) as {
    name?: string
    adresse?: string
    plz?: string
    ort?: string
  } | null

  const beschreibung =
    eintraege
      .map((e) => e.beschreibung)
      .filter(Boolean)
      .join('\n') || String(pos.beschreibung ?? pos.leistung_name)

  const input: RegieberichtPdfInput = {
    auftragIdShort: String(auftragId).slice(0, 8),
    datumFormular: new Date().toISOString().slice(0, 10),
    kundeBaustelle: {
      id: '',
      name: kunde?.name ?? 'Kunde',
      adresse: kunde?.adresse ?? null,
      plz: kunde?.plz ?? null,
      ort: kunde?.ort ?? null,
    } as never,
    auftraggeberName: kunde?.name ?? 'Kunde',
    auftraggeberAdresse: [kunde?.adresse, [kunde?.plz, kunde?.ort].filter(Boolean).join(' ')]
      .filter(Boolean)
      .join(', '),
    handwerkerName: hw?.name ?? 'Partner',
    handwerkerFirma: hw?.firma ?? null,
    gewerkName: pos.gewerk_name ?? null,
    beschreibung,
    grund: String(pos.leistung_name),
    stunden,
    stundensatz,
    lohnNetto,
    materialBezeichnung: matNames.join(', ') || '—',
    materialNetto,
    netto,
    mwst,
    brutto,
    fotoUrls,
    unterschriftKunde: null,
    unterschriftAt: null,
  }

  const buffer = await renderToBuffer(
    React.createElement(RegieberichtPdfDocument, input) as never
  )
  return {
    ok: true,
    buffer: Buffer.from(buffer),
    filename: `regiebericht-${String(pos.id).slice(0, 8)}.pdf`,
  }
}
