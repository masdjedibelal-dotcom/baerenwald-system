import type { VizBrief, VizModus } from '@/lib/visualize/types'

export function promptStrengthForModus(modus: VizModus, strukturLock: boolean): number {
  const base: Record<VizModus, number> = {
    auffrischen: 0.42,
    teilsanierung: 0.54,
    stil_update: 0.6,
  }
  let strength = base[modus] ?? 0.45
  if (strukturLock) strength = Math.min(strength, modus === 'auffrischen' ? 0.42 : 0.56)
  return strength
}

export function guidanceScaleForModus(modus: VizModus): number {
  if (modus === 'auffrischen') return 8
  if (modus === 'teilsanierung') return 10
  return 11
}

export function negativePromptForBrief(brief?: VizBrief | null): string {
  const parts = [
    'new windows',
    'new doors',
    'skylight',
    'changed room layout',
    'different room shape',
    'outdoor landscape',
    'people',
    'text',
    'watermark',
  ]
  if (brief?.struktur_lock) {
    parts.push('added openings', 'removed walls', 'open floor plan change')
  }
  return parts.join(', ')
}
