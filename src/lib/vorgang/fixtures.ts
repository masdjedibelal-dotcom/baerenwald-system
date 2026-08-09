/**
 * A7: Fixtures für resolveVorgang-Parität (CRM ↔ Portal).
 * Quelle: shared/crm-vorgang/resolve-vorgang.fixtures.json (byte-gleich mit Build-Kopie hier).
 */
import fixturesJson from './resolve-vorgang.fixtures.json'
import type { ResolveVorgangInput } from '@/lib/vorgang/types'

export type ResolveVorgangFixtureExpect = {
  phase: string
  unterstatus: string
  needsAction: boolean
  actor: string | null
  notfall?: boolean
  wartet_freigabe?: boolean
  ueberfaellig?: boolean
}

export type ResolveVorgangFixture = {
  id: string
  input: ResolveVorgangInput
  expect: ResolveVorgangFixtureExpect
}

type FixturesFile = {
  version: string
  fixtures: ResolveVorgangFixture[]
}

const file = fixturesJson as FixturesFile

export const RESOLVE_VORGANG_FIXTURES_VERSION = file.version
export const RESOLVE_VORGANG_FIXTURES: ResolveVorgangFixture[] = file.fixtures
