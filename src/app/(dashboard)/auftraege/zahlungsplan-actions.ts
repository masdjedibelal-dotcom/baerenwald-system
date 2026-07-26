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

export async function saveAuftragZahlungsplan(
  auftragId: string,
  plan: Zahlungsplan,
  opts?: { force?: boolean }
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!plan.zeilen.length) {
    return { ok: false, message: 'Mindestens eine Abschlagszeile erforderlich.' }
  }

  const supabase = createClient()

  const { data: auftragRow, error: loadErr } = await supabase
    .from('auftraege')
    .select('zahlungsplan')
    .eq('id', auftragId)
    .maybeSingle()

  if (loadErr) return { ok: false, message: loadErr.message }

  const bisher = parseZahlungsplan(auftragRow?.zahlungsplan) ?? emptyZahlungsplan()

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

  // %-Überziehung auch ohne geladene Summe abfangen; Betrags-Überziehung braucht VK
  const sumGate = validateZahlungsplanGegenGesamt(normalized, gesamtNetto)
  if (!sumGate.ok) return sumGate

  const { error } = await supabase
    .from('auftraege')
    .update({ zahlungsplan: normalized, updated_at: new Date().toISOString() })
    .eq('id', auftragId)

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
  revalidatePath('/vorgaenge')
  return { ok: true }
}

/** Gesamten Abschlagsplan entfernen (nur wenn keine Rate gestellt/bezahlt). */
export async function clearAuftragZahlungsplan(
  auftragId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()

  const { data: auftragRow, error: loadErr } = await supabase
    .from('auftraege')
    .select('zahlungsplan')
    .eq('id', auftragId)
    .maybeSingle()

  if (loadErr) return { ok: false, message: loadErr.message }

  const plan = parseZahlungsplan(auftragRow?.zahlungsplan)
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
    .from('auftraege')
    .update({
      zahlungsplan: emptyZahlungsplan(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', auftragId)

  if (error) return { ok: false, message: error.message }

  revalidatePath(`/auftraege/${auftragId}`)
  revalidatePath('/vorgaenge')
  return { ok: true }
}

export async function loadAuftragZahlungsplan(auftragId: string): Promise<Zahlungsplan | null> {
  const supabase = createClient()
  const { data } = await supabase.from('auftraege').select('zahlungsplan').eq('id', auftragId).maybeSingle()
  return parseZahlungsplan(data?.zahlungsplan)
}
