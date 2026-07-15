import type { VorgangPhase } from '@/lib/vorgang/types'

export function vorgangBackNav(phase?: VorgangPhase | null): {
  backHref: string
  backLabel: string
} {
  return {
    backHref: phase ? `/vorgaenge?phase=${phase}` : '/vorgaenge',
    backLabel: 'Zurück zu den Vorgängen',
  }
}
