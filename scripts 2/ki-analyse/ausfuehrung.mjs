#!/usr/bin/env node
import { loadEnvLocal, createAdminClient, num, plzRegion } from './lib.mjs'
import { computeAndSaveAusfuehrung } from './ausfuehrung-core.mjs'

loadEnvLocal()

const supabase = createAdminClient()
const result = await computeAndSaveAusfuehrung(supabase, { num, plzRegion })

console.log('✓ Ausführung Eigen & Fremd')
console.log(`  Positionen: ${result.sample_size}`)
console.log(`  Quelle: ${result.ergebnis?.quelle ?? '—'}`)
