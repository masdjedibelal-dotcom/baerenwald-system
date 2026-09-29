'use client'

import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import {
  resolveStatus,
  toneToMockBadgeKind,
  type StatusTone,
} from '@/lib/status/status-tone'
import { statusLabel, type VorgangPhaseKey } from '@/lib/status/status-map'

/**
 * Spec §11 — einziges StatusBadge für alle Vorgangs-Status.
 * Unbekannte Status: Fallback über resolveStatus (kein Crash).
 */
export function StatusBadge({
  status,
  phase,
  label: labelOverride,
  tone: toneOverride,
  kind: kindOverride,
}: {
  status?: string | null
  /** Phase → Wort aus status-map (eine Quelle); ohne Phase nur Farbe/Fallback */
  phase?: VorgangPhaseKey
  label?: string
  tone?: StatusTone
  /** Explizites MockBadge-Kind (z. B. Ampel: storniert/warten/aktiv) */
  kind?: string
}) {
  const resolved = resolveStatus(status)
  const label =
    labelOverride ?? (phase && status ? statusLabel(phase, status) : resolved.label)
  const tone = toneOverride ?? resolved.tone
  const kind = kindOverride ?? toneToMockBadgeKind(tone)
  return <MockBadge kind={kind}>{label}</MockBadge>
}
