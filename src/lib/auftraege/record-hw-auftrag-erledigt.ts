import { supabaseAdmin } from '@/lib/supabase-admin'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'

/**
 * Partner meldet Auftrag erledigt (ohne Abnahme).
 *
 * Schreibt `auftrag_handwerker.erledigt_gemeldet_am` — die CRM-Glocke liest
 * Typ `hw_auftrag_erledigt` aus dieser Spalte (wie andere Partner-Notify-Quellen).
 *
 * Aufruf:
 * - Portal: `POST /api/internal/partner-auftrag-erledigt` (Bearer PARTNER_INTERNAL_API_SECRET)
 * - oder direkt nach Positions-Update auf erledigt (wie bisher Mail via sendPartnerInternalErledigtMail)
 */
export async function recordHwAuftragErledigtGemeldet(input: {
  auftragId: string
  handwerkerId: string
  erledigtAm?: string | null
  skipTimeline?: boolean
}): Promise<{ ok: true; erledigtAm: string } | { ok: false; message: string }> {
  const auftragId = input.auftragId.trim()
  const handwerkerId = input.handwerkerId.trim()
  if (!auftragId || !handwerkerId) {
    return { ok: false, message: 'auftragId und handwerkerId erforderlich' }
  }

  const erledigtAm = (input.erledigtAm?.trim() || new Date().toISOString()).slice(0, 30)

  const { data: row, error: findErr } = await supabaseAdmin
    .from('auftrag_handwerker')
    .select('id, erledigt_gemeldet_am')
    .eq('auftrag_id', auftragId)
    .eq('handwerker_id', handwerkerId)
    .neq('status', 'ersetzt')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (findErr) return { ok: false, message: findErr.message }
  if (!row?.id) {
    return { ok: false, message: 'Keine aktive Handwerker-Zuweisung gefunden' }
  }

  // Idempotent: bereits gemeldet → Timestamp behalten
  if (row.erledigt_gemeldet_am) {
    return { ok: true, erledigtAm: String(row.erledigt_gemeldet_am) }
  }

  const { error } = await supabaseAdmin
    .from('auftrag_handwerker')
    .update({ erledigt_gemeldet_am: erledigtAm })
    .eq('id', row.id)

  if (error) return { ok: false, message: error.message }

  if (!input.skipTimeline) {
    await insertAuftragTimelineEvent({
      auftrag_id: auftragId,
      typ: 'handwerker_update',
      titel: 'Auftrag erledigt gemeldet',
      beschreibung: 'Partner meldet Leistungen als erledigt (ohne Abnahme).',
      sichtbar_fuer_kunde: false,
      handwerker_id: handwerkerId,
    })
  }

  return { ok: true, erledigtAm }
}
