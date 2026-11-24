'use client'

import type { ReactNode } from 'react'

/**
 * Tab Akte — Dateien und Notizen untereinander (Spec §4, Phase 5d).
 * Kein Segment-Umschalter; Zahlung und Kunde gehören nicht in die Akte.
 */
export function VorgangAkteTab({
  dateien,
  notizen,
  mails,
}: {
  dateien: ReactNode
  notizen: ReactNode
  /** E-Mails zum Vorgang (gesendet + Antworten des Kunden) */
  mails?: ReactNode
}) {
  return (
    <div className="vorgang-akte-tab space-y-6">
      {mails}
      {dateien}
      {notizen}
    </div>
  )
}
