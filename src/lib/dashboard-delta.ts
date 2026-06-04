import type { StatDelta } from '@/components/dashboard/StatCard'

/** Trend-Text für Vergleich zweier Zählwerte (z. B. heute vs. gestern). */
export function deltaVsPrevious(
  current: number,
  previous: number,
  suffix: string,
  invertTrendColors = false
): StatDelta | undefined {
  if (current === 0 && previous === 0) return undefined
  if (previous === 0) {
    return {
      label: current > 0 ? `+${current} ${suffix}` : `0 ${suffix}`,
      trend: current > 0 ? 'up' : 'neutral',
      invertTrendColors,
    }
  }
  const diff = current - previous
  const pct = Math.round((diff / previous) * 100)
  if (pct === 0) {
    return { label: `±0 % ${suffix}`, trend: 'neutral', invertTrendColors }
  }
  const sign = pct > 0 ? '+' : ''
  return {
    label: `${sign}${pct} % ${suffix}`,
    trend: pct > 0 ? 'up' : 'down',
    invertTrendColors,
  }
}
