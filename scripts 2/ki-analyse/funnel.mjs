#!/usr/bin/env node
import { loadEnvLocal, createAdminClient } from './lib.mjs'
import { computeAndSaveFunnelOverview } from './funnel-core.mjs'

loadEnvLocal()

const supabase = createAdminClient()
const result = await computeAndSaveFunnelOverview(supabase)

console.log('✓ Gesamt-Funnel')
console.log(`  Anfragen: ${result.ergebnis?.kennzahlen?.leads_gesamt ?? 0}`)
console.log(`  Mit Angebot: ${result.ergebnis?.kennzahlen?.leads_mit_angebot ?? 0}`)
console.log(`  Aufträge: ${result.ergebnis?.kennzahlen?.auftraege_gesamt ?? 0}`)
const z = result.ergebnis?.zyklen?.anfrage_zu_angebot
if (z?.median_tage != null) console.log(`  Median Anfrage→Angebot: ${z.median_tage} T (n=${z.anzahl})`)
