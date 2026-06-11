import type { AuftragStatus, LeadStatus } from '@/lib/types'

export const PROJEKT_PHASEN = ['Anfrage', 'Angebot', 'Auftrag', 'Abnahme', 'Fertig'] as const

export type ProjektPhase = (typeof PROJEKT_PHASEN)[number]

export function aktuellePhaseIndex(leadStatus: LeadStatus | null, aufStatus: AuftragStatus): number {
  if (aufStatus === 'abgeschlossen') return 4
  if (aufStatus === 'abnahme') return 3
  if (aufStatus === 'storniert') return 0
  if (aufStatus === 'offen' || aufStatus === 'in_arbeit') return 2
  if (leadStatus === 'angebot') return 1
  if (leadStatus === 'neu' || leadStatus === 'kontaktiert' || leadStatus === 'termin') return 0
  if (leadStatus === 'auftrag') return 2
  return 2
}

export function auftragStatusLabelDe(status: AuftragStatus): string {
  if (status === 'offen') return 'Offen'
  if (status === 'in_arbeit') return 'In Arbeit'
  if (status === 'abnahme') return 'Abnahme'
  if (status === 'abgeschlossen') return 'Abgeschlossen'
  if (status === 'storniert') return 'Storniert'
  return status
}

/** Anzeige in der Fortschritts-Card (Mockup: „Ausführung“). */
export function aktuelleAuftragPhaseLabel(status: AuftragStatus): string {
  if (status === 'offen') return 'Vorbereitung'
  if (status === 'in_arbeit') return 'Ausführung'
  if (status === 'abnahme') return 'Abnahme'
  if (status === 'abgeschlossen') return 'Fertigstellung'
  if (status === 'storniert') return 'Storniert'
  return status
}

/** HTML für E-Mail: 5 Phasen als Step-Leiste (schlicht, table-safe) */
export function mailPhasenStepsHtml(phaseIdx: number): string {
  const cells = PROJEKT_PHASEN.map((label, i) => {
    const done = i < phaseIdx
    const active = i === phaseIdx
    const color = done || active ? '#2E7D52' : '#D1D5DB'
    const textColor = active ? '#1A3D2B' : done ? '#2E7D52' : '#9CA3AF'
    const weight = active ? '700' : '500'
    const dot = done ? '✓' : active ? '●' : '○'
    return `<td align="center" style="padding:4px 2px;font-size:10px;color:${textColor};font-weight:${weight};">
      <span style="display:inline-block;width:22px;height:22px;line-height:22px;border-radius:50%;border:2px solid ${color};color:${color};font-size:11px;">${dot}</span>
      <br/>${label}
    </td>`
  }).join('')
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:16px 0 20px;border-collapse:collapse;"><tr>${cells}</tr></table>`
}
