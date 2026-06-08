#!/usr/bin/env node
import { loadEnvLocal, createAdminClient, num, median, plzRegion } from './lib.mjs'
import { computeAndSaveProduktePakete } from './produkte-core.mjs'

loadEnvLocal()

const supabase = createAdminClient()
const result = await computeAndSaveProduktePakete(supabase, { num, median, plzRegion })

console.log('✓ Produkte & Leistungen')
console.log(`  Stichprobe: ${result.sample_size} Auftrags-Gewerk-Blöcke`)
console.log(`  Gewerke: ${result.ergebnis?.zeilen?.length ?? 0}`)
console.log(`  Generiert: ${result.generiert_am}`)
