'use server'

import { revalidateAngebotDetail,revalidateAuftragDetail } from '@/lib/crm-revalidate'
import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { normalizeAngebotPositionen,summenAusPositionen } from '@/lib/angebot-positionen'
import type { AngebotPosition } from '@/lib/types'
import { angebotNachtragMarker } from '@/lib/auftraege/nachtrag-utils'
import { planNachtragStatusWrite } from '@/lib/status/write-nachtrag-status'

const DEFAULT_MWST = 19

async function mergeNachtragIntoAngebot(auftragId: string, positionenNachtrag: unknown): Promise<void> {
  const { data: auf, error } = await supabaseAdmin.from('auftraege').select('angebot_id').eq('id', auftragId).maybeSingle()
  if (error) logDbError('app/auftraege/nachtrag-baustopp-actions:auftraege', error)
  const angebotId = auf?.angebot_id as string | null
  if (!angebotId) return

  const { data: ang, error: error2 } = await supabaseAdmin.from('angebote').select('positionen').eq('id', angebotId).maybeSingle()
  if (error2) logDbError('app/auftraege/nachtrag-baustopp-actions:angebote', error2)
  if (!ang) return

  const existing = normalizeAngebotPositionen(ang.positionen ?? [])
  const extra = normalizeAngebotPositionen(positionenNachtrag ?? [])
  const merged = [...existing, ...extra]
  const summen = summenAusPositionen(merged, DEFAULT_MWST)

  const { error: __dbErr1 } = await supabaseAdmin
    .from('angebote')
    .update({
      positionen: merged as unknown as Record<string, unknown>[],
      gesamt_min: summen.nettoMin,
      gesamt_max: summen.nettoMax,
      updated_at: new Date().toISOString(),
    })
    .eq('id', angebotId)
  if (__dbErr1) logDbError('app/auftraege/nachtrag-baustopp-actions:angebote', __dbErr1)
}

