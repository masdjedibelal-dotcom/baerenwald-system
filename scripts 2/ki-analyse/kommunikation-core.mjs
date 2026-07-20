import { upsertKiAnalyse } from './upsert.mjs'
import { inc, topN } from './funnel-parse.mjs'
import { median } from './lib.mjs'

export const KOMMUNIKATION_KEY = 'nachrichten'
export const KOMMUNIKATION_BEREICH = 'kommunikation'

const KONTEXT_LABELS = {
  anfrage: 'Anfrage',
  angebot: 'Angebot',
  auftrag: 'Auftrag',
  rechnung: 'Rechnung',
  kunde: 'Kunde',
}

const EMAIL_TYP_LABELS = {
  anfrage_bestaetigung: 'Anfrage-Bestätigung',
  angebot: 'Angebot',
  angebot_nachfass: 'Angebot-Erinnerung',
  auftragsbestaetigung: 'Auftragsbestätigung',
  update_hinweis: 'Update',
  projekt_update: 'Bautagebuch / Update',
  rechnung: 'Rechnung',
  zahlungsbestaetigung: 'Zahlungsbestätigung',
  zahlungserinnerung: 'Zahlungserinnerung',
  bautagebuch: 'Bautagebuch',
  nachtrag: 'Nachtrag',
  abnahmeprotokoll: 'Abnahme',
  abschlussdokumentation: 'Abschluss',
  besichtigung_termin: 'Besichtigungstermin',
}

function emailTypLabel(typ, kontextTyp) {
  const t = String(typ ?? '').trim()
  if (!t) return 'Unbekannt'
  if (t.startsWith('antwort_')) {
    const k = t.replace('antwort_', '')
    return `Antwort (${KONTEXT_LABELS[k] ?? kontextTyp ?? 'E-Mail'})`
  }
  if (t === 'antwort') return 'Antwort (E-Mail)'
  if (t.startsWith('freitext_')) {
    const k = t.replace('freitext_', '')
    return `E-Mail (${KONTEXT_LABELS[k] ?? kontextTyp ?? 'Freitext'})`
  }
  return EMAIL_TYP_LABELS[t] ?? t
}

function timelineTypLabel(typ) {
  const map = {
    anfrage: 'Anfrage',
    angebot: 'Angebot',
    status: 'Status',
    notiz: 'Notiz',
    mail_kunde: 'Mail (Timeline)',
    mail: 'E-Mail',
    besichtigung: 'Besichtigung',
    system: 'System',
  }
  return map[String(typ ?? '').trim()] ?? String(typ ?? 'Sonstiges')
}

/** @param {import('@supabase/supabase-js').SupabaseClient} supabase */
export async function computeAndSaveKommunikation(supabase) {
  const [{ data: emails }, { data: timeline }, { count: leadCount }] = await Promise.all([
    supabase
      .from('email_log')
      .select('id, typ, kontext_typ, richtung, lead_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5000),
    supabase
      .from('lead_timeline')
      .select('id, typ, lead_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5000),
    supabase.from('leads').select('id', { count: 'exact', head: true }).not('status', 'eq', 'abgebrochen'),
  ])

  const emailRows = emails ?? []
  const timelineRows = timeline ?? []
  const totalEvents = emailRows.length + timelineRows.length

  if (!totalEvents) {
    return upsertKiAnalyse(supabase, {
      bereich: KOMMUNIKATION_BEREICH,
      analyse_key: KOMMUNIKATION_KEY,
      titel: 'Kommunikation & Nachrichten',
      sample_size: 0,
      ergebnis: {
        hinweis: 'Noch keine E-Mails oder Timeline-Einträge — Versand und Anfragen-Log füllen diese Auswertung.',
        zusammenfassung: {
          emails_gesamt: 0,
          timeline_gesamt: 0,
          leads_mit_kommunikation: 0,
          events_pro_lead_median: null,
        },
        email_nach_typ: [],
        email_nach_kontext: [],
        email_nach_richtung: [],
        timeline_nach_typ: [],
      },
    })
  }

  const typMap = new Map()
  const kontextMap = new Map()
  const richtungMap = new Map()
  const timelineMap = new Map()
  const eventsPerLead = new Map()

  function bumpLead(leadId) {
    if (!leadId) return
    eventsPerLead.set(leadId, (eventsPerLead.get(leadId) ?? 0) + 1)
  }

  for (const row of emailRows) {
    const label = emailTypLabel(row.typ, row.kontext_typ)
    inc(typMap, label)
    inc(kontextMap, KONTEXT_LABELS[row.kontext_typ] ?? row.kontext_typ ?? 'ohne Kontext')
    inc(richtungMap, row.richtung === 'empfangen' ? 'Empfangen' : 'Gesendet')
    bumpLead(row.lead_id)
  }

  for (const row of timelineRows) {
    inc(timelineMap, timelineTypLabel(row.typ))
    bumpLead(row.lead_id)
  }

  const perLeadCounts = [...eventsPerLead.values()]
  const eventsMedian = perLeadCounts.length ? Math.round(median(perLeadCounts)) : null

  const ergebnis = {
    hinweis: `${emailRows.length} E-Mails · ${timelineRows.length} Timeline-Einträge · ${eventsPerLead.size} Anfragen mit Aktivität.`,
    zusammenfassung: {
      emails_gesamt: emailRows.length,
      timeline_gesamt: timelineRows.length,
      leads_mit_kommunikation: eventsPerLead.size,
      leads_gesamt: leadCount ?? null,
      events_pro_lead_median: eventsMedian,
    },
    email_nach_typ: topN(typMap, 12),
    email_nach_kontext: topN(kontextMap, 8),
    email_nach_richtung: topN(richtungMap, 4),
    timeline_nach_typ: topN(timelineMap, 10),
  }

  return upsertKiAnalyse(supabase, {
    bereich: KOMMUNIKATION_BEREICH,
    analyse_key: KOMMUNIKATION_KEY,
    titel: 'Kommunikation & Nachrichten',
    sample_size: totalEvents,
    ergebnis,
  })
}
