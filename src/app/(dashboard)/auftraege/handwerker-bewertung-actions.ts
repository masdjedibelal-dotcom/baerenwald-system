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
