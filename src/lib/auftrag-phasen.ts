import type { AuftragStatus } from '@/lib/types'

export type AuftragPhaseId = 'planung' | 'vorbereitung' | 'ausfuehrung' | 'abnahme' | 'rechnung'
export type AuftragPhaseState = 'fertig' | 'aktuell' | 'offen'

export const AUFTRAG_PHASEN: { id: AuftragPhaseId; label: string }[] = [
  { id: 'planung', label: 'Planung' },
  { id: 'vorbereitung', label: 'Vorbereitung' },
  { id: 'ausfuehrung', label: 'Ausführung' },
  { id: 'abnahme', label: 'Abnahme' },
  { id: 'rechnung', label: 'Rechnung' },
]

export function auftragPhasenStates(input: {
  status: AuftragStatus
  hatAngebot: boolean
}): Record<AuftragPhaseId, AuftragPhaseState> {
  const { status, hatAngebot } = input

  if (status === 'storniert') {
    return {
      planung: 'offen',
      vorbereitung: 'offen',
      ausfuehrung: 'offen',
      abnahme: 'offen',
      rechnung: 'offen',
    }
  }

  if (status === 'abgeschlossen') {
    return {
      planung: 'fertig',
      vorbereitung: 'fertig',
      ausfuehrung: 'fertig',
      abnahme: 'fertig',
      rechnung: 'fertig',
    }
  }

  const planungFertig = hatAngebot || status !== 'offen'
  const vorbereitungFertig = status === 'in_arbeit' || status === 'abnahme'

  let aktuell: AuftragPhaseId = 'planung'
  if (status === 'abnahme') aktuell = 'abnahme'
  else if (status === 'in_arbeit') aktuell = 'ausfuehrung'
  else if (status === 'offen') {
    if (vorbereitungFertig) aktuell = 'ausfuehrung'
    else if (planungFertig) aktuell = 'vorbereitung'
    else aktuell = 'planung'
  }

  const order: AuftragPhaseId[] = ['planung', 'vorbereitung', 'ausfuehrung', 'abnahme', 'rechnung']
  const aktuellIdx = order.indexOf(aktuell)

  const out = {} as Record<AuftragPhaseId, AuftragPhaseState>
  for (let i = 0; i < order.length; i++) {
    const id = order[i]!
    if (i < aktuellIdx) out[id] = 'fertig'
    else if (i === aktuellIdx) out[id] = 'aktuell'
    else out[id] = 'offen'
  }

  if (!planungFertig && aktuell !== 'planung') out.planung = 'offen'
  if (planungFertig && aktuellIdx > 0) out.planung = 'fertig'
  if (vorbereitungFertig && aktuellIdx > 1) out.vorbereitung = 'fertig'

  return out
}
