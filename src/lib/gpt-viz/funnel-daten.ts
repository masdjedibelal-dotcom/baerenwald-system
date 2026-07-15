import { parseLeadFunnelDaten } from '@/lib/lead-funnel-daten'
import type {
  GptProjektStudioFunnelDaten,
  GptVizBauErklaerung,
  GptVizChatMessage,
  GptVizRenderVersion,
} from '@/lib/gpt-viz/types'

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  return v as Record<string, unknown>
}

function parseErklaerung(raw: unknown): GptVizBauErklaerung | null {
  const o = asRecord(raw)
  if (!o) return null
  const gewerke = Array.isArray(o.gewerke) ? o.gewerke : []
  return {
    titel: String(o.titel ?? ''),
    chat_kurz: String(o.chat_kurz ?? ''),
    zielbild_kicker: o.zielbild_kicker ? String(o.zielbild_kicker) : undefined,
    zielbild_headline: String(o.zielbild_headline ?? o.titel ?? ''),
    zielbild_teaser: o.zielbild_teaser ? String(o.zielbild_teaser) : undefined,
    zusammenfassung: String(o.zusammenfassung ?? ''),
    gewerke: gewerke.map((g) => {
      const item = g as Record<string, unknown>
      return { name: String(item.name ?? ''), beschreibung: String(item.beschreibung ?? '') }
    }),
    ablauf: Array.isArray(o.ablauf) ? o.ablauf.map(String) : [],
    naechste_schritte: Array.isArray(o.naechste_schritte) ? o.naechste_schritte.map(String) : [],
    hinweis_gu: o.hinweis_gu ? String(o.hinweis_gu) : undefined,
    cta_text: String(o.cta_text ?? 'Anfragen'),
    preis_hinweis_optional: o.preis_hinweis_optional ? String(o.preis_hinweis_optional) : undefined,
  }
}

function parseHistorie(raw: unknown): GptVizRenderVersion[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((v) => {
      const o = asRecord(v)
      if (!o || typeof o.url !== 'string') return null
      return {
        url: o.url,
        wunsch_text: String(o.wunsch_text ?? ''),
        created_at: String(o.created_at ?? ''),
      }
    })
    .filter((v): v is GptVizRenderVersion => v !== null)
}

function parseChat(raw: unknown): GptVizChatMessage[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((v) => {
      const o = asRecord(v)
      if (!o || (o.role !== 'user' && o.role !== 'assistant')) return null
      return { role: o.role, content: String(o.content ?? '') }
    })
    .filter((v): v is GptVizChatMessage => v !== null)
}

export function isGptProjektStudio(raw: unknown): boolean {
  const fd = parseLeadFunnelDaten(raw)
  return fd.projekt_studio === true
}

export function parseGptProjektStudioFunnel(
  raw: unknown
): GptProjektStudioFunnelDaten | null {
  const fd = parseLeadFunnelDaten(raw)
  if (fd.projekt_studio !== true) return null

  const sessionId = String(fd.gpt_session_id ?? '').trim()
  if (!sessionId) return null

  const ist = Array.isArray(fd.ist_bilder_urls)
    ? fd.ist_bilder_urls.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    : []

  return {
    projekt_studio: true,
    gpt_session_id: sessionId,
    raum_analyse: (fd.raum_analyse as GptProjektStudioFunnelDaten['raum_analyse']) ?? null,
    inspiration_analyse:
      (fd.inspiration_analyse as GptProjektStudioFunnelDaten['inspiration_analyse']) ?? null,
    viz_brief: (fd.viz_brief as GptProjektStudioFunnelDaten['viz_brief']) ?? null,
    wunsch_text: fd.wunsch_text ? String(fd.wunsch_text) : null,
    render_prompt: fd.render_prompt ? String(fd.render_prompt) : null,
    ist_bilder_urls: ist,
    ziel_bild_url: fd.ziel_bild_url ? String(fd.ziel_bild_url) : null,
    ergebnis_bild_url: fd.ergebnis_bild_url ? String(fd.ergebnis_bild_url) : null,
    zielbild_url: fd.zielbild_url ? String(fd.zielbild_url) : null,
    ergebnis_historie: parseHistorie(fd.ergebnis_historie),
    gpt_erklaerung: parseErklaerung(fd.gpt_erklaerung),
    ki_chat_verlauf: parseChat(fd.ki_chat_verlauf),
    render_count: typeof fd.render_count === 'number' ? fd.render_count : undefined,
    funnel_quelle: fd.funnel_quelle as GptProjektStudioFunnelDaten['funnel_quelle'],
  }
}

export function gptHeroBildUrl(studio: GptProjektStudioFunnelDaten): string | null {
  return studio.zielbild_url?.trim() || studio.ergebnis_bild_url?.trim() || null
}

export function gptGalerieUrls(studio: GptProjektStudioFunnelDaten): string[] {
  const urls = new Set<string>()
  for (const u of studio.ist_bilder_urls ?? []) urls.add(u)
  for (const v of studio.ergebnis_historie ?? []) {
    if (v.url?.trim()) urls.add(v.url.trim())
  }
  const ergebnis = studio.ergebnis_bild_url?.trim()
  if (ergebnis) urls.add(ergebnis)
  const ziel = studio.zielbild_url?.trim()
  if (ziel) urls.add(ziel)
  return Array.from(urls)
}
