/**
 * Partner-Aufgabe: Gruppierung für die Partneransicht.
 * Keine Arbeitseinheit — Zeiterfassung/Regie/Abrechnung bleiben je Position.
 */
import { logDbError } from '@/lib/errors/log-db-error'
import { COPY_ERROR } from '@/lib/copy/errors'
import type { SupabaseClient } from '@supabase/supabase-js'

function emptyToNull(raw: string | null | undefined): string | null {
  const t = (raw ?? '').trim()
  return t ? t : null
}

export type CreatePartnerAufgabeInput = {
  auftragId: string
  handwerkerId: string
  positionIds: string[]
  /** Leer/null = Partner sieht LV-Texte der Positionen. */
  titel?: string | null
  beschreibung?: string | null
}

/**
 * Legt eine Partner-Aufgabe an und setzt `partner_aufgabe_id` auf den Positionen.
 * Schreibt niemals `leistung_name` / Positions-`beschreibung`.
 */
export async function createPartnerAufgabeAndLinkPositions(
  supabase: SupabaseClient,
  input: CreatePartnerAufgabeInput
): Promise<{ ok: true; aufgabeId: string } | { ok: false; message: string }> {
  const auftragId = input.auftragId.trim()
  const handwerkerId = input.handwerkerId.trim()
  const ids = Array.from(new Set(input.positionIds.map((id) => id.trim()).filter(Boolean)))
  if (!auftragId || !handwerkerId || !ids.length) {
    return { ok: false, message: COPY_ERROR.validation }
  }

  const { data: aufgabe, error: insErr } = await supabase
    .from('auftrag_partner_aufgaben')
    .insert({
      auftrag_id: auftragId,
      handwerker_id: handwerkerId,
      titel: emptyToNull(input.titel),
      beschreibung: emptyToNull(input.beschreibung),
    })
    .select('id')
    .single()

  if (insErr || !aufgabe?.id) {
    logDbError('lib/auftraege/partner-aufgabe-write:insert', insErr)
    return { ok: false, message: COPY_ERROR.saveFailed }
  }

  const aufgabeId = String(aufgabe.id)
  const { error: linkErr } = await supabase
    .from('auftrag_positionen')
    .update({ partner_aufgabe_id: aufgabeId })
    .eq('auftrag_id', auftragId)
    .in('id', ids)

  if (linkErr) {
    logDbError('lib/auftraege/partner-aufgabe-write:link', linkErr)
    return { ok: false, message: COPY_ERROR.saveFailed }
  }

  return { ok: true, aufgabeId }
}
