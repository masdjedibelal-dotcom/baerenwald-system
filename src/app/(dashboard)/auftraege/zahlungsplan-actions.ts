'use server'

import { revalidateAngebotDetail,revalidateAuftragDetail,revalidateRechnungList } from '@/lib/crm-revalidate'
import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'
import {
  emptyZahlungsplan,
  parseZahlungsplan,
  auftragSummenAusPositionen,
  validateZahlungsplanGegenGesamt,normalizeAbschlagsplanSchluss,
  type Zahlungsplan
} from '@/lib/rechnungen/zahlungsplan'
import { auftragPositionenToAngebotPositionen } from '@/lib/auftraege/auftrag-positionen-rechnung'
import type { AuftragPosition } from '@/lib/types'
import {
  zahlplanMergeMitEinfrieren
} from '@/lib/rechnungen/zahlplan-gates'
import {
  ensureAbschlagEntwuerfeForAuftrag,storniereVerwaisteVollEntwuerfe
} from '@/lib/rechnungen/ensure-abschlag-entwuerfe'

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
  if (error) logDbError('app/auftraege/zahlungsplan-actions:auftraege', error)
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
): Promise<
  | {
      ok: true
      erstellt: number
      aktualisiert: number
      storniertOrphan: number
      gestellteUnveraendert: number
    }
  | { ok: false; message: string }
> {
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
  if (loadErr) logDbError('app/auftraege/zahlungsplan-actions:angebote', loadErr)

  if (loadErr) return { ok: false, message: loadErr.message }

  const bisher = parseZahlungsplan(angRow?.zahlungsplan) ?? emptyZahlungsplan()

  const { data: rechnungen, error: error2 } = await supabase
    .from('rechnungen')
    .select('id, status, zahlungsplan_abschlag_id, rechnung_art, abschlag_index, brutto, faellig_am')
    .eq('auftrag_id', auftragId)
  if (error2) logDbError('app/auftraege/zahlungsplan-actions:rechnungen', error2)

  const links = (rechnungen ?? []).map((r) => ({
    id: r.id as string,
    status: r.status as string | null,
    zahlungsplan_abschlag_id: r.zahlungsplan_abschlag_id as string | null,
    rechnung_art: r.rechnung_art as string | null,
    abschlag_index: r.abschlag_index as number | null,
    brutto: r.brutto as number | null,
    faellig_am: r.faellig_am as string | null,
  }))

  let normalized: Zahlungsplan = normalizeAbschlagsplanSchluss({
    modus: 'abschlagsplan',
    zeilen: plan.zeilen.map((z) => ({
      ...z,
      titel: z.titel.trim() || 'Abschlag',
      position_ids: z.position_ids?.length ? [...z.position_ids] : [],
    })),
  })

  if (!opts?.force && bisher.zeilen.length) {
    const merged = zahlplanMergeMitEinfrieren(bisher, normalized, links)
    if (!merged.ok) return merged
    normalized = normalizeAbschlagsplanSchluss(merged.plan)
  }

  const { data: auftragPosRows, error: error3 } = await supabase
    .from('auftrag_positionen')
    .select('*')
    .eq('auftrag_id', auftragId)
    .order('sort_order', { ascending: true })
  if (error3) logDbError('app/auftraege/zahlungsplan-actions:auftrag_positionen', error3)

  let gesamtNetto = 0
  if (auftragPosRows?.length) {
    const asAngebot = auftragPositionenToAngebotPositionen(auftragPosRows as AuftragPosition[])
    gesamtNetto = auftragSummenAusPositionen(asAngebot).netto
  }

  const sumGate = validateZahlungsplanGegenGesamt(normalized, gesamtNetto)
  if (!sumGate.ok) return sumGate

  const { error: error4 } = await supabase
    .from('angebote')
    .update({ zahlungsplan: normalized, updated_at: new Date().toISOString() })
    .eq('id', angRef.angebotId)
  if (error4) logDbError('app/auftraege/zahlungsplan-actions:angebote', error4)

  if (error4) {
    if (error4.message.includes('zahlungsplan')) {
      return {
        ok: false,
        message: 'Datenbank-Schema veraltet: Migration für Zahlungsplan ausführen.',
      }
    }
    return { ok: false, message: error4.message }
  }

  // Verwaiste Voll-Entwürfe (z. B. nach Auftrag→Rechnung ohne Plan) bereinigen
  const stornoVoll = await storniereVerwaisteVollEntwuerfe(auftragId)
  if (!stornoVoll.ok) return stornoVoll

  // Alle Abschläge sofort als Entwürfe — Versand einzeln
  const entwuerfe = await ensureAbschlagEntwuerfeForAuftrag(auftragId, normalized)
  if (!entwuerfe.ok) return entwuerfe

  revalidateAuftragDetail(auftragId)
  revalidateAngebotDetail(angRef.angebotId)
  revalidateRechnungList()
  return {
    ok: true,
    erstellt: entwuerfe.erstellt,
    aktualisiert: entwuerfe.aktualisiert,
    storniertOrphan: entwuerfe.storniertOrphan,
    gestellteUnveraendert: entwuerfe.gestellteUnveraendert,
  }
}
