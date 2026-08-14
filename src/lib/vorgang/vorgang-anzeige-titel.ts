import { parseWizardMetaFromNotizen } from '@/lib/templates/angebot-mail'
import { BEREICH_LABELS, SITUATION_LABELS } from '@/lib/utils'

export type VorgangAnzeigeTitelAngebot = {
  leistungsumfang?: string | null
  notizen?: string | null
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

/** Titel aus Angebot (Leistungsumfang / Wizard), sonst Situation · Bereich. */
export function angebotTitelOderSituationBereich(opts: {
  angebot?: VorgangAnzeigeTitelAngebot | null
  situation?: string | null
  bereiche?: string[] | null
  fallback?: string | null
}): string {
  const wm = opts.angebot ? parseWizardMetaFromNotizen(opts.angebot.notizen) : null
  const angebotTitel =
    opts.angebot?.leistungsumfang?.trim() || wm?.leistungsumfang?.trim() || ''
  if (angebotTitel) return angebotTitel

  const fromLead = situationBereichTitel(opts.situation, opts.bereiche)
  if (fromLead) return fromLead

  return opts.fallback?.trim() || 'Vorgang'
}

/**
 * Akte-Accordion: Anfrage-Titel als Basis; sobald vorhanden Angebot → Auftrag → Rechnung.
 * (Anfrage ändert sich danach nicht mehr „zurück“ — spätere Phasen-Titel gewinnen.)
 */
export function resolveAkteVorgangTitel(opts: {
  angebot?: VorgangAnzeigeTitelAngebot | null
  auftragTitel?: string | null
  rechnungTitel?: string | null
  situation?: string | null
  bereiche?: string[] | null
  fallback?: string | null
}): string {
  const wm = opts.angebot ? parseWizardMetaFromNotizen(opts.angebot.notizen) : null
  const angebotTitel =
    opts.angebot?.leistungsumfang?.trim() || wm?.leistungsumfang?.trim() || ''
  if (angebotTitel) return angebotTitel

  const auftragTitel = opts.auftragTitel?.trim()
  if (auftragTitel) return auftragTitel

  const rechnungTitel = opts.rechnungTitel?.trim()
  if (rechnungTitel) return rechnungTitel

  const anfrage = situationBereichTitel(opts.situation, opts.bereiche)
  if (anfrage) return anfrage

  return opts.fallback?.trim() || 'Vorgang'
}
