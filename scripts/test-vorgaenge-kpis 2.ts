import { computeVorgaengeKpis } from '@/lib/vorgang/vorgaenge-kpis'
import type { VorgangListeRow } from '@/lib/vorgang/types'

function row(partial: Pick<VorgangListeRow, 'phase' | 'unterstatus'> & Partial<VorgangListeRow>): VorgangListeRow {
  return {
    phase: partial.phase,
    unterstatus: partial.unterstatus,
    unterstatusLabel: partial.unterstatus,
    titel: 'Test',
    entityId: '1',
    entityType: partial.phase,
    leadId: 'L1',
    updatedAt: '2026-01-01T00:00:00Z',
    needsAction: false,
    actor: null,
    badges: { notfall: false, wartet_freigabe: false },
    ueberfaellig: false,
    kanalMeta: null,
    kundeName: null,
    wertLabel: null,
    detailHref: '/anfragen/L1',
    ...partial,
  }
}

const kpiRows: VorgangListeRow[] = [
  row({ phase: 'anfrage', unterstatus: 'neu', leadId: 'L1' }),
  row({ phase: 'anfrage', unterstatus: 'kontaktiert', leadId: 'L2' }),
  row({ phase: 'angebot', unterstatus: 'gesendet', leadId: 'L3' }),
  row({ phase: 'angebot', unterstatus: 'angenommen', leadId: 'L4' }),
  row({ phase: 'auftrag', unterstatus: 'in_arbeit', leadId: 'L5' }),
  row({ phase: 'auftrag', unterstatus: 'abgeschlossen', leadId: 'L6' }),
  row({ phase: 'rechnung', unterstatus: 'gesendet', leadId: 'L7' }),
  row({ phase: 'rechnung', unterstatus: 'bezahlt', leadId: 'L8' }),
]

const kpis = computeVorgaengeKpis(kpiRows)
const ok =
  kpis.neueAnfragen === 1 &&
  kpis.offeneAngebote === 1 &&
  kpis.aktiveAuftraege === 1 &&
  kpis.offeneRechnungen === 1

if (!ok) {
  console.error('  ✗ vorgaenge-kpis', kpis)
  process.exit(1)
}
console.log('  ✓ vorgaenge-kpis')
