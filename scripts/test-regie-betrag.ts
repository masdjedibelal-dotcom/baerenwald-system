/**
 * Einheitentests: shared-domain/regie-betrag (rein, ohne DB).
 * Aufruf: npx --yes tsx scripts/test-regie-betrag.ts
 */
import {
  positionBetrag,
  regieBetragKunde,
  regieBetragPartner,
  regieMengeStunden,
  roundBetrag2,
  summeBetraege,
} from '../src/lib/shared-domain/regie-betrag'

function assertEq(label: string, actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(
      `${label}: erwartet ${JSON.stringify(expected)}, erhalten ${JSON.stringify(actual)}`
    )
  }
}

function testMenge() {
  // erfasste Zeit statt Schätzung
  assertEq('menge.erfasst', regieMengeStunden(600, 99), 10)
  assertEq('menge.95min', regieMengeStunden(95, 10), 1.58)
  // keine Erfassung → Schätzung
  assertEq('menge.schaetzung', regieMengeStunden(0, 4.5), 4.5)
  assertEq('menge.schaetzung.nullMin', regieMengeStunden(null, 3), 3)
  // sonst 1
  assertEq('menge.fallback1', regieMengeStunden(0, 0), 1)
  assertEq('menge.fallback1.leer', regieMengeStunden(null, null), 1)
  console.log('OK  regieMengeStunden')
}

function testPartnerKunde() {
  assertEq('partner.10x75.5', regieBetragPartner(10, 75.5), 755)
  assertEq('partner.menge0', regieBetragPartner(0, 75.5), 0)
  assertEq('partner.satz0', regieBetragPartner(10, 0), 0)

  // leerer Kundensatz → Partnersatz
  assertEq('kunde.fallback', regieBetragKunde(10, null, 75.5), 755)
  assertEq('kunde.leer0', regieBetragKunde(10, 0, 75.5), 755)
  assertEq('kunde.eigen', regieBetragKunde(10, 90, 75.5), 900)
  console.log('OK  regieBetragPartner/Kunde')
}

function testPositionUndSumme() {
  const regie = {
    typ: 'regie',
    verguetung: 'aufwand',
    erfasst_minuten: 600,
    stundensatz: 75.5,
    stundensatz_kunde: 90,
    geschaetzt_std: 8,
  }
  assertEq('pos.partner', positionBetrag(regie, 'partner'), 755)
  assertEq('pos.kunde', positionBetrag(regie, 'kunde'), 900)

  // Altdaten ohne Kundensatz
  assertEq(
    'pos.kunde.fallback',
    positionBetrag({ ...regie, stundensatz_kunde: null }, 'kunde'),
    755
  )

  // Pauschale
  assertEq(
    'pauschal.kunde',
    positionBetrag({ typ: 'lv', preis_fix: 1200.5, preis_partner: 800 }, 'kunde'),
    1200.5
  )
  assertEq(
    'pauschal.partner',
    positionBetrag({ typ: 'lv', preis_fix: 1200.5, preis_partner: 800 }, 'partner'),
    800
  )

  // Summe = Summe der Zeilen (kein Extra-Runden)
  const sum = summeBetraege(
    [
      { typ: 'regie', erfasst_minuten: 600, stundensatz: 75.5 },
      { typ: 'lv', preis_fix: 100, preis_partner: 50 },
    ],
    'kunde'
  )
  assertEq('summe.kunde', sum, 855)

  // Identität zur bisherigen Rechnungsformel: menge gerundet, dann × Satz
  const menge95 = regieMengeStunden(95, null)
  assertEq('ident.menge95', menge95, 1.58)
  assertEq(
    'ident.betrag95',
    roundBetrag2(regieBetragPartner(menge95, 75.5)),
    Math.round(1.58 * 75.5 * 100) / 100
  )
  console.log('OK  positionBetrag / summeBetraege')
}

function main() {
  testMenge()
  testPartnerKunde()
  testPositionUndSumme()
  console.log('Alle Regie-Betrag-Tests grün.')
}

main()
