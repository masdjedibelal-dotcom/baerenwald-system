#!/usr/bin/env node
import { loadEnvLocal, createAdminClient, num, plzRegion } from './lib.mjs'
import { computeAndSaveHandwerkerRanking } from './handwerker-core.mjs'

loadEnvLocal()

const supabase = createAdminClient()
const result = await computeAndSaveHandwerkerRanking(supabase, { num, plzRegion })

console.log('✓ Handwerker Routing')
console.log(`  Stichprobe: ${result.sample_size} Leistungen/Zuweisungen`)
console.log(`  Zeilen: ${result.ergebnis?.zeilen?.length ?? 0}`)
console.log(`  Generiert: ${result.generiert_am}`)
