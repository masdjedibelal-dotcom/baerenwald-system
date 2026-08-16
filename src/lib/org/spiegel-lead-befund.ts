import { supabaseAdmin } from '@/lib/supabase-admin'

type BefundPunkt = {
  titel: string
  status: string | null
  notiz: string
  foto_refs: unknown
  sort_order: number
}

function parseFotoRefs(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    .map((u) => u.trim())
}

/**
 * Spiegelt abgeschlossenen HM-Befund als auftrag_bautagebuch_eintraege (eintrag_typ=befund).
 * Ein Eintrag pro Prüfpunkt (Titel, Notiz, Fotos) — ohne Ergebnis/Vorlage-Meta.
 */
export async function spiegelLeadBefundNachAuftrag(input: {
  leadId: string
  auftragId: string
}): Promise<{ ok: true; inserted: number } | { ok: false; message: string }> {
  const leadId = input.leadId.trim()
  const auftragId = input.auftragId.trim()
  if (!leadId || !auftragId) {
    return { ok: false, message: 'leadId/auftragId fehlen.' }
  }

  const { data: befund } = await supabaseAdmin
    .from('lead_befunde')
    .select('id, durchgefuehrt_am')
    .eq('lead_id', leadId)
    .maybeSingle()

  if (!befund?.id) {
    return { ok: true, inserted: 0 }
  }

  const { data: existing } = await supabaseAdmin
    .from('auftrag_bautagebuch_eintraege')
    .select('id')
    .eq('auftrag_id', auftragId)
    .eq('eintrag_typ', 'befund')
    .limit(1)
    .maybeSingle()

  if (existing?.id) {
    return { ok: true, inserted: 0 }
  }

  const { data: punkte } = await supabaseAdmin
    .from('lead_befund_punkte')
    .select('titel, status, notiz, foto_refs, sort_order')
    .eq('befund_id', befund.id)
    .order('sort_order', { ascending: true })

  const rows = (punkte ?? []) as BefundPunkt[]
  const auffaellig = rows.filter(
    (p) => String(p.status ?? '').toLowerCase() === 'auffaellig'
  )
  const withNotiz = rows.filter((p) => p.notiz?.trim())
  const relevant =
    auffaellig.length > 0
      ? auffaellig
      : withNotiz.length > 0
        ? withNotiz
        : rows.slice(0, 8)

  const datum =
    String(befund.durchgefuehrt_am ?? '').slice(0, 10) ||
    new Date().toISOString().slice(0, 10)

  const payload = relevant.map((p) => ({
    auftrag_id: auftragId,
    titel: String(p.titel ?? '').trim() || 'Prüfpunkt',
    beschreibung: String(p.notiz ?? '').trim() || null,
    datum,
    foto_urls: parseFotoRefs(p.foto_refs),
    fuer_kunde_freigegeben: false,
    eintrag_typ: 'befund' as const,
  }))

  if (!payload.length) {
    return { ok: true, inserted: 0 }
  }

  const { error } = await supabaseAdmin
    .from('auftrag_bautagebuch_eintraege')
    .insert(payload)

  if (error) return { ok: false, message: error.message }
  return { ok: true, inserted: payload.length }
}
