/**
 * Spec §11 Fallback + R3-ALTDATEN Teil D + §5 primaryCta Sanity-Check.
 * Ausführen: npx tsx src/lib/status/status-tone.fallback-check.ts
 */
import {
  anfrageStatusDisplay,
  angebotStatusDisplay,
  auftragStatusDisplay,
  rechnungStatusDisplay,
} from '@/lib/status/status-display'
import {
  statusLabel,
  statusMapEntryOrUnknown,
  unknownStatusEntry,
} from '@/lib/status/status-map'
import { resolveStatus } from '@/lib/status/status-tone'
import { primaryCta } from '@/lib/vorgang/primary-cta'

const unknown = resolveStatus('___unbekannter_status_xyz___')
if (unknown.label !== '___unbekannter_status_xyz___') {
  throw new Error(`Fallback label falsch: ${unknown.label}`)
}
if (unknown.tone !== 'grau') {
  throw new Error(`Fallback tone falsch (erwartet grau/neutral): ${unknown.tone}`)
}
if (resolveStatus('').label !== 'Unbekannt' || resolveStatus('').tone !== 'grau') {
  throw new Error('Leerer Status muss Unbekannt/grau sein')
}
if (unknownStatusEntry('').label !== 'Unbekannt') {
  throw new Error('unknownStatusEntry leer')
}
if (statusMapEntryOrUnknown('auftrag', 'wartend').label !== 'wartend') {
  throw new Error('status-map Default wartend')
}
if (statusLabel('anfrage', 'in_bearbeitung') !== 'in_bearbeitung') {
  throw new Error('statusLabel Alt-Status')
}
if (anfrageStatusDisplay('in_bearbeitung').variant !== 'neutral') {
  throw new Error('anfrage Alt-Status nicht neutral')
}
if (angebotStatusDisplay({ status: 'versendet', status_einfach: 'versendet' }).label !== 'versendet') {
  throw new Error('angebot Alt-Status versendet darf nicht zu Entwurf kollabieren')
}
if (angebotStatusDisplay({ status: 'versendet', status_einfach: 'versendet' }).variant !== 'neutral') {
  throw new Error('angebot Alt-Status nicht neutral')
}
if (auftragStatusDisplay('wartend').label !== 'wartend') {
  throw new Error('auftrag Alt-Status wartend')
}
if (rechnungStatusDisplay('teilbezahlt').label !== 'teilbezahlt') {
  throw new Error('rechnung Alt-Status teilbezahlt')
}

if (primaryCta('anfrage', 'neu')?.id !== 'angebot_erstellen') throw new Error('anfrage neu')
if (primaryCta('angebot', 'entwurf')?.id !== 'angebot_annehmen') throw new Error('angebot entwurf')
if (
  primaryCta('angebot', 'entwurf', { unterSchwelleDirektAuftrag: true })?.id !== 'direkt_auftrag'
) {
  throw new Error('angebot entwurf direkt auftrag')
}
if (primaryCta('angebot', 'gesendet')?.id !== 'angebot_annehmen') {
  throw new Error('angebot gesendet annehmen')
}
if (
  primaryCta('angebot', 'gesendet', { unterSchwelleDirektAuftrag: true })?.id !== 'direkt_auftrag'
) {
  throw new Error('angebot gesendet direkt auftrag')
}
if (primaryCta('auftrag', 'offen')?.id !== 'auftrag_abschliessen') throw new Error('auftrag offen')
/* Abgeschlossen: RE-Folgeaktion kann schon durch sein → Bewertung; sonst als_bezahlt */
if (
  primaryCta('auftrag', 'abgeschlossen', { naechsteRechnungAktion: 'versenden' })?.id !==
  'bewertung_einholen'
) {
  throw new Error('auftrag fertig versenden→bewertung')
}
if (
  primaryCta('auftrag', 'abgeschlossen', { naechsteRechnungAktion: 'bezahlt' })?.id !== 'als_bezahlt'
) {
  throw new Error('auftrag fertig bezahlt')
}
if (
  primaryCta('auftrag', 'abgeschlossen', { naechsteRechnungAktion: null })?.id !==
  'bewertung_einholen'
) {
  throw new Error('auftrag fertig bewertung')
}
if (primaryCta('rechnung', 'entwurf')?.id !== 'rechnung_versenden') throw new Error('rechnung entwurf')
if (primaryCta('anfrage', 'abgebrochen') !== null) throw new Error('anfrage verloren')

console.log('Phase-1 + R3-ALTDATEN Teil D status/primaryCta checks OK')
