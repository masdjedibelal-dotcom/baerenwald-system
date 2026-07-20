#!/usr/bin/env node
import { loadEnvLocal, createAdminClient, num, median, daysBetween, plzRegion } from './lib.mjs'
import { computeAndSaveGewerkeAblauf } from './gewerke-core.mjs'

loadEnvLocal()

const supabase = createAdminClient()
const result = await computeAndSaveGewerkeAblauf(supabase, { num, median, daysBetween, plzRegion })

console.log('✓ Auftragsablauf je Gewerk')
console.log(`  Stichprobe: ${result.sample_size} Auftrags-Gewerk-Blöcke`)
console.log(`  Gewerke: ${result.ergebnis?.zeilen?.length ?? 0}`)
console.log(`  Generiert: ${result.generiert_am}`)
