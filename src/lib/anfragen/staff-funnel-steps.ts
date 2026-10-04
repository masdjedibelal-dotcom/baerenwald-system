import {
  bereicheFuerSituation,
  fachdetailKeysForBereich,
  hatGroesseFeld,
  type SituationValue,
} from '@/lib/vorab-formular-config'
import type { StaffFunnelState } from '@/lib/anfragen/staff-funnel-types'
import {
  anliegenToSituation
} from '@/lib/anfragen/staff-funnel-types'

const BERATUNG_BEREICHE = new Set(['schimmel', 'anbau', 'baum_notfall'])

export function needsBeratungPfad(state: StaffFunnelState): boolean {
  if (state.situation === 'gewerbe' || state.anliegen === 'gewerbe') {
    return true
  }
  if (state.bereiche.some((b) => BERATUNG_BEREICHE.has(b))) return true
  return false
}

export function needsZugaenglichkeit(state: StaffFunnelState): boolean {
  if (state.situation !== 'erneuern') return false
  return state.bereiche.some((b) => b === 'fassade' || b === 'dach')
}

export function needsZustand(state: StaffFunnelState): boolean {
  if (state.situation !== 'erneuern') return false
  return state.bereiche.some((b) => b === 'waende' || b === 'boden')
}

export function needsGroesse(state: StaffFunnelState): boolean {
  if (state.situation === 'kaputt' || state.situation === 'gewerbe') return false
  if (state.situation === 'betreuung') {
    if (state.bereiche.length === 1 && state.bereiche[0] === 'hausmeister') return false
  }
  if (state.situation === 'erneuern') {
    if (state.bereiche.every((b) => b === 'elektrik')) return false
  }
  return state.bereiche.some((b) => hatGroesseFeld(b))
}

export function needsUmfang(state: StaffFunnelState): boolean {
  if (state.situation !== 'betreuung') return false
  if (state.bereiche.length === 1 && state.bereiche[0] === 'baum') return false
  return true
}

export function needsBadAusstattung(state: StaffFunnelState): boolean {
  return state.situation === 'erneuern' && state.bereiche.includes('bad')
}

export function needsFachdetails(state: StaffFunnelState): boolean {
  if (!state.situation || state.situation === 'gewerbe') return false
  return state.bereiche.some(
    (b) => fachdetailKeysForBereich(b, state.situation as SituationValue).length > 0
  )
}

export function needsDringlichkeit(state: StaffFunnelState): boolean {
  return state.situation === 'kaputt' || state.situation === 'notfall'
}

/** Umsetzungszeitraum — nicht bei Reparatur/Notfall (dort: Dringlichkeit). */
export function needsUmsetzungsZeitraum(state: StaffFunnelState): boolean {
  const sit = state.situation || anliegenToSituation(state.anliegen)
  if (!sit || sit === 'kaputt' || sit === 'notfall') return false
  return sit === 'erneuern' || sit === 'betreuung' || sit === 'gewerbe'
}

/** Welche dynamischen Website-Funnel-Blöcke im Staff-Create sichtbar sind. */
export function staffFunnelDynamicBlocks(state: StaffFunnelState): {
  umfang: boolean
  zugaenglichkeit: boolean
  zustand: boolean
  badAusstattung: boolean
  groesse: boolean
  fachdetails: boolean
  dringlichkeit: boolean
  umsetzungsZeitraum: boolean
  beratung: boolean
  any: boolean
} {
  const umfang = needsUmfang(state)
  const zugaenglichkeit = needsZugaenglichkeit(state)
  const zustand = needsZustand(state)
  const badAusstattung = needsBadAusstattung(state)
  const groesse = needsGroesse(state)
  const fachdetails = needsFachdetails(state)
  const dringlichkeit = needsDringlichkeit(state)
  const umsetzungsZeitraum = needsUmsetzungsZeitraum(state)
  const beratung = needsBeratungPfad(state)
  return {
    umfang,
    zugaenglichkeit,
    zustand,
    badAusstattung,
    groesse,
    fachdetails,
    dringlichkeit,
    umsetzungsZeitraum,
    beratung,
    any:
      umfang ||
      zugaenglichkeit ||
      zustand ||
      badAusstattung ||
      groesse ||
      fachdetails ||
      dringlichkeit ||
      umsetzungsZeitraum ||
      beratung,
  }
}

/** Fachdetail-Keys (ohne bad_ausstattung — eigener Block). */
export function staffFunnelFachdetailKeys(state: StaffFunnelState): string[] {
  if (!state.situation || state.situation === 'gewerbe') return []
  const keys = new Set<string>()
  for (const b of state.bereiche) {
    for (const k of fachdetailKeysForBereich(b, state.situation as SituationValue)) {
      if (state.situation === 'erneuern' && k === 'bad_ausstattung') continue
      keys.add(k)
    }
  }
  return Array.from(keys)
}

export function staffFunnelGroesseBereiche(state: StaffFunnelState): string[] {
  if (!needsGroesse(state)) return []
  return state.bereiche.filter((b) => hatGroesseFeld(b))
}

export function bereicheForStaffSituation(situation: SituationValue | ''): ReturnType<
  typeof bereicheFuerSituation
> {
  if (!situation) return []
  return bereicheFuerSituation(situation)
}
