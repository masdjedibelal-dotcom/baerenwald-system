/**
 * CRM TC-15 Helper — Positions-Lebenszyklus (ohne Partner-UI).
 * Run: node --experimental-strip-types scripts/test-position-lebenszyklus.mts
 * or: npx tsx scripts/test-position-lebenszyklus.mts
 */
import assert from 'node:assert/strict'
import {
  formatZeitMinuten,
  isDokuUeberfaellig,
  sumPartnerZeitMinuten,
  tagesspanneMinuten,
  zeitMinutenFromStdMin,
} from '../src/lib/auftraege/position-lebenszyklus.ts'

assert.equal(zeitMinutenFromStdMin(1, 30), 90)
assert.equal(formatZeitMinuten(90), '1 Std 30 Min')
assert.equal(
  isDokuUeberfaellig({
    leistungStatus: 'in_arbeit',
    gestartetAm: new Date(Date.now() - 25 * 3600_000).toISOString(),
    letzterEintragAt: null,
  }),
  true
)
assert.equal(
  isDokuUeberfaellig({
    leistungStatus: 'in_arbeit',
    gestartetAm: new Date(Date.now() - 2 * 3600_000).toISOString(),
    letzterEintragAt: null,
  }),
  false
)
assert.equal(
  sumPartnerZeitMinuten([
    {
      id: '1',
      position_id: 'p',
      typ: 'fortschritt',
      erfasst_von: 'partner_app',
      zeit_minuten: 45,
    },
    {
      id: '2',
      position_id: 'p',
      typ: 'ergebnis',
      erfasst_von: 'crm_intern',
      zeit_minuten: 15,
    },
  ]),
  60
)
assert.equal(
  tagesspanneMinuten('2026-07-22T08:00:00.000Z', '2026-07-22T10:30:00.000Z'),
  150
)
console.log('OK TC-15 helpers position-lebenszyklus')
