'use client'

import { AlertTriangle, Check, X } from 'lucide-react'
import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { IconText } from '@/components/ui/IconText'

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
      <MockBadge kind="aktiv">
        <IconText icon={Check}>Compliance OK</IconText>
      </MockBadge>
    )
  }
  if (k === 'bald_ablaufend') {
    return (
      <span title="Dokument läuft bald ab">
        <MockBadge kind="warten">
          <IconText icon={AlertTriangle}>läuft ab</IconText>
        </MockBadge>
      </span>
    )
  }
  if (k === 'unvollstaendig') {
    return (
      <MockBadge kind="warten">
        <IconText icon={AlertTriangle}>Nachweis fehlt</IconText>
      </MockBadge>
    )
  }
  return (
    <MockBadge kind="storniert">
      <IconText icon={X}>Nachweis fehlt</IconText>
    </MockBadge>
  )
}
