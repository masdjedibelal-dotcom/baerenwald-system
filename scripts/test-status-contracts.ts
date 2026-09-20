/**
 * P2-6 Vertrags-Tests: Status-Übergänge über write-*-Planner (ohne DB).
 * Aufruf: npx --yes tsx scripts/test-status-contracts.ts
 */
import {
  planHvFreigabeWrite,
  planLeadStatusWrite,
  canStornoLead,
} from '../src/lib/status/write-lead-status'
import {
  planPartnerAnnahmeWrite,
  planAngebotStatusWrite,
  canStornoAngebot,
} from '../src/lib/status/write-angebot-status'
import {
  planAbnahmeWrite,
  planAuftragStatusWrite,
  canStornoAuftrag,
} from '../src/lib/status/write-auftrag-status'
import {
  planRechnungBezahltWrite,
  planRechnungStornoWrite,
  canStornoRechnung,
} from '../src/lib/status/write-rechnung-status'
import { statusCrmLabel, statusPortalLabel } from '../src/lib/status/status-vokabular'

const fixedNow = new Date('2026-06-15T12:00:00.000Z')

function assertEq(label: string, actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`${label}: erwartet ${JSON.stringify(expected)}, erhalten ${JSON.stringify(actual)}`)
  }
}

function assertThrows(label: string, fn: () => void) {
  try {
    fn()
  } catch {
    return
  }
  throw new Error(`${label}: erwartete Exception blieb aus`)
}

function testHvFreigabe() {
  const patch = planHvFreigabeWrite('freigegeben', {}, fixedNow)
  assertEq('hv.org_freigabe_status', patch.org_freigabe_status, 'freigegeben')
  assertEq('hv.updated_at', patch.updated_at, fixedNow.toISOString())
  assertThrows('hv.invalid', () => planHvFreigabeWrite('xyz'))
  console.log('OK  HV-Freigabe')
}

function testPartnerAnnahme() {
  const patch = planPartnerAnnahmeWrite('handwerker_akzeptiert', {}, fixedNow)
  assertEq('partner.status', patch.status, 'handwerker_akzeptiert')
  assertEq('partner.label', statusCrmLabel('angebot', 'handwerker_akzeptiert'), 'Angenommen')
  assertEq('partner.portalLabel', statusPortalLabel('partner', 'akzeptiert'), 'Angenommen')
  const einfach = planAngebotStatusWrite('angenommen', {}, fixedNow)
  assertEq('partner.angenommen', einfach.status, 'angenommen')
  console.log('OK  Partner-Annahme')
}

function testAbnahme() {
  const patch = planAbnahmeWrite({}, fixedNow)
  assertEq('abnahme.status', patch.status, 'abnahme')
  assertEq('abnahme.label', statusCrmLabel('auftrag', 'abnahme'), 'Abnahme')
  assertThrows('abnahme.invalid', () => planAuftragStatusWrite('fertig'))
  console.log('OK  Abnahme')
}

function testRechnungBezahlt() {
  const patch = planRechnungBezahltWrite({}, fixedNow)
  assertEq('re.bezahlt', patch.status, 'bezahlt')
  assertEq('re.label', statusCrmLabel('rechnung', 'bezahlt'), 'Bezahlt')
  console.log('OK  Rechnung bezahlt')
}

function testStorno() {
  assertEq('storno.lead', canStornoLead('angebot'), true)
  assertEq('storno.lead.already', canStornoLead('storniert'), false)
  assertEq('storno.angebot', canStornoAngebot('gesendet'), true)
  assertEq('storno.auftrag', canStornoAuftrag('offen'), true)
  assertEq('storno.rechnung', canStornoRechnung('gesendet'), true)

  const lead = planLeadStatusWrite('storniert', {}, fixedNow)
  assertEq('storno.lead.patch', lead.status, 'storniert')
  const angebot = planAngebotStatusWrite('storniert', {}, fixedNow)
  assertEq('storno.angebot.patch', angebot.status, 'storniert')
  const auftrag = planAuftragStatusWrite('storniert', {}, fixedNow)
  assertEq('storno.auftrag.patch', auftrag.status, 'storniert')
  const re = planRechnungStornoWrite({}, fixedNow)
  assertEq('storno.re.patch', re.status, 'storniert')
  console.log('OK  Storno')
}

function main() {
  const tests = [testHvFreigabe, testPartnerAnnahme, testAbnahme, testRechnungBezahlt, testStorno]
  let failed = 0
  for (const t of tests) {
    try {
      t()
    } catch (e) {
      failed++
      console.error(`FAIL ${t.name}`)
      console.error(e instanceof Error ? e.message : e)
    }
  }
  if (failed) {
    console.error(`\n${failed}/${tests.length} Vertrags-Tests fehlgeschlagen`)
    process.exit(1)
  }
  console.log(`\nAlle ${tests.length} Status-Vertrags-Tests grün.`)
}

main()
