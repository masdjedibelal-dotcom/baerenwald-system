#!/usr/bin/env node
/**
 * Claude-Auswertung: liest ki_cluster_analysen (SQL-Ergebnis) und schreibt narrative.
 */
import { pathToFileURL } from 'url'
import { loadEnvLocal, createAdminClient } from './lib.mjs'
import { claudeText } from './claude-client.mjs'

const SYSTEM = `Du bist der Analyse-Assistent für Bärenwald München — ein digitaler Generalunternehmer für Handwerk.

Du erhältst strukturierte CRM-Auswertungen aus Supabase (aggregierte Zahlen, keine personenbezogenen Kundendaten).

Aufgabe:
- Schreibe auf Deutsch, 4–8 Sätze, konkret und operativ
- Nenne relevante Zahlen aus den Daten
- Sage, was das für Angebots-Erstellung, Festpreise, Handwerker-Routing und Koordination bedeutet
- Wenn die Datenbasis dünn ist, sage das ehrlich und was noch fehlt
- Keine Floskeln, kein Marketing-Sprech`

const BEREICH_PROMPTS = {
  funnel:
    'Fokus: Gesamt-Funnel Anfrage → Angebot → Auftrag → Abschluss. Conversion-Raten, Zykluszeiten (Median-Tage), wo Leads abbrechen, SLA-Empfehlungen für Vertrieb.',
  nachfrage:
    'Fokus: Welche Vorhaben aus welcher PLZ-Region kommen, Rechner-Leistungen, Kanäle, typische Budgets.',
  kommunikation:
    'Fokus: Wie viele Nachrichten je Typ und Kontext (Anfrage/Angebot/Auftrag), gesendet vs. empfangen, Timeline-Aktivität — was bedeutet das für Kundenservice-Kapazität und Follow-up?',
  angebot_abgleich:
    'Fokus: Was Kunden in der Anfrage/Rechner angeben vs. was im Angebot landet — ergänzte/entfernte Gewerke und Leistungen, Preisabweichung.',
  preise_margen: 'Fokus: Preisrahmen, Margen, regionale Unterschiede, Festpreis-Potenzial.',
  handwerker: 'Fokus: Welche Handwerker je Gewerk empfehlenswert sind, Risiken (niedriger Score), Routing.',
  gewerke: 'Fokus: Ablauf, Phasen, Dauer, EK/VK/Marge je Gewerk — für Planung und Handwerker-Anweisungen.',
  ausfuehrung:
    'Fokus: Eigenbetrieb vs. Fremdleistung, Margen je Gewerk, welche Leistungen intern vs. Partner, Routing-Empfehlungen.',
  dauer:
    'Fokus: Baustelle & Abnahme — Bautagebuch, Positions-Notizen, Abnahme-Mängel, Dauer. Was wiederkehrt, welche Checklisten/To-Dos je Gewerk sinnvoll sind.',
  bewertungen:
    'Fokus: Handwerker-Qualität nach Projektabschluss, Schwächen (Termin, Kommunikation), wem man welches Gewerk geben sollte.',
  produkte:
    'Fokus: Standardpakete, Leistungs-Kombinationen, Angebots-Ablauf-Text, Koordination Eigen vs. Fremd.',
}

function compressErgebnis(bereich, ergebnis) {
  const e = { ...ergebnis }
  if (bereich === 'nachfrage') {
    for (const key of ['plz_regionen', 'bereiche', 'rechner_leistungen', 'situationen', 'kanaele']) {
      if (Array.isArray(e[key])) e[key] = e[key].slice(0, 8)
    }
  }
  if (bereich === 'kommunikation') {
    for (const key of ['email_nach_typ', 'email_nach_kontext', 'timeline_nach_typ']) {
      if (Array.isArray(e[key])) e[key] = e[key].slice(0, 8)
    }
  }
  if (bereich === 'ausfuehrung') {
    if (Array.isArray(e.je_gewerk)) e.je_gewerk = e.je_gewerk.slice(0, 8)
    if (Array.isArray(e.eigen_leistungen)) e.eigen_leistungen = e.eigen_leistungen.slice(0, 8)
    if (Array.isArray(e.fremd_handwerker)) e.fremd_handwerker = e.fremd_handwerker.slice(0, 6)
  }
  if (bereich === 'dauer') {
    if (Array.isArray(e.kontext_snippets)) e.kontext_snippets = e.kontext_snippets.slice(0, 8)
    if (e.abnahme?.haeufige_maengel) e.abnahme.haeufige_maengel = e.abnahme.haeufige_maengel.slice(0, 8)
    if (e.bautagebuch?.snippets) e.bautagebuch.snippets = e.bautagebuch.snippets.slice(0, 4)
    if (e.positions_notizen?.snippets) e.positions_notizen.snippets = e.positions_notizen.snippets.slice(0, 4)
    if (e.abnahme?.snippets) e.abnahme.snippets = e.abnahme.snippets.slice(0, 4)
  }
  if (bereich === 'bewertungen' && Array.isArray(e.zeilen)) {
    e.zeilen = e.zeilen.slice(0, 10)
  }
  if (bereich === 'angebot_abgleich' && e.abweichungen) {
    for (const key of Object.keys(e.abweichungen)) {
      if (Array.isArray(e.abweichungen[key])) e.abweichungen[key] = e.abweichungen[key].slice(0, 6)
    }
  }
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

/**
 * @param {{ supabase?: import('@supabase/supabase-js').SupabaseClient, filterBereich?: string, log?: boolean }} opts
 */
export async function runClaudeAuswertung({ supabase, filterBereich, log = false } = {}) {
  const client = supabase ?? createAdminClient()

  let query = client.from('ki_cluster_analysen').select('*').order('bereich')
  if (filterBereich) query = query.eq('bereich', filterBereich)

  const { data: rows, error } = await query
  if (error) throw new Error(error.message)

  if (!rows?.length) {
    if (log) console.log('Keine Analysen in ki_cluster_analysen.')
    return { ok: 0, failed: 0, total: 0 }
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
      if (log) process.stdout.write(`→ Claude: ${row.bereich} … `)
      const narrative = await claudeText({ system: SYSTEM, user, maxTokens: 700 })

      const { error: upErr } = await client
        .from('ki_cluster_analysen')
        .update({ narrative, updated_at: new Date().toISOString() })
        .eq('id', row.id)

      if (upErr) throw new Error(upErr.message)
      if (log) console.log('✓')
      ok += 1
      await new Promise((r) => setTimeout(r, 400))
    } catch (err) {
      if (log) {
        console.log('✗')
        console.error(`  ${err instanceof Error ? err.message : err}`)
      }
      failed += 1
    }
  }

  if (log) console.log(`\nFertig: ${ok}/${rows.length} KI-Auswertungen`)
  if (failed > 0) {
    throw new Error(`${failed} Claude-Auswertung(en) fehlgeschlagen`)
  }
  return { ok, failed, total: rows.length }
}

const isCli =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url

if (isCli) {
  loadEnvLocal()
  const filter = process.argv[2]?.trim()
  runClaudeAuswertung({ filterBereich: filter, log: true }).catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
}
