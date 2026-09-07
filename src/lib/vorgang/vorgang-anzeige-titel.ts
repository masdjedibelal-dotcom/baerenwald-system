import { parseWizardMetaFromNotizen } from '@/lib/templates/angebot-mail'
import { BEREICH_LABELS, SITUATION_LABELS } from '@/lib/utils'

export type VorgangAnzeigeTitelAngebot = {
  leistungsumfang?: string | null
  notizen?: string | null
  /** Spalte `angebote.titel` — oft sprechender als Leistungsumfang-Platzhalter */
  titel?: string | null
}

/**
 * Platzhalter / PosBoard-Defaults / Slugs — kein sprechender Vorgangs-Titel.
 * (z. B. „Leistungen“, „Auftrag“, „Direktauftrag — sanitär“)
 */
export function isPlaceholderVorgangTitel(
  t: string | null | undefined
): boolean {
  const raw = t?.trim() ?? ''
  if (!raw) return true
  const n = raw.toLowerCase()
  if (
    n === 'leistungen' ||
    n === 'leistung' ||
    n === 'auftrag' ||
    n === 'projekt' ||
    n === 'vorgang' ||
    n === 'meldung' ||
    n === 'angebot' ||
    n === 'direktauftrag' ||
    n === 'notfall' ||
    n === 'einsatz'
  ) {
    return true
  }
  if (/^angebot(\s+[a-z0-9][\w./-]{0,48})?$/i.test(raw)) return true
  if (/^[a-z][a-z0-9_]{1,40}$/.test(raw)) return true
  if (/^direktauftrag\s*[—\-|:·]\s*[a-z0-9_]+$/i.test(raw)) return true
  return false
}

/** Erster brauchbarer Titel aus Angebot (Leistungsumfang / Wizard / Spalte). */
function angebotSprechenderTitel(
  angebot?: VorgangAnzeigeTitelAngebot | null
): string | null {
  if (!angebot) return null
  const wm = parseWizardMetaFromNotizen(angebot.notizen)
  const candidates = [
    angebot.leistungsumfang,
    wm?.leistungsumfang,
    angebot.titel,
  ]
  for (const c of candidates) {
    const t = c?.trim() || ''
    if (t && !isPlaceholderVorgangTitel(t)) return t
  }
  return null
}

/** Situation + Bereich (Labels), z. B. „Zuhause erneuern · Bad“. */
export function situationBereichTitel(
  situation?: string | null,
  bereiche?: string[] | null
): string | null {
  const sit = situation?.trim()
  const sitLabel = sit ? (SITUATION_LABELS[sit] ?? sit) : ''
  const bereichLabel = (bereiche ?? [])
    .map((b) => (b?.trim() ? (BEREICH_LABELS[b] ?? b) : ''))
    .filter(Boolean)
    .join(', ')
  const parts = [sitLabel, bereichLabel].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

/** Titel aus Angebot (Leistungsumfang / Wizard / Titel-Spalte), sonst Situation · Bereich. */
export function angebotTitelOderSituationBereich(opts: {
  angebot?: VorgangAnzeigeTitelAngebot | null
  situation?: string | null
  bereiche?: string[] | null
  fallback?: string | null
}): string {
  const angebotTitel = angebotSprechenderTitel(opts.angebot)
  if (angebotTitel) return angebotTitel

  const fromLead = situationBereichTitel(opts.situation, opts.bereiche)
  if (fromLead) return fromLead

  const fb = opts.fallback?.trim() || ''
  if (fb && !isPlaceholderVorgangTitel(fb)) return fb
  return 'Vorgang'
}

/**
 * Akte-Accordion: Anfrage-Titel als Basis; sobald vorhanden Angebot → Auftrag → Rechnung.
 * Platzhalter wie „Leistungen“ zählen nicht als Auftragstitel.
 * Nie Kundenname als Titel.
 */
export function resolveAkteVorgangTitel(opts: {
  angebot?: VorgangAnzeigeTitelAngebot | null
  auftragTitel?: string | null
  rechnungTitel?: string | null
  situation?: string | null
  bereiche?: string[] | null
  fallback?: string | null
}): string {
  const angebotTitel = angebotSprechenderTitel(opts.angebot)
  if (angebotTitel) return angebotTitel

  const auftragTitel = opts.auftragTitel?.trim() || ''
  if (auftragTitel && !isPlaceholderVorgangTitel(auftragTitel)) return auftragTitel

  const rechnungTitel = opts.rechnungTitel?.trim() || ''
  if (rechnungTitel && !isPlaceholderVorgangTitel(rechnungTitel)) return rechnungTitel

  const anfrage = situationBereichTitel(opts.situation, opts.bereiche)
  if (anfrage) return anfrage

  const fb = opts.fallback?.trim() || ''
  if (fb && !isPlaceholderVorgangTitel(fb)) return fb
  return 'Vorgang'
}
