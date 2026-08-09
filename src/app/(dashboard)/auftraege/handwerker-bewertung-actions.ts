'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import type { HandwerkerBewertungWerte } from '@/lib/handwerker/bewertung-kategorien'
import { istHandwerkerBewertungVollstaendig } from '@/lib/handwerker/bewertung-kategorien'

export type HandwerkerBewertungZeile = HandwerkerBewertungWerte & {
  handwerkerId: string
  gewerkId: string | null
  notiz: string | null
}

export type GespeicherteHandwerkerBewertung = HandwerkerBewertungZeile & {
  id: string
  updatedAt: string | null
}

function mapRow(row: Record<string, unknown>): GespeicherteHandwerkerBewertung {
  return {
    id: row.id as string,
    handwerkerId: row.handwerker_id as string,
    gewerkId: (row.gewerk_id as string | null) ?? null,
    qualitaet: row.qualitaet as number,
    termintreue: row.termintreue as number,
    sauberkeit: row.sauberkeit as number,
    kommunikation: row.kommunikation as number,
    preis_leistung: row.preis_leistung as number,
    notiz: (row.notiz as string | null) ?? null,
    updatedAt: (row.updated_at as string | null) ?? null,
  }
}

export async function loadHandwerkerBewertungenFuerAuftrag(
  auftragId: string
): Promise<{ ok: true; bewertungen: GespeicherteHandwerkerBewertung[] } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('handwerker_bewertungen')
    .select(
      'id, handwerker_id, gewerk_id, qualitaet, termintreue, sauberkeit, kommunikation, preis_leistung, notiz, updated_at'
    )
    .eq('auftrag_id', auftragId)

  if (error) return { ok: false, message: error.message }
  return { ok: true, bewertungen: (data ?? []).map((r) => mapRow(r as Record<string, unknown>)) }
}

export async function saveHandwerkerBewertungen(
  auftragId: string,
  eingaben: HandwerkerBewertungZeile[]
): Promise<{ ok: true; gespeichert: number } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: auftrag, error: aErr } = await supabase
    .from('auftraege')
    .select('id, status')
    .eq('id', auftragId)
    .maybeSingle()

  if (aErr || !auftrag) return { ok: false, message: 'Auftrag nicht gefunden' }
  if (auftrag.status !== 'abgeschlossen') {
    return { ok: false, message: 'Bewertungen sind nur bei abgeschlossenen Aufträgen möglich.' }
  }

  const valide = eingaben.filter((e) => istHandwerkerBewertungVollstaendig(e))
  if (!valide.length) {
    return { ok: false, message: 'Bitte für mindestens einen Handwerker alle 5 Kategorien bewerten.' }
  }

  const now = new Date().toISOString()
  let gespeichert = 0

  for (const e of valide) {
    const { error } = await supabase.from('handwerker_bewertungen').upsert(
      {
        handwerker_id: e.handwerkerId,
        auftrag_id: auftragId,
        gewerk_id: e.gewerkId,
        qualitaet: e.qualitaet,
        termintreue: e.termintreue,
        sauberkeit: e.sauberkeit,
        kommunikation: e.kommunikation,
        preis_leistung: e.preis_leistung,
        notiz: e.notiz?.trim() || null,
        erstellt_von: user?.id ?? null,
        updated_at: now,
      },
      { onConflict: 'handwerker_id,auftrag_id' }
    )
    if (error) return { ok: false, message: error.message }
    gespeichert++
    revalidatePath(`/handwerker/${e.handwerkerId}`)
  }

  revalidatePath(`/auftraege/${auftragId}`)
  revalidatePath('/handwerker')
  return { ok: true, gespeichert }
}

/** Handwerker-Ziele für Bewertung-UI (ohne volles AuftragDetail). */
export async function loadHandwerkerBewertungZiele(
  auftragId: string
): Promise<
  | {
      ok: true
      ziele: {
        handwerkerId: string
        name: string
        firma: string | null
        gewerkName: string | null
        gewerkId: string | null
      }[]
    }
  | { ok: false; message: string }
> {
  const supabase = createClient()
  const id = auftragId.trim()
  if (!id) return { ok: false, message: 'Auftrag fehlt.' }

  const { data: ah, error: ahErr } = await supabase
    .from('auftrag_handwerker')
    .select('handwerker_id, gewerk_id, handwerker(id, name, firma), gewerke(id, name)')
    .eq('auftrag_id', id)

  if (ahErr) return { ok: false, message: ahErr.message }

  const map = new Map<
    string,
    {
      handwerkerId: string
      name: string
      firma: string | null
      gewerkName: string | null
      gewerkId: string | null
    }
  >()

  for (const row of ah ?? []) {
    const hwRaw = row.handwerker
    const hw = (Array.isArray(hwRaw) ? hwRaw[0] : hwRaw) as
      | { id?: string; name?: string; firma?: string | null }
      | null
    const gwRaw = row.gewerke
    const gw = (Array.isArray(gwRaw) ? gwRaw[0] : gwRaw) as { id?: string; name?: string } | null
    const hid = String(row.handwerker_id ?? hw?.id ?? '')
    if (!hid || !hw?.name) continue
    map.set(hid, {
      handwerkerId: hid,
      name: hw.name,
      firma: hw.firma ?? null,
      gewerkName: gw?.name ?? null,
      gewerkId: (row.gewerk_id as string | null) ?? gw?.id ?? null,
    })
  }

  if (map.size === 0) {
    const { data: pos } = await supabase
      .from('auftrag_positionen')
      .select('handwerker_id, gewerk_name, handwerker(id, name, firma)')
      .eq('auftrag_id', id)
    for (const p of pos ?? []) {
      const hwRaw = p.handwerker
      const hw = (Array.isArray(hwRaw) ? hwRaw[0] : hwRaw) as
        | { id?: string; name?: string; firma?: string | null }
        | null
      const hid = String(p.handwerker_id ?? hw?.id ?? '')
      if (!hid || !hw?.name || map.has(hid)) continue
      map.set(hid, {
        handwerkerId: hid,
        name: hw.name,
        firma: hw.firma ?? null,
        gewerkName: (p.gewerk_name as string | null) ?? null,
        gewerkId: null,
      })
    }
  }

  return {
    ok: true,
    ziele: Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'de')),
  }
}
