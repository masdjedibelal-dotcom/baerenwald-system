import { parseWizardMetaFromNotizen } from '@/lib/templates/angebot-mail'

export type AngebotLeistungsumfangQuelle = {
  leistungsumfang?: string | null
  notizen?: string | null
}

/** Gleiche Priorität wie Angebots-PDF: Spalte → wizard_meta in notizen → optional Lead-Situation. */
export function resolveAngebotLeistungsumfang(
  angebot: AngebotLeistungsumfangQuelle | null | undefined,
  opts?: { leadSituation?: string | null; fallback?: string | null }
): string {
  const wm = angebot ? parseWizardMetaFromNotizen(angebot.notizen) : null
  return (
    angebot?.leistungsumfang?.trim() ||
    wm?.leistungsumfang?.trim() ||
    opts?.leadSituation?.trim() ||
    opts?.fallback?.trim() ||
    ''
  )
}

/** Projekt-/Leistungstitel für Rechnungen: Angebotstitel wie im Angebots-Wizard, sonst Auftragstitel. */
export function resolveRechnungProjektTitel(opts: {
  angebot?: AngebotLeistungsumfangQuelle | null
  auftragTitel?: string | null
  fallback?: string
}): string {
  const ausAngebot = resolveAngebotLeistungsumfang(opts.angebot)
  if (ausAngebot) return ausAngebot
  const ausAuftrag = opts.auftragTitel?.trim()
  if (ausAuftrag) return ausAuftrag
  return opts.fallback?.trim() || 'Rechnung'
}
