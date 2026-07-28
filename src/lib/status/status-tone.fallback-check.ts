/**
 * Spec §11 Fallback + §5 primaryCta Sanity-Check.
 * Ausführen: npx tsx src/lib/status/status-tone.fallback-check.ts
 */
import { resolveStatus } from '@/lib/status/status-tone'
import { primaryCta } from '@/lib/vorgang/primary-cta'

const unknown = resolveStatus('___unbekannter_status_xyz___')
if (unknown.label !== '___unbekannter_status_xyz___') {
  throw new Error(`Fallback label falsch: ${unknown.label}`)
}
if (unknown.tone !== 'blau') {
  throw new Error(`Fallback tone falsch: ${unknown.tone}`)
}

if (primaryCta('anfrage', 'neu')?.id !== 'angebot_erstellen') throw new Error('anfrage neu')
if (primaryCta('angebot', 'entwurf')?.id !== 'angebot_versenden') throw new Error('angebot entwurf')
if (primaryCta('auftrag', 'offen')?.id !== 'auftrag_abschliessen') throw new Error('auftrag offen')
if (primaryCta('rechnung', 'entwurf')?.id !== 'rechnung_versenden') throw new Error('rechnung entwurf')
if (primaryCta('anfrage', 'abgebrochen') !== null) throw new Error('anfrage verloren')

console.log('Phase-1 status/primaryCta checks OK')
