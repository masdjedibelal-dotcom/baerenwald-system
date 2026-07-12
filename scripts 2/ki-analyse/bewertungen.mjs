#!/usr/bin/env node
import { loadEnvLocal, createAdminClient } from './lib.mjs'
import { computeAndSaveBewertungen } from './bewertungen-core.mjs'

loadEnvLocal()

const supabase = createAdminClient()
const result = await computeAndSaveBewertungen(supabase)

console.log('✓ Handwerker-Bewertungen')
console.log(`  Stichprobe: ${result.sample_size}`)
console.log(`  Zeilen: ${result.ergebnis?.zeilen?.length ?? 0}`)
