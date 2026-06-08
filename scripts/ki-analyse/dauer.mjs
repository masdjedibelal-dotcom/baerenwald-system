#!/usr/bin/env node
import { loadEnvLocal, createAdminClient } from './lib.mjs'
import { computeAndSaveDauerBautagebuch } from './dauer-core.mjs'

loadEnvLocal()

const supabase = createAdminClient()
const result = await computeAndSaveDauerBautagebuch(supabase)

console.log('✓ Baustelle & Abnahme')
console.log(`  Stichprobe: ${result.sample_size}`)
console.log(`  Bautagebuch: ${result.ergebnis?.bautagebuch?.eintraege ?? 0}`)
console.log(`  Positions-Notizen: ${result.ergebnis?.positions_notizen?.eintraege ?? 0}`)
console.log(`  Abnahmeprotokolle: ${result.ergebnis?.abnahme?.protokolle ?? 0}`)
