import 'server-only'

import { parseGptProjektStudioFunnel } from '@/lib/gpt-viz/funnel-daten'
import { BEREICH_LABELS, KANAL_LABELS, STATUS_LABELS } from '@/lib/utils'
import type { LeadKanal, LeadStatus } from '@/lib/types'

export type KiAnfragenLogRow = {
  id: string
  session_id: string | null
  anfrage_text: string | null
  claude_antwort: string | null
  typ: string | null
  extrahiertes_json: Record<string, unknown> | null
  lead_erstellt: boolean | null
  created_at: string
}

export type LeadVertriebsKontext = {
  lead: {
    id: string
    status: string
    kanal: string
    kontakt_name: string | null
    bereiche: string[] | null
    plz: string | null
    budget_ca: number | null
    preis_min: number | null
    preis_max: number | null
    zeitraum: string | null
    zeitraum_von: string | null
    zeitraum_bis: string | null
    situation: string | null
    kontakt_nachricht: string | null
  }
  quelle: 'gpt_studio' | 'ki_rechner' | 'gemischt'
  funnel_quelle?: string | null
  wunsch_text?: string | null
  render_count?: number | null
  chat: Array<{ role: 'user' | 'assistant'; content: string }>
  raum_analyse?: string | null
  viz_brief?: string | null
  vertriebs_kontext?: Record<string, unknown> | null
  gpt_erklaerung?: Record<string, unknown> | null
  ki_logs: KiAnfragenLogRow[]
  verhalten: {
    chat_nachrichten_kunde: number
    chat_nachrichten_ki: number
    ki_log_eintraege: number
    render_count: number
    hat_fotos: boolean
  }
}

function bereicheLabel(raw: string[] | null | undefined): string {
  if (!raw?.length) return '—'
  return raw.map((b) => BEREICH_LABELS[b] ?? b).join(', ')
}

function formatLeadRow(row: Record<string, unknown>): LeadVertriebsKontext['lead'] {
  return {
    id: String(row.id),
    status: STATUS_LABELS[row.status as LeadStatus] ?? String(row.status ?? '—'),
    kanal: KANAL_LABELS[row.kanal as LeadKanal] ?? String(row.kanal ?? '—'),
    kontakt_name: (row.kontakt_name as string | null) ?? null,
    bereiche: (row.bereiche as string[] | null) ?? null,
    plz: (row.plz as string | null) ?? null,
    budget_ca: (row.budget_ca as number | null) ?? null,
    preis_min: (row.preis_min as number | null) ?? null,
    preis_max: (row.preis_max as number | null) ?? null,
    zeitraum: (row.zeitraum as string | null) ?? null,
    zeitraum_von: (row.zeitraum_von as string | null) ?? null,
    zeitraum_bis: (row.zeitraum_bis as string | null) ?? null,
    situation: (row.situation as string | null) ?? null,
    kontakt_nachricht: (row.kontakt_nachricht as string | null) ?? null,
  }
}

export function buildLeadVertriebsKontext(
  row: Record<string, unknown>,
  kiLogs: KiAnfragenLogRow[]
): LeadVertriebsKontext | null {
  const studio = parseGptProjektStudioFunnel(row.funnel_daten)
  const kiSessionId = String(row.ki_session_id ?? '').trim()
  const hatGpt = Boolean(studio)
  const hatRechner = kiLogs.length > 0 || Boolean(kiSessionId)

  if (!hatGpt && !hatRechner) return null

  const chat = studio?.ki_chat_verlauf ?? []
  const chatKunde = chat.filter((m) => m.role === 'user').length
  const chatKi = chat.filter((m) => m.role === 'assistant').length
  const istBilder = studio?.ist_bilder_urls?.length ?? 0

  const raum = studio?.raum_analyse
  const raumText = raum
    ? `${raum.raum_label}: ${raum.ist_beschreibung}${raum.einschaetzung ? ` — ${raum.einschaetzung}` : ''}`
    : null

  const brief = studio?.viz_brief
  const briefText = brief
    ? `Modus: ${brief.modus}, Struktur fix: ${brief.struktur_lock ? 'ja' : 'nein'}, Änderungen: ${(brief.aenderungen ?? []).join('; ') || '—'}`
    : null

  return {
    lead: formatLeadRow(row),
    quelle: hatGpt && hatRechner ? 'gemischt' : hatGpt ? 'gpt_studio' : 'ki_rechner',
    funnel_quelle: studio?.funnel_quelle ?? null,
    wunsch_text: studio?.wunsch_text ?? null,
    render_count: studio?.render_count ?? null,
    chat,
    raum_analyse: raumText,
    viz_brief: briefText,
    vertriebs_kontext: (row.funnel_daten as Record<string, unknown> | null)?.vertriebs_kontext as
      | Record<string, unknown>
      | null,
    gpt_erklaerung: (studio?.gpt_erklaerung as Record<string, unknown> | undefined) ?? null,
    ki_logs: kiLogs,
    verhalten: {
      chat_nachrichten_kunde: chatKunde,
      chat_nachrichten_ki: chatKi,
      ki_log_eintraege: kiLogs.length,
      render_count: studio?.render_count ?? 0,
      hat_fotos: istBilder > 0,
    },
  }
}

