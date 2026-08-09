'use client'

import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import {
  resolveStatus,
  toneToMockBadgeKind,
  type StatusTone,
} from '@/lib/status/status-tone'

/**
 * Spec §11 — einziges StatusBadge für alle Vorgangs-Status.
 * Unbekannte Status: Fallback über resolveStatus (kein Crash).
 */
export function StatusBadge({
  status,
  label: labelOverride,
  tone: toneOverride,
  kind: kindOverride,
}: {
  status?: string | null
  label?: string
  tone?: StatusTone
  /** Explizites MockBadge-Kind (z. B. Ampel: storniert/warten/aktiv) */
  kind?: string
}) {
  const resolved = resolveStatus(status)
  const label = labelOverride ?? resolved.label
  const tone = toneOverride ?? resolved.tone
  const kind = kindOverride ?? toneToMockBadgeKind(tone)
  return <MockBadge kind={kind}>{label}</MockBadge>
}
