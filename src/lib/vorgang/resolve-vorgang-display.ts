import type { PortalRole, ResolvedVorgang } from '@/lib/vorgang/types'
import { ACTOR_LABELS, PHASE_LABELS } from '@/lib/vorgang/vorgang-labels'

export type VorgangDisplayStatus = {
  phaseLabel: string
  unterstatusLabel: string
  pillKind: 'neu' | 'warten' | 'aktiv' | 'fertig' | 'storniert'
  metaLine: string | null
  actionHint: string | null
}

const MIETER_PHASE: Record<string, string> = {
  anfrage: 'Eingegangen',
  angebot: 'In Bearbeitung',
  auftrag: 'Beauftragt',
  rechnung: 'In Bearbeitung',
}

const HV_PHASE: Record<string, string> = {
  anfrage: 'Neu',
  angebot: 'In Bearbeitung',
  auftrag: 'In Bearbeitung',
  rechnung: 'In Bearbeitung',
}

function pillKind(resolved: ResolvedVorgang): VorgangDisplayStatus['pillKind'] {
  if (resolved.unterstatus === 'storniert' || resolved.unterstatus === 'abgebrochen') return 'storniert'
  if (resolved.badges.wartet_freigabe) return 'warten'
  if (resolved.phase === 'anfrage') return 'neu'
  if (resolved.phase === 'rechnung' && resolved.unterstatus === 'bezahlt') return 'fertig'
  if (resolved.phase === 'auftrag' && resolved.unterstatus === 'abgeschlossen') return 'fertig'
  return 'aktiv'
}

function actionHint(resolved: ResolvedVorgang, role: PortalRole): string | null {
  if (!resolved.needsAction || !resolved.actor) return null
  if (role === 'mieter') return null
  if (role === 'handwerker' && resolved.actor === 'handwerker') return 'Aktion nötig'
  if (role === 'hv' && resolved.actor === 'freigabe') return 'Freigabe ausstehend'
  if (role === 'kunde' && resolved.actor === 'kunde') return 'Angebot liegt vor'
  if (role === 'crm' || role === 'hv') return ACTOR_LABELS[resolved.actor] ?? null
  return ACTOR_LABELS[resolved.actor] ?? null
}

/** Read-only Mapping für Portale (Wave 1). */
export function resolveVorgangDisplay(resolved: ResolvedVorgang, role: PortalRole): VorgangDisplayStatus {
  let phaseLabel = PHASE_LABELS[resolved.phase]
  if (role === 'mieter') phaseLabel = MIETER_PHASE[resolved.phase] ?? phaseLabel
  if (role === 'hv') phaseLabel = HV_PHASE[resolved.phase] ?? phaseLabel

  const metaParts: string[] = []
  if (resolved.kanalMeta) metaParts.push(resolved.kanalMeta)
  if (resolved.ueberfaellig) metaParts.push('Überfällig')
  if (resolved.badges.notfall) metaParts.push('Notfall')

  return {
    phaseLabel,
    unterstatusLabel: resolved.unterstatusLabel,
    pillKind: pillKind(resolved),
    metaLine: metaParts.length ? metaParts.join(' · ') : null,
    actionHint: actionHint(resolved, role),
  }
}
