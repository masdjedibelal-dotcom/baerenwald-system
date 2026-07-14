import type { ResolveVorgangInput } from '@/lib/vorgang/types'
import shared from '../../../shared/crm-vorgang/resolve-vorgang.fixtures.json'

export type ResolveVorgangFixture = {
  id: string
  input: ResolveVorgangInput
  expect: {
    phase: string
    unterstatus: string
    needsAction: boolean
    actor: string | null
    notfall?: boolean
    wartet_freigabe?: boolean
    ueberfaellig?: boolean
  }
}

/** Kanonische Fixtures — Single Source: `shared/crm-vorgang/resolve-vorgang.fixtures.json` */
export const RESOLVE_VORGANG_FIXTURES = shared.fixtures as ResolveVorgangFixture[]