/** Nachtrags-Zeile zum Angebots-Dokument (Marker in beschreibung). */
export async function findNachtragRowByAngebotId(angebotId: string): Promise<{
  id: string
  auftrag_id: string
  status: string
} | null> {
  const id = angebotId.trim()
  if (!id) return null
  const marker = angebotNachtragMarker(id)
  const { data, error } = await supabaseAdmin
    .from('nachtraege')
    .select('id, auftrag_id, status')
    .ilike('beschreibung', `%${marker}%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) logDbError('app/auftraege/nachtrag-baustopp-actions:nachtraege', error)
  if (!data?.id || !data.auftrag_id) return null
  return {
    id: String(data.id),
    auftrag_id: String(data.auftrag_id),
    status: String(data.status ?? ''),
  }
}

/**
 * Nachtrags-Angebot angenommen → Positionen in bestehenden Auftrag mergen (kein 2. Auftrag).
 */
export async function applyNachtragsAngebotAnAuftrag(
  angebotId: string
): Promise<{ ok: true; auftragId: string } | { ok: false; message: string }> {
  const angId = angebotId.trim()
  if (!angId) return { ok: false, message: 'Angebot fehlt.' }

  const nachtrag = await findNachtragRowByAngebotId(angId)
  if (!nachtrag) {
    return { ok: false, message: 'Kein Nachtrag zu diesem Angebot gefunden.' }
  }

  const { data: ang, error: angErr } = await supabaseAdmin
    .from('angebote')
    .select('id, positionen, status')
    .eq('id', angId)
    .maybeSingle()
  if (angErr) logDbError('app/auftraege/nachtrag-baustopp-actions:angebote', angErr)
  if (angErr || !ang) return { ok: false, message: angErr?.message ?? 'Angebot nicht gefunden.' }

  const { syncAngebotPositionenZuAuftrag } = await import(
    '@/lib/auftraege/sync-angebot-zu-auftrag'
  )
  const { data: hwRows, error: error2 } = await supabaseAdmin
    .from('angebot_handwerker')
    .select('id, handwerker_id, gewerk_id, status')
    .eq('angebot_id', angId)
  if (error2) logDbError('app/auftraege/nachtrag-baustopp-actions:angebot_handwerker', error2)

  const sync = await syncAngebotPositionenZuAuftrag({
    auftragId: nachtrag.auftrag_id,
    angebotPositionen: (ang.positionen as AngebotPosition[]) ?? [],
    angebotHandwerker: (hwRows ?? []) as never,
    appendOnly: true,
  })
  if (!sync.ok) return sync

  await mergeNachtragIntoAngebot(nachtrag.auftrag_id, ang.positionen)

  const now = new Date().toISOString()
  if (nachtrag.status !== 'akzeptiert') {
    const { error: __dbErr2 } = await supabaseAdmin
      .from('nachtraege')
      .update(
        planNachtragStatusWrite('akzeptiert', {
          akzeptiert_at: now,
          kunde_bestaetigt_at: now,
        })
      )
      .eq('id', nachtrag.id)
      .eq('auftrag_id', nachtrag.auftrag_id)
    if (__dbErr2) logDbError('app/auftraege/nachtrag-baustopp-actions:nachtraege', __dbErr2)
  }

  await insertAuftragTimelineEvent({
    auftrag_id: nachtrag.auftrag_id,
    typ: 'nachtrag_akzeptiert',
    titel: 'Nachtrags-Angebot angenommen',
    beschreibung: `Positionen in Auftrag übernommen (+${sync.neu} neu, ${sync.aktualisiert} aktualisiert)`,
    sichtbar_fuer_kunde: true,
  })

  revalidateAuftragDetail(nachtrag.auftrag_id)
  revalidateAngebotDetail(angId)
  return { ok: true, auftragId: nachtrag.auftrag_id }
}

/**
 * N3: Nachtrags-Angebot aus dem Wizard → nachtraege[] am Auftrag upserten
 * (Marker in beschreibung, da kein angebot_id-Feld am Schema).
 */
export async function upsertNachtragEntwurfFromAngebotWizard(input: {
  auftragId: string
  angebotId: string
  grund: string
  beschreibung?: string | null
  positionen: AngebotPosition[]
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const pos = normalizeAngebotPositionen(input.positionen)
  const summen = summenAusPositionen(pos, DEFAULT_MWST)
  const marker = angebotNachtragMarker(input.angebotId)
  const baseDesc = (input.beschreibung ?? '').trim()
  const beschreibung = baseDesc.includes(marker)
    ? baseDesc
    : [baseDesc, marker].filter(Boolean).join('\n\n')

  const { data: existing, error } = await supabaseAdmin
    .from('nachtraege')
    .select('id, status')
    .eq('auftrag_id', input.auftragId)
    .eq('status', 'entwurf')
    .ilike('beschreibung', `%${marker}%`)
    .maybeSingle()
  if (error) logDbError('app/auftraege/nachtrag-baustopp-actions:nachtraege', error)

  if (existing?.id) {
    const { error } = await supabaseAdmin
      .from('nachtraege')
      .update({
        grund: input.grund.trim() || 'Nachtrag',
        beschreibung,
        positionen: pos,
        gesamt_min: summen.bruttoMin,
        gesamt_max: summen.bruttoMax,
      })
      .eq('id', existing.id)
      .eq('auftrag_id', input.auftragId)
    if (error) logDbError('app/auftraege/nachtrag-baustopp-actions:nachtraege', error)
    if (error) return { ok: false, message: error.message }
    revalidateAuftragDetail(input.auftragId)
    return { ok: true, id: existing.id as string }
  }

  const { data: row, error: error2 } = await supabaseAdmin
    .from('nachtraege')
    .insert({
      auftrag_id: input.auftragId,
      grund: input.grund.trim() || 'Nachtrag',
      beschreibung,
      positionen: pos,
      gesamt_min: summen.bruttoMin,
      gesamt_max: summen.bruttoMax,
      status: 'entwurf',
      handwercher_bestaetigt: false,
    })
    .select('id')
    .single()
  if (error2) logDbError('app/auftraege/nachtrag-baustopp-actions:nachtraege', error2)

  if (error2 || !row) return { ok: false, message: error2?.message ?? 'Nachtrag speichern fehlgeschlagen' }

  await insertAuftragTimelineEvent({
    auftrag_id: input.auftragId,
    typ: 'nachtrag_entwurf',
    titel: 'Nachtrag aus Angebot',
    beschreibung: input.grund.slice(0, 500),
    erstellt_von: user.id,
  })

  revalidateAuftragDetail(input.auftragId)
  return { ok: true, id: row.id as string }
}
