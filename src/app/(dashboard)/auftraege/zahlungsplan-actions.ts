'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import {
  emptyZahlungsplan,
  parseZahlungsplan,
  auftragSummenAusPositionen,
  validateZahlungsplanGegenGesamt,
  type Zahlungsplan,
} from '@/lib/rechnungen/zahlungsplan'
import { auftragPositionenToAngebotPositionen } from '@/lib/auftraege/auftrag-positionen-rechnung'
import type { AuftragPosition } from '@/lib/types'
import {
  zahlplanDarfGeloeschtWerden,
  zahlplanMergeMitEinfrieren,
} from '@/lib/rechnungen/zahlplan-gates'

/**
 * Spec Q2: Unverbindlicher Zahlplan-Vorschlag liegt auf `angebote.zahlungsplan`.
 * `auftraege.zahlungsplan` wird nicht mehr gelesen/geschrieben.
 */
async function angebotIdForAuftrag(
  supabase: ReturnType<typeof createClient>,
  auftragId: string
): Promise<{ ok: true; angebotId: string } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from('auftraege')
    .select('angebot_id')
    .eq('id', auftragId)
    .maybeSingle()
  if (error) return { ok: false, message: error.message }
  const angebotId = data?.angebot_id ? String(data.angebot_id) : ''
  if (!angebotId) {
    return {
      ok: false,
      message: 'Kein verknüpftes Angebot — Zahlplan-Vorschlag nur am Angebot speicherbar.',
    }
  }
  return { ok: true, angebotId }
}

export async function saveAuftragZahlungsplan(
  auftragId: string,
  plan: Zahlungsplan,
  opts?: { force?: boolean }
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!plan.zeilen.length) {
    return { ok: false, message: 'Mindestens eine Abschlagszeile erforderlich.' }
  }

  const supabase = createClient()
  const angRef = await angebotIdForAuftrag(supabase, auftragId)
  if (!angRef.ok) return angRef

  const { data: angRow, error: loadErr } = await supabase
    .from('angebote')
    .select('zahlungsplan')
    .eq('id', angRef.angebotId)
    .maybeSingle()

  if (loadErr) return { ok: false, message: loadErr.message }

  const bisher = parseZahlungsplan(angRow?.zahlungsplan) ?? emptyZahlungsplan()

  const { data: rechnungen } = await supabase
    .from('rechnungen')
    .select('id, status, zahlungsplan_abschlag_id, rechnung_art, abschlag_index, brutto, faellig_am')
    .eq('auftrag_id', auftragId)

  const links = (rechnungen ?? []).map((r) => ({
    id: r.id as string,
    status: r.status as string | null,
    zahlungsplan_abschlag_id: r.zahlungsplan_abschlag_id as string | null,
    rechnung_art: r.rechnung_art as string | null,
    abschlag_index: r.abschlag_index as number | null,
    brutto: r.brutto as number | null,
    faellig_am: r.faellig_am as string | null,
  }))

  let normalized: Zahlungsplan = {
    modus: 'abschlagsplan',
    zeilen: plan.zeilen.map((z) => ({
      ...z,
      titel: z.titel.trim() || 'Abschlag',
      position_ids: z.position_ids?.length ? [...z.position_ids] : [],
    })),
  }

  if (!opts?.force && bisher.zeilen.length) {
    const merged = zahlplanMergeMitEinfrieren(bisher, normalized, links)
    if (!merged.ok) return merged
    normalized = merged.plan
  }

  const { data: auftragPosRows } = await supabase
    .from('auftrag_positionen')
    .select('*')
    .eq('auftrag_id', auftragId)
    .order('sort_order', { ascending: true })

  let gesamtNetto = 0
  if (auftragPosRows?.length) {
    const asAngebot = auftragPositionenToAngebotPositionen(auftragPosRows as AuftragPosition[])
    gesamtNetto = auftragSummenAusPositionen(asAngebot).netto
  }

  const sumGate = validateZahlungsplanGegenGesamt(normalized, gesamtNetto)
  if (!sumGate.ok) return sumGate

  const { error } = await supabase
    .from('angebote')
    .update({ zahlungsplan: normalized, updated_at: new Date().toISOString() })
    .eq('id', angRef.angebotId)

  if (error) {
    if (error.message.includes('zahlungsplan')) {
      return {
        ok: false,
        message: 'Datenbank-Schema veraltet: Migration für Zahlungsplan ausführen.',
      }
    }
    return { ok: false, message: error.message }
  }

  revalidatePath(`/auftraege/${auftragId}`)
  revalidatePath(`/angebote/${angRef.angebotId}`)
  revalidatePath('/vorgaenge')
  return { ok: true }
}

/** Gesamten Abschlagsplan-Vorschlag am Angebot entfernen (nur wenn keine Rate gestellt/bezahlt). */
export async function clearAuftragZahlungsplan(
  auftragId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const angRef = await angebotIdForAuftrag(supabase, auftragId)
  if (!angRef.ok) return angRef

  const { data: angRow, error: loadErr } = await supabase
    .from('angebote')
    .select('zahlungsplan')
    .eq('id', angRef.angebotId)
    .maybeSingle()

  if (loadErr) return { ok: false, message: loadErr.message }

  const plan = parseZahlungsplan(angRow?.zahlungsplan)
  const { data: rechnungen } = await supabase
    .from('rechnungen')
    .select('id, status, zahlungsplan_abschlag_id, rechnung_art, abschlag_index, brutto, faellig_am')
    .eq('auftrag_id', auftragId)

  const links = (rechnungen ?? []).map((r) => ({
    id: r.id as string,
    status: r.status as string | null,
    zahlungsplan_abschlag_id: r.zahlungsplan_abschlag_id as string | null,
    rechnung_art: r.rechnung_art as string | null,
    abschlag_index: r.abschlag_index as number | null,
    brutto: r.brutto as number | null,
    faellig_am: r.faellig_am as string | null,
  }))

  const gate = zahlplanDarfGeloeschtWerden(plan, links)
  if (!gate.ok) return gate

  const { error } = await supabase
    .from('angebote')
    .update({
      zahlungsplan: emptyZahlungsplan(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', angRef.angebotId)

  if (error) return { ok: false, message: error.message }

  revalidatePath(`/auftraege/${auftragId}`)
  revalidatePath(`/angebote/${angRef.angebotId}`)
  revalidatePath('/vorgaenge')
  return { ok: true }
}

/** Liest den unverbindlichen Vorschlag vom verknüpften Angebot (nicht vom Auftrag). */
export async function loadAuftragZahlungsplan(auftragId: string): Promise<Zahlungsplan | null> {
  const supabase = createClient()
  const { data: auf } = await supabase
    .from('auftraege')
    .select('angebot_id')
    .eq('id', auftragId)
    .maybeSingle()
  const angebotId = auf?.angebot_id ? String(auf.angebot_id) : ''
  if (!angebotId) return null
  const { data } = await supabase
    .from('angebote')
    .select('zahlungsplan')
    .eq('id', angebotId)
    .maybeSingle()
  return parseZahlungsplan(data?.zahlungsplan)
}
