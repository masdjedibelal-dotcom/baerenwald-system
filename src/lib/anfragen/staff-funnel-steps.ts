import {
  bereicheFuerSituation,
  fachdetailKeysForBereich,
  hatGroesseFeld,
  type SituationValue,
} from '@/lib/vorab-formular-config'
import type { StaffFunnelState, StaffFunnelStepId } from '@/lib/anfragen/staff-funnel-types'
import { STAFF_FUNNEL_STEP_LABELS } from '@/lib/anfragen/staff-funnel-types'

const BERATUNG_BEREICHE = new Set(['schimmel', 'anbau', 'baum_notfall'])

export function needsBeratungPfad(state: StaffFunnelState): boolean {
  if (state.situation === 'gewerbe') return true
  if (state.bereiche.some((b) => BERATUNG_BEREICHE.has(b))) return true
  return false
}

function needsZugaenglichkeit(state: StaffFunnelState): boolean {
  if (state.situation !== 'erneuern') return false
  return state.bereiche.some((b) => b === 'fassade' || b === 'dach')
}

function needsZustand(state: StaffFunnelState): boolean {
  if (state.situation !== 'erneuern') return false
  return state.bereiche.some((b) => b === 'waende' || b === 'boden')
}

function needsGroesse(state: StaffFunnelState): boolean {
  if (state.situation === 'kaputt' || state.situation === 'gewerbe') return false
  if (state.situation === 'betreuung') {
    if (state.bereiche.length === 1 && state.bereiche[0] === 'hausmeister') return false
  }
  if (state.situation === 'erneuern') {
    if (state.bereiche.every((b) => b === 'elektrik')) return false
  }
  return state.bereiche.some((b) => hatGroesseFeld(b))
}

function needsUmfang(state: StaffFunnelState): boolean {
  if (state.situation !== 'betreuung') return false
  if (state.bereiche.length === 1 && state.bereiche[0] === 'baum') return false
  return true
}

function needsBadAusstattung(state: StaffFunnelState): boolean {
  return state.situation === 'erneuern' && state.bereiche.includes('bad')
}

function needsFachdetails(state: StaffFunnelState): boolean {
  if (!state.situation || state.situation === 'gewerbe') return false
  return state.bereiche.some(
    (b) => fachdetailKeysForBereich(b, state.situation as SituationValue).length > 0
  )
}

function needsKundentyp(state: StaffFunnelState): boolean {
  return !state.kundentyp?.trim()
}

/**
 * Dynamische Step-Sequenz nach CRM_STAFF_FUNNEL_STEP_MAPPING.
 */
export function resolveStaffFunnelSteps(state: StaffFunnelState): StaffFunnelStepId[] {
  const steps: StaffFunnelStepId[] = ['crm_kontext', 'situation']

  if (!state.situation) {
    return [...steps, 'crm_pruefen']
  }

  if (state.situation === 'gewerbe') {
    return [...steps, 'beratung', 'crm_pruefen']
  }

  steps.push('bereiche')

  if (state.situation === 'betreuung') {
    if (needsUmfang(state)) steps.push('umfang')
    if (needsGroesse(state)) steps.push('groesse')
    if (needsFachdetails(state)) steps.push('fachdetails')
    if (needsKundentyp(state)) steps.push('kundentyp')
    if (needsBeratungPfad(state)) steps.push('beratung')
    else steps.push('preis')
    steps.push('crm_pruefen')
    return steps
  }

  if (state.situation === 'kaputt') {
    if (needsFachdetails(state)) steps.push('fachdetails')
    steps.push('dringlichkeit')
    if (needsKundentyp(state)) steps.push('kundentyp')
    steps.push('ort')
    if (needsBeratungPfad(state)) steps.push('beratung')
    else steps.push('preis')
    steps.push('crm_pruefen')
    return steps
  }

  // erneuern (+ ggf. neubauen/notfall als erneuern-ähnlich)
  if (needsZugaenglichkeit(state)) steps.push('zugaenglichkeit')
  if (needsZustand(state)) steps.push('zustand')
  if (needsBadAusstattung(state)) steps.push('bad_ausstattung')
  if (needsGroesse(state)) steps.push('groesse')
  if (needsFachdetails(state)) steps.push('fachdetails')
  if (needsKundentyp(state)) steps.push('kundentyp')
  steps.push('ort_zeitraum')
  if (needsBeratungPfad(state)) steps.push('beratung')
  else steps.push('preis')
  steps.push('crm_pruefen')
  return steps
}

export function staffFunnelStepsForShell(state: StaffFunnelState): { id: number; label: string }[] {
  return resolveStaffFunnelSteps(state).map((sid, i) => ({
    id: i + 1,
    label: STAFF_FUNNEL_STEP_LABELS[sid],
  }))
}

export function bereicheForStaffSituation(situation: SituationValue | ''): ReturnType<
  typeof bereicheFuerSituation
> {
  if (!situation) return []
  // Website-Betreuung: baum als eigener Bereich — CRM hat baumarbeiten unter garten;
  // winterdienst statt winter
  return bereicheFuerSituation(situation)
}
