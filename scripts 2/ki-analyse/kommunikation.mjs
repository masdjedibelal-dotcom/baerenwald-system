#!/usr/bin/env node
import { loadEnvLocal, createAdminClient } from './lib.mjs'
import { computeAndSaveKommunikation } from './kommunikation-core.mjs'

loadEnvLocal()

const supabase = createAdminClient()
const result = await computeAndSaveKommunikation(supabase)

console.log('✓ Kommunikation & Nachrichten')
console.log(`  E-Mails: ${result.ergebnis?.zusammenfassung?.emails_gesamt ?? 0}`)
console.log(`  Timeline: ${result.ergebnis?.zusammenfassung?.timeline_gesamt ?? 0}`)
