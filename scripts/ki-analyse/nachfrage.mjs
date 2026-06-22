#!/usr/bin/env node
import { loadEnvLocal, createAdminClient, num, median, plzRegion } from './lib.mjs'
import { computeAndSaveNachfrage } from './nachfrage-core.mjs'

loadEnvLocal()

const supabase = createAdminClient()
const result = await computeAndSaveNachfrage(supabase, { num, median, plzRegion })

console.log('✓ Nachfrage & Rechner')
console.log(`  Anfragen: ${result.sample_size}`)
console.log(`  PLZ-Regionen: ${result.ergebnis?.plz_regionen?.length ?? 0}`)
