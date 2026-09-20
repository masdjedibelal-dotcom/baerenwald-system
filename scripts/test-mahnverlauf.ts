/**
 * Regression: Zahlungserinnerungen — Anker Versand + kein Doppel an Folgetagen.
 * Run: npx --yes tsx scripts/test-mahnverlauf.ts
 */
import assert from 'node:assert/strict'
import {
  cronMahnungFuerRechnung,
  mahnAnkerYmd,
  MAHNUNG_MIN_TAGE_ZWISCHEN_ERINNERUNGEN,
  tageSeitMahnAnker,
} from '../src/lib/rechnungen/mahnverlauf'

function fail(msg: string): never {
  console.error('FAIL:', msg)
  process.exit(1)
}

// König-Fall: Versand Fr 18.9., faellig = Versandtag, Cron Sa + So
{
  const gesendet = '2026-09-18T00:24:42.53Z'
  const faellig = '2026-09-18'
  assert.equal(mahnAnkerYmd(faellig, gesendet), '2026-09-18')

  // Sa 19.9.: Anker+1 → Stufe1 erlaubt (ohne Mail-Historie)
  assert.equal(
    cronMahnungFuerRechnung(
      {
        faellig_am: faellig,
        gesendet_at: gesendet,
        erinnerung_7_sent_at: null,
        erinnerung_21_sent_at: null,
        intern_warnung_30_at: null,
      },
      '2026-09-19'
    ),
    'stufe1',
    'Sa nach Versand: Stufe1'
  )

  // So 20.9.: Mail-Log von Sa → KEIN erneutes Stufe1 (Gap < 2)
  assert.equal(
    cronMahnungFuerRechnung(
      {
        faellig_am: faellig,
        gesendet_at: gesendet,
        erinnerung_7_sent_at: null, // Timestamp fehlt (Bug vorher)
        erinnerung_21_sent_at: null,
        intern_warnung_30_at: null,
        letzteErinnerungMailAt: '2026-09-19T00:01:01Z',
        hatStufe1Mail: true,
      },
      '2026-09-20'
    ),
    null,
    'So nach Sa-Mail: kein Doppel'
  )

  // Mit gesetztem Timestamp ebenfalls blockiert
  assert.equal(
    cronMahnungFuerRechnung(
      {
        faellig_am: faellig,
        gesendet_at: gesendet,
        erinnerung_7_sent_at: '2026-09-19T00:01:01Z',
        erinnerung_21_sent_at: null,
        intern_warnung_30_at: null,
      },
      '2026-09-20'
    ),
    null,
    'So Gap nach Stufe1-Timestamp'
  )
}

// Stufe2 erst nach 7 Tagen
{
  assert.equal(
    cronMahnungFuerRechnung(
      {
        faellig_am: '2026-09-01',
        gesendet_at: '2026-09-01T12:00:00Z',
        erinnerung_7_sent_at: '2026-09-02T00:00:00Z',
        erinnerung_21_sent_at: null,
        intern_warnung_30_at: null,
      },
      '2026-09-08'
    ),
    null,
    '6 Tage nach Stufe1: noch keine Stufe2'
  )
  assert.equal(
    cronMahnungFuerRechnung(
      {
        faellig_am: '2026-09-01',
        gesendet_at: '2026-09-01T12:00:00Z',
        erinnerung_7_sent_at: '2026-09-02T00:00:00Z',
        erinnerung_21_sent_at: null,
        intern_warnung_30_at: null,
      },
      '2026-09-09'
    ),
    'stufe2',
    '7 Tage nach Stufe1: Stufe2'
  )
}

// Fälligkeit vor Versand → Anker = Versand
{
  assert.equal(mahnAnkerYmd('2026-09-10', '2026-09-18T10:00:00Z'), '2026-09-18')
  assert.equal(tageSeitMahnAnker('2026-09-10', '2026-09-18T10:00:00Z', '2026-09-18'), 0)
  assert.equal(
    cronMahnungFuerRechnung(
      {
        faellig_am: '2026-09-10',
        gesendet_at: '2026-09-18T10:00:00Z',
        erinnerung_7_sent_at: null,
        erinnerung_21_sent_at: null,
        intern_warnung_30_at: null,
      },
      '2026-09-18'
    ),
    null,
    'Am Versandtag keine Erinnerung trotz alter Fälligkeit'
  )
}

assert.equal(MAHNUNG_MIN_TAGE_ZWISCHEN_ERINNERUNGEN, 2)

console.log('OK test-mahnverlauf')
