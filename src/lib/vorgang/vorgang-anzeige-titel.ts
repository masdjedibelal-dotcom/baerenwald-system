import { parseWizardMetaFromNotizen } from '@/lib/templates/angebot-mail'
import { BEREICH_LABELS, SITUATION_LABELS } from '@/lib/utils'

export type VorgangAnzeigeTitelAngebot = {
  leistungsumfang?: string | null
  notizen?: string | null
  /** Optional / Legacy — Prod hat oft keine Spalte `angebote.titel` */
  titel?: string | null
}

/** Trenner in Titeln: Em-/En-Dash, Minus, Doppelpunkt, Mittelpunkt */
const TITEL_SPLIT_RE = /\s*[\u2013\u2014\u2212\-|:·]\s*/

/**
 * Platzhalter / PosBoard-Defaults / Slugs — kein sprechender Vorgangs-Titel.
 * (z. B. „Leistungen“, „Auftrag“, „Direktauftrag — sanitär“, „fenster_tuer – Firma“)
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
  if (/^direktauftrag\s*[\u2013\u2014\u2212\-|:·]\s*[a-z0-9_]+$/i.test(raw))
    return true
  // Slug als linker Teil: „fenster_tuer – Belal GMBH“ / „fenster_tuer — …“
  const left = raw.split(TITEL_SPLIT_RE, 1)[0]?.trim().toLowerCase() ?? ''
  if (left && left !== n && /^[a-z][a-z0-9_]*_[a-z0-9_]+$/.test(left)) return true
  if (left && left !== n && left in BEREICH_LABELS) return true
  return false
}

/** Bereich-Slug → Label; unbekannte Underscore-Slugs nicht roh anzeigen. */
export function labelBereichOderLeer(slug: string | null | undefined): string {
  const raw = slug?.trim() ?? ''
  if (!raw) return ''
  const labeled = BEREICH_LABELS[raw] ?? BEREICH_LABELS[raw.toLowerCase()]
  if (labeled) return labeled
  if (/^[a-z][a-z0-9_]*_[a-z0-9_]+$/i.test(raw)) return ''
  return raw
}

/** Erster brauchbarer Titel aus Angebot (Leistungsumfang / Wizard / Spalte). */
function angebotSprechenderTitel(
  angebot?: VorgangAnzeigeTitelAngebot | null
): string | null {
  if (!angebot) return null
  const wm = parseWizardMetaFromNotizen(angebot.notizen)
  const candidates = [
    wm?.titel,
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

/** Situation + Bereich (Labels), z. B. „Reparatur / Defekt · Fenster / Tür“. */
export function situationBereichTitel(
  situation?: string | null,
  bereiche?: string[] | null
): string | null {
  const sit = situation?.trim()
  const sitLabel = sit ? (SITUATION_LABELS[sit] ?? sit) : ''
  const bereichLabel = (bereiche ?? [])
    .map((b) => labelBereichOderLeer(b))
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
