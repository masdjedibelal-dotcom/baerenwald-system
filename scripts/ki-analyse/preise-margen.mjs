#!/usr/bin/env node
import { loadEnvLocal, createAdminClient, num, median, plzRegion } from './lib.mjs'
import { computeAndSavePreiseMargen } from './preise-margen-core.mjs'

loadEnvLocal()

const supabase = createAdminClient()
const result = await computeAndSavePreiseMargen(supabase, { num, median, plzRegion })

console.log('✓ Preise & Margen')
console.log(`  Stichprobe: ${result.sample_size} Aufträge`)
console.log(`  Zeilen: ${result.ergebnis?.zeilen?.length ?? 0}`)
console.log(`  Generiert: ${result.generiert_am}`)
