#!/usr/bin/env node
/**
 * Claude-Auswertung: liest ki_cluster_analysen (SQL-Ergebnis) und schreibt narrative.
 *
 * Aufruf:
 *   npm run ki:analyse:claude
 *   npm run ki:analyse:claude -- preise_margen
 */
import { loadEnvLocal, createAdminClient } from './lib.mjs'
import { claudeText } from './claude-client.mjs'

loadEnvLocal()

const SYSTEM = `Du bist der Analyse-Assistent für Bärenwald München — ein digitaler Generalunternehmer für Handwerk.

Du erhältst strukturierte CRM-Auswertungen aus Supabase (aggregierte Zahlen, keine personenbezogenen Kundendaten).

Aufgabe:
- Schreibe auf Deutsch, 4–8 Sätze, konkret und operativ
- Nenne relevante Zahlen aus den Daten
- Sage, was das für Angebots-Erstellung, Festpreise, Handwerker-Routing und Koordination bedeutet
- Wenn die Datenbasis dünn ist, sage das ehrlich und was noch fehlt
- Keine Floskeln, kein Marketing-Sprech`

const BEREICH_PROMPTS = {
  preise_margen: 'Fokus: Preisrahmen, Margen, regionale Unterschiede, Festpreis-Potenzial.',
  handwerker: 'Fokus: Welche Handwerker je Gewerk empfehlenswert sind, Risiken (niedriger Score), Routing.',
  gewerke: 'Fokus: Ablauf, Phasen, Dauer, EK/VK/Marge je Gewerk — für Planung und Handwerker-Anweisungen.',
  produkte:
    'Fokus: Standardpakete, Leistungs-Kombinationen, Angebots-Ablauf-Text, Koordination Eigen vs. Fremd.',
}

function compressErgebnis(bereich, ergebnis) {
  const e = { ...ergebnis }
  if (Array.isArray(e.zeilen)) {
    e.zeilen = e.zeilen.slice(0, 12)
    if (bereich === 'produkte') {
      e.zeilen = e.zeilen.map((z) => ({
        ...z,
        standardpakete: z.standardpakete?.slice(0, 3),
        kombinationen: z.kombinationen?.slice(0, 4),
      }))
    }
  }
  if (Array.isArray(e.top_je_gewerk)) {
    e.top_je_gewerk = e.top_je_gewerk.slice(0, 8)
  }
  return e
}

const filterBereich = process.argv[2]?.trim()
const supabase = createAdminClient()

let query = supabase.from('ki_cluster_analysen').select('*').order('bereich')
if (filterBereich) query = query.eq('bereich', filterBereich)

const { data: rows, error } = await query
if (error) throw new Error(error.message)

if (!rows?.length) {
  console.log('Keine Analysen in ki_cluster_analysen. Zuerst: npm run ki:analyse:all')
  process.exit(0)
}

let ok = 0
let failed = 0

for (const row of rows) {
  const fokus = BEREICH_PROMPTS[row.bereich] ?? 'Allgemeine operative Einordnung.'
  const payload = {
    bereich: row.bereich,
    titel: row.titel,
    sample_size: row.sample_size,
    quellen: row.ergebnis?.quellen ?? null,
    daten: compressErgebnis(row.bereich, row.ergebnis),
  }

  const user = `${fokus}

Analyse-Typ: ${row.bereich}
Titel: ${row.titel}

Strukturierte Daten (JSON):
${JSON.stringify(payload, null, 2)}

Schreibe die Auswertung als Fließtext für das KI-Dashboard.`

  try {
    process.stdout.write(`→ Claude: ${row.bereich} … `)
    const narrative = await claudeText({ system: SYSTEM, user, maxTokens: 700 })

    const { error: upErr } = await supabase
      .from('ki_cluster_analysen')
      .update({ narrative, updated_at: new Date().toISOString() })
      .eq('id', row.id)

    if (upErr) throw new Error(upErr.message)
    console.log('✓')
    ok += 1
    await new Promise((r) => setTimeout(r, 400))
  } catch (err) {
    console.log('✗')
    console.error(`  ${err instanceof Error ? err.message : err}`)
    failed += 1
  }
}

console.log(`\nFertig: ${ok}/${rows.length} KI-Auswertungen`)
if (failed > 0) process.exitCode = 1
