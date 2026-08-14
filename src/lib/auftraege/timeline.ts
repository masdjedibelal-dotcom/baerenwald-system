import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'

/** Werte für `auftrag_timeline.typ` */
export type AuftragTimelineTyp =
  | 'auftrag_erstellt'
  | 'arbeit_gestartet'
  | 'zur_abnahme'
  | 'abnahme_abgeschlossen'
  | 'formular_link_gesendet'
  | 'mail_kunde'
  | 'mail_handwerker'
  | 'handwerker_update'
  | 'notiz_intern'
  | 'nachtrag_entwurf'
  | 'nachtrag_gesendet'
  | 'nachtrag_akzeptiert'
  | 'nachtrag_abgelehnt'
  | 'mangel_behoben'
  | 'mangel_neu'
  | 'abnahme'
  | 'enddatum_geaendert'
  | 'vor_baubeginn_protokoll'
  | 'baustopp'
  | 'baustopp_beendet'
  | 'abnahmeprotokoll_erstellt'
  | 'abschlussdoku_versendet'
  | 'rechnung_gesendet'
  | 'rechnung_bezahlt'
  | 'bautagebuch'

export async function insertAuftragTimelineEvent(input: {
  auftrag_id: string
  typ: AuftragTimelineTyp | string
  titel: string
  beschreibung?: string | null
  foto_urls?: string[] | null
  erstellt_von?: string | null
  handwerker_id?: string | null
  sichtbar_fuer_kunde?: boolean
  fuer_kunde_freigegeben?: boolean
  freigegeben_at?: string | null
  /** Verknüpfung zu email_log → Mail-Vorschau in Aktivität */
  email_log_id?: string | null
}): Promise<{ ok: true; id?: string } | { ok: false; message: string }> {
  const fuerKunde = input.fuer_kunde_freigegeben ?? false
  const freiAt = fuerKunde ? (input.freigegeben_at ?? new Date().toISOString()) : null
  const base = {
    auftrag_id: input.auftrag_id,
    typ: input.typ,
    titel: input.titel,
    beschreibung: input.beschreibung?.trim() || null,
    foto_urls: input.foto_urls?.filter(Boolean) ?? [],
    erstellt_von: input.erstellt_von ?? null,
    handwerker_id: input.handwerker_id ?? null,
    sichtbar_fuer_kunde: input.sichtbar_fuer_kunde ?? false,
    fuer_kunde_freigegeben: fuerKunde,
    freigegeben_at: freiAt,
  }
  const emailLogId = input.email_log_id?.trim() || null
  const row = emailLogId ? { ...base, email_log_id: emailLogId } : base
  const { data, error } = await supabaseAdmin
    .from('auftrag_timeline')
    .insert(row as typeof base & { email_log_id?: string })
    .select('id')
    .single()
  if (error) {
    if (emailLogId && /email_log_id/i.test(error.message)) {
      const retry = await supabaseAdmin.from('auftrag_timeline').insert(base).select('id').single()
      if (retry.error) return { ok: false, message: retry.error.message }
      return { ok: true, id: (retry.data as { id: string }).id }
    }
    return { ok: false, message: error.message }
  }
  return { ok: true, id: (data as { id: string }).id }
}