export function leadVertriebsKontextAlsPrompt(kontext: LeadVertriebsKontext): string {
  const l = kontext.lead
  const preis =
    l.preis_min != null && l.preis_max != null
      ? l.preis_min === l.preis_max
        ? `${l.preis_min} €`
        : `${l.preis_min}–${l.preis_max} €`
      : l.budget_ca != null
        ? `ca. ${l.budget_ca} €`
        : '—'

  const chatAuszug = kontext.chat
    .slice(-24)
    .map((m) => `${m.role === 'user' ? 'KUNDE' : 'KI'}: ${m.content.trim().slice(0, 800)}`)
    .join('\n\n')

  const logAuszug = kontext.ki_logs
    .slice(-20)
    .map((log, i) => {
      const extr = log.extrahiertes_json
        ? JSON.stringify(log.extrahiertes_json).slice(0, 400)
        : '—'
      return `#${i + 1} typ=${log.typ ?? '—'} | Eingabe: ${(log.anfrage_text ?? '—').slice(0, 200)} | Extrahiert: ${extr}`
    })
    .join('\n')

  return [
    '=== CRM LEAD ===',
    `Name: ${l.kontakt_name ?? '—'}`,
    `Status: ${l.status}`,
    `Kanal: ${l.kanal}`,
    `Bereiche: ${bereicheLabel(l.bereiche)}`,
    `PLZ: ${l.plz ?? '—'}`,
    `Preisrahmen: ${preis}`,
    `Zeitraum: ${l.zeitraum ?? '—'} ${l.zeitraum_von ?? ''} ${l.zeitraum_bis ?? ''}`.trim(),
    `Situation: ${l.situation ?? '—'}`,
    `Nachricht: ${l.kontakt_nachricht?.trim() || '—'}`,
    '',
    '=== WEBSITE-VERHALTEN ===',
    `Quelle: ${kontext.quelle}${kontext.funnel_quelle ? ` (${kontext.funnel_quelle})` : ''}`,
    `Chat Kunde/KI: ${kontext.verhalten.chat_nachrichten_kunde}/${kontext.verhalten.chat_nachrichten_ki}`,
    `KI-Renders: ${kontext.verhalten.render_count}`,
    `Fotos hochgeladen: ${kontext.verhalten.hat_fotos ? 'ja' : 'nein'}`,
    `Rechner-Log-Einträge: ${kontext.verhalten.ki_log_eintraege}`,
    kontext.wunsch_text ? `Wunschtext: ${kontext.wunsch_text}` : '',
    kontext.raum_analyse ? `Raumanalyse: ${kontext.raum_analyse}` : '',
    kontext.viz_brief ? `Visualisierungs-Brief: ${kontext.viz_brief}` : '',
    kontext.vertriebs_kontext
      ? `Vertriebs-Kontext (Website): ${JSON.stringify(kontext.vertriebs_kontext).slice(0, 600)}`
      : '',
    kontext.gpt_erklaerung
      ? `Bestehende GPT-Erklärung: ${JSON.stringify(kontext.gpt_erklaerung).slice(0, 800)}`
      : '',
    '',
    chatAuszug ? `=== CHAT (Auszug) ===\n${chatAuszug}` : '',
    logAuszug ? `\n=== RECHNER-LOG (Klicks/Antworten) ===\n${logAuszug}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
