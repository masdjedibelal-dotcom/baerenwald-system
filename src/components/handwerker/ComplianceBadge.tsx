'use client'

import { AlertTriangle, Check, X } from 'lucide-react'
import { IconText } from '@/components/ui/IconText'
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
    return (
      <span className={cn('badge', 'badge-order')}>
        <IconText icon={Check}>OK</IconText>
      </span>
    )
  }
  if (k === 'bald_ablaufend') {
    return (
      <span className={cn('badge', 'badge-contacted')} title="Dokument läuft bald ab">
        <IconText icon={AlertTriangle}>Läuft ab</IconText>
      </span>
    )
  }
  if (k === 'unvollstaendig') {
    return (
      <span className={cn('badge', 'badge-offer')}>
        <IconText icon={AlertTriangle}>Unvollständig</IconText>
      </span>
    )
  }
  return (
    <span className={cn('badge', 'badge-cancel')}>
      <IconText icon={X}>Fehlt</IconText>
    </span>
  )
}
