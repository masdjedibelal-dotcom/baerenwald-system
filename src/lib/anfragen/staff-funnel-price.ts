import type { StaffFunnelState } from '@/lib/anfragen/staff-funnel-types'
import { needsBeratungPfad } from '@/lib/anfragen/staff-funnel-steps'

type PriceResult = {
  modus: 'rahmen' | 'komplex'
  min: number | null
  max: number | null
  hinweis: string
}

/** Grobe Staff-Schätzung (editierbar). Später 1:1 Website-Engine. */
const BASIS: Record<string, { min: number; max: number; perM2?: boolean }> = {
  bad: { min: 9000, max: 18000 },
  heizung: { min: 3500, max: 14000 },
  elektrik: { min: 800, max: 4500 },
  waende: { min: 800, max: 3500, perM2: true },
  boden: { min: 1200, max: 6000, perM2: true },
  fenster: { min: 1500, max: 8000 },
  dach: { min: 2500, max: 18000 },
  fassade: { min: 3000, max: 15000, perM2: true },
  trockenbau: { min: 1500, max: 8000, perM2: true },
  sanitaer: { min: 180, max: 650 },
  garten: { min: 400, max: 2500 },
  reinigung: { min: 150, max: 800 },
  hausmeister: { min: 200, max: 600 },
  winterdienst: { min: 300, max: 1200 },
}

function plzFaktor(plz: string): number {
  if (!plz || plz.length < 2) return 1
  if (plz.startsWith('80') || plz.startsWith('81')) return 1
  if (plz.startsWith('82') || plz.startsWith('85')) return 1.03
  return 1.06
}

export function estimateStaffFunnelPrice(state: StaffFunnelState): PriceResult {
  if (needsBeratungPfad(state) || state.situation === 'gewerbe') {
    return {
      modus: 'komplex',
      min: null,
      max: null,
      hinweis:
        'Für diese Auswahl gibt es keinen verlässlichen Online-Preisrahmen — Aufwand und Budget klären wir persönlich.',
    }
  }

  if (!state.bereiche.length) {
    return {
      modus: 'rahmen',
      min: null,
      max: null,
      hinweis: 'Bereich wählen, um eine Schätzung zu erhalten.',
    }
  }

  let min = 0
  let max = 0
  const f = plzFaktor(state.plz)
  const notfall =
    state.situation === 'kaputt' &&
    (state.dringlichkeit === 'sofort' || state.dringlichkeit === 'diese_woche')

  for (const b of state.bereiche) {
    const basis = BASIS[b]
    if (!basis) {
      min += 500
      max += 2000
      continue
    }
    let bMin = basis.min
    let bMax = basis.max
    const g = state.groessen[b]
    if (basis.perM2 && g && g > 0) {
      const unitMin = b === 'boden' ? 45 : b === 'waende' ? 18 : 35
      const unitMax = b === 'boden' ? 95 : b === 'waende' ? 42 : 75
      bMin = Math.round(g * unitMin)
      bMax = Math.round(g * unitMax)
    } else if (g && g > 0 && (b === 'heizung' || b === 'bad')) {
      const scale = Math.min(2.2, Math.max(0.7, g / (b === 'bad' ? 6 : 80)))
      bMin = Math.round(basis.min * scale)
      bMax = Math.round(basis.max * scale)
    }
    if (state.badAusstattung === 'komfort' && b === 'bad') {
      bMin = Math.round(bMin * 1.15)
      bMax = Math.round(bMax * 1.2)
    }
    if (state.badAusstattung === 'gehoben' && b === 'bad') {
      bMin = Math.round(bMin * 1.35)
      bMax = Math.round(bMax * 1.45)
    }
    min += bMin
    max += bMax
  }

  if (notfall) {
    min = Math.round(min * 1.15)
    max = Math.round(max * 1.25)
  }

  min = Math.round(min * f)
  max = Math.round(max * f)

  if (max < min) max = min

  return {
    modus: 'rahmen',
    min,
    max,
    hinweis: 'Unverbindliche Orientierung — wie auf der Website für den Kunden.',
  }
}
