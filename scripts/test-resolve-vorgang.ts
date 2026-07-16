/**
 * Automatisierte Tests: 6 kanonische resolveVorgang()-Fixtures.
 * Aufruf: npx --yes tsx scripts/test-resolve-vorgang.ts
 */
import { resolveVorgang } from '../src/lib/vorgang/resolve-vorgang'
import { RESOLVE_VORGANG_FIXTURES } from '../src/lib/vorgang/fixtures'
import type { ResolveVorgangInput, ResolvedVorgang } from '../src/lib/vorgang/types'

function assertEq(label: string, actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`${label}: erwartet ${JSON.stringify(expected)}, erhalten ${JSON.stringify(actual)}`)
  }
}

function checkFixture(
  id: string,
  input: ResolveVorgangInput,
  expect: {
    phase: string
    unterstatus: string
    needsAction: boolean
    actor: string | null
    notfall?: boolean
    wartet_freigabe?: boolean
    ueberfaellig?: boolean
  }
) {
  const out: ResolvedVorgang = resolveVorgang(input)

  assertEq(`${id}.phase`, out.phase, expect.phase)
  assertEq(`${id}.unterstatus`, out.unterstatus, expect.unterstatus)
  assertEq(`${id}.needsAction`, out.needsAction, expect.needsAction)
  assertEq(`${id}.actor`, out.actor, expect.actor)

  if (expect.notfall != null) {
    assertEq(`${id}.badges.notfall`, Boolean(out.badges.notfall), expect.notfall)
  }
  if (expect.wartet_freigabe != null) {
    assertEq(
      `${id}.badges.wartet_freigabe`,
      Boolean(out.badges.wartet_freigabe),
      expect.wartet_freigabe
    )
  }
  if (expect.ueberfaellig != null) {
    assertEq(`${id}.ueberfaellig`, out.ueberfaellig, expect.ueberfaellig)
  }

  // Output-Shape (kanonischer TS-Typ ResolvedVorgang)
  const requiredKeys: (keyof ResolvedVorgang)[] = [
    'phase',
    'unterstatus',
    'unterstatusLabel',
    'needsAction',
    'actor',
    'badges',
    'ueberfaellig',
    'kanalMeta',
    'titel',
    'entityId',
    'entityType',
    'updatedAt',
  ]
  for (const k of requiredKeys) {
    if (!(k in out)) throw new Error(`${id}: Output-Shape fehlt Feld ${k}`)
  }
}

function main() {
  if (RESOLVE_VORGANG_FIXTURES.length !== 6) {
    throw new Error(`Erwartet 6 Fixtures, gefunden ${RESOLVE_VORGANG_FIXTURES.length}`)
  }

  let failed = 0
  for (const fx of RESOLVE_VORGANG_FIXTURES) {
    try {
      checkFixture(fx.id, fx.input, fx.expect)
      console.log(`OK  ${fx.id}`)
    } catch (e) {
      failed++
      console.error(`FAIL ${fx.id}`)
      console.error(e instanceof Error ? e.message : e)
    }
  }

  if (failed) {
    console.error(`\n${failed}/${RESOLVE_VORGANG_FIXTURES.length} fehlgeschlagen`)
    process.exit(1)
  }
  console.log(`\nAlle ${RESOLVE_VORGANG_FIXTURES.length} Resolver-Fixtures grün.`)
}

main()
