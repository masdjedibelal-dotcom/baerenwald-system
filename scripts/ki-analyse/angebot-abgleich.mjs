#!/usr/bin/env node
import { loadEnvLocal, createAdminClient, num } from './lib.mjs'
import { computeAndSaveAngebotAbgleich } from './angebot-abgleich-core.mjs'

loadEnvLocal()

const supabase = createAdminClient()
const result = await computeAndSaveAngebotAbgleich(supabase, { num })

console.log('✓ Anfrage → Angebot')
console.log(`  Verglichen: ${result.sample_size} Leads`)
console.log(`  Conversion: ${result.ergebnis?.funnel?.conversion_prozent ?? '—'} %`)
