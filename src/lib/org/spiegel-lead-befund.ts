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
 * Auffällige Punkte + Notizen + Fotos — für Partner/CRM/Versicherungsakte.
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
    .select('id, durchgefuehrt_von, durchgefuehrt_am, ergebnis, vorlage_key')
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
    .ilike('titel', 'Hausmeister-Vorbefund%')
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
  const relevant = auffaellig.length > 0 ? auffaellig : rows.filter((p) => p.notiz?.trim())

  const lines: string[] = []
  const fotos: string[] = []
  for (const p of relevant.length ? relevant : rows.slice(0, 8)) {
    const st = String(p.status ?? '').trim() || 'offen'
    const notiz = String(p.notiz ?? '').trim()
    lines.push(`• ${p.titel} [${st}]${notiz ? ` — ${notiz}` : ''}`)
    for (const f of parseFotoRefs(p.foto_refs)) fotos.push(f)
  }

  const von = String(befund.durchgefuehrt_von ?? '').trim()
  const ergebnis = String(befund.ergebnis ?? '').trim()
  const headerBits = [
    von ? `Durchgeführt von: ${von}` : null,
    ergebnis ? `Ergebnis: ${ergebnis}` : null,
    befund.vorlage_key ? `Vorlage: ${befund.vorlage_key}` : null,
  ].filter(Boolean)

  const beschreibung = [...headerBits, '', ...lines].join('\n').trim() || null
  const datum =
    String(befund.durchgefuehrt_am ?? '').slice(0, 10) ||
    new Date().toISOString().slice(0, 10)

  const { error } = await supabaseAdmin.from('auftrag_bautagebuch_eintraege').insert({
    auftrag_id: auftragId,
    titel: 'Hausmeister-Vorbefund',
    beschreibung,
    datum,
    foto_urls: fotos,
    fuer_kunde_freigegeben: false,
    eintrag_typ: 'befund',
  })

  if (error) return { ok: false, message: error.message }
  return { ok: true, inserted: 1 }
}
