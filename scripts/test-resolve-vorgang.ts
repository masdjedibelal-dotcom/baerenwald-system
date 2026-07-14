import { resolveVorgang } from '@/lib/vorgang/resolve-vorgang'
import { RESOLVE_VORGANG_FIXTURES } from '@/lib/vorgang/fixtures'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

function run() {
  let passed = 0
  for (const fx of RESOLVE_VORGANG_FIXTURES) {
    const r = resolveVorgang(fx.input)
    const e = fx.expect
    try {
      assert(r.phase === e.phase, `${fx.id}: phase ${r.phase} !== ${e.phase}`)
      assert(r.unterstatus === e.unterstatus, `${fx.id}: unterstatus ${r.unterstatus} !== ${e.unterstatus}`)
      assert(r.needsAction === e.needsAction, `${fx.id}: needsAction ${r.needsAction} !== ${e.needsAction}`)
      assert(r.actor === e.actor, `${fx.id}: actor ${r.actor} !== ${e.actor}`)
      if (e.notfall !== undefined) {
        assert(!!r.badges.notfall === e.notfall, `${fx.id}: notfall badge`)
      }
      if (e.wartet_freigabe !== undefined) {
        assert(!!r.badges.wartet_freigabe === e.wartet_freigabe, `${fx.id}: wartet_freigabe badge`)
      }
      if (e.ueberfaellig !== undefined) {
        assert(r.ueberfaellig === e.ueberfaellig, `${fx.id}: ueberfaellig ${r.ueberfaellig}`)
      }
      passed++
      console.log(`  ✓ ${fx.id}`)
    } catch (err) {
      console.error(`  ✗ ${fx.id}: ${err instanceof Error ? err.message : err}`)
      console.error('    got:', JSON.stringify(r, null, 2))
      process.exitCode = 1
      return
    }
  }
  console.log(`\n${passed}/${RESOLVE_VORGANG_FIXTURES.length} Fixtures grün`)
}

run()
