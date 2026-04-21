'use client'

import { cn } from '@/lib/utils'

/** Normalisiert DB-Werte (vollständig, warnung, …) auf Badge-Logik */
export function normalizeComplianceBadgeKey(
  status: string | null | undefined
): 'ok' | 'bald_ablaufend' | 'unvollstaendig' | 'fehlt' {
  const s = (status ?? '').trim().toLowerCase()
  if (s === 'vollständig' || s === 'ok') return 'ok'
  if (s === 'warnung' || s === 'bald_ablaufend') return 'bald_ablaufend'
  if (s === 'abgelaufen' || s === 'fehlt') return 'fehlt'
  return 'unvollstaendig'
}

export function ComplianceBadge({ status }: { status: string | null | undefined }) {
  const k = normalizeComplianceBadgeKey(status)
  if (k === 'ok') {
    return <span className={cn('badge', 'badge-order')}>✓ OK</span>
  }
  if (k === 'bald_ablaufend') {
    return (
      <span className={cn('badge', 'badge-contacted')} title="Dokument läuft bald ab">
        ⚠️ Läuft ab
      </span>
    )
  }
  if (k === 'unvollstaendig') {
    return <span className={cn('badge', 'badge-offer')}>⚠️ Unvollständig</span>
  }
  return <span className={cn('badge', 'badge-cancel')}>✗ Fehlt</span>
}
