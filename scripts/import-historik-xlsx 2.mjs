#!/usr/bin/env node
/**
 * Import: Baerenwald_CRM_Umsatz_Leistungsdaten.xlsx → ki_historische_* Tabellen
 *
 * Standardpfad: data/historik/Baerenwald_CRM_Umsatz_Leistungsdaten.xlsx (im Projekt)
 *
 * Usage:
 *   npm run import:historik
 *   node --env-file=.env.local scripts/import-historik-xlsx.mjs [optional/anderer-pfad.xlsx]
 */
import { existsSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { createAdminClient, loadEnvLocal } from './ki-analyse/lib.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CRM_ROOT = join(__dirname, '..')

/** Feste Projektdatei — nicht Downloads (kann fehlen) */
export const HISTORIK_XLSX_DEFAULT = join(
  CRM_ROOT,
  'data/historik/Baerenwald_CRM_Umsatz_Leistungsdaten.xlsx'
)

loadEnvLocal()

const xlsxPath = resolve(process.argv[2] ?? HISTORIK_XLSX_DEFAULT)

if (!existsSync(xlsxPath)) {
  console.error(`Datei nicht gefunden: ${xlsxPath}`)
  console.error('Usage: node --env-file=.env.local scripts/import-historik-xlsx.mjs [pfad.xlsx]')
  process.exit(1)
}

/** Minimal XLSX reader via Python openpyxl (kein npm xlsx nötig) */
async function parseXlsx(path) {
  const py = `
import json, sys
from pathlib import Path
import openpyxl

path = Path(sys.argv[1])
wb = openpyxl.load_workbook(path, read_only=True, data_only=True)

def sheet_rows(name):
    ws = wb[name]
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    headers = [str(h).strip() if h is not None else '' for h in rows[0]]
    out = []
    for row in rows[1:]:
        if all(c is None or str(c).strip() == '' for c in row):
            continue
        d = {}
        for i, h in enumerate(headers):
            if h and i < len(row):
                v = row[i]
                if hasattr(v, 'isoformat'):
                    v = v.isoformat()
                d[h] = v
        if d:
            out.append(d)
    return out

data = {
  'Vorgaenge': sheet_rows('Vorgaenge'),
  'Leistungspositionen': sheet_rows('Leistungspositionen'),
  'CRM_Struktur': sheet_rows('CRM_Struktur'),
}
wb.close()
print(json.dumps(data, ensure_ascii=False, default=str))
`
  const { spawnSync } = await import('child_process')
  const result = spawnSync('python3', ['-c', py, path], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
  if (result.status !== 0) {
    throw new Error(result.stderr || 'Python/openpyxl Fehler — pip install openpyxl')
  }
  return JSON.parse(result.stdout)
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function str(v) {
  if (v == null) return null
  const s = String(v).trim()
  return s || null
}

const BATCH = `excel-${new Date().toISOString().slice(0, 10)}`

console.log(`Lese ${xlsxPath} …`)
const sheets = await parseXlsx(xlsxPath)
const vorgaenge = sheets.Vorgaenge ?? []
const positionen = sheets.Leistungspositionen ?? []
const katalog = sheets.CRM_Struktur ?? []

console.log(`  Vorgänge: ${vorgaenge.length}, Positionen: ${positionen.length}, Katalog: ${katalog.length}`)

const supabase = createAdminClient()

// Vorgänge upsert
const vorgRows = vorgaenge.map((r) => ({
  dokument_nr: str(r.Dokument),
  dokumenttyp: str(r.Dokumenttyp) ?? 'Unbekannt',
  status: str(r.Status) ?? 'unbekannt',
  kundennr: str(r.Kundennr),
  kunde_name: str(r['Firma/Kunde']),
  objekt_adresse: str(r['Objekt/Adresse']),
  gewerk: str(r.Gewerk) ?? 'Sonstiges',
  taetigkeit: str(r['Tätigkeit / Vorgang']),
  netto: num(r.Netto_Umsatz),
  mwst: num(r.MwSt),
  brutto: num(r.Brutto_Umsatz),
  berechnung: str(r['Berechnung / Abrechnung']),
  hinweis: str(r['Hinweis für Programmierer']),
  import_batch: BATCH,
})).filter((r) => r.dokument_nr)

const { error: vErr } = await supabase.from('ki_historische_vorgaenge').upsert(vorgRows, { onConflict: 'dokument_nr' })
if (vErr) throw new Error(`ki_historische_vorgaenge: ${vErr.message}`)
console.log(`✓ ${vorgRows.length} Vorgänge importiert`)

// Positionen: alte des Batches ersetzen je dokument
const dokNrs = [...new Set(vorgRows.map((r) => r.dokument_nr))]
if (dokNrs.length) {
  await supabase.from('ki_historische_positionen').delete().in('dokument_nr', dokNrs)
}

const dokNrSet = new Set(vorgRows.map((r) => r.dokument_nr))

/** RE2030 in Excel-Positionen → aufgeteilte Vorgänge im Tab Vorgaenge */
function resolveDokumentNr(raw) {
  const d = str(raw)
  if (!d) return null
  if (dokNrSet.has(d)) return d
  if (d === 'RE2030') {
    if (dokNrSet.has('RE2030-Abschlag')) return 'RE2030-Abschlag'
    if (dokNrSet.has('RE2030-Rest')) return 'RE2030-Rest'
  }
  const base = d.replace(/-(Abschlag|Rest)$/i, '')
  if (dokNrSet.has(`${base}-Abschlag`)) return `${base}-Abschlag`
  return null
}

const posRows = []
const skippedPos = []
for (const r of positionen) {
  const dokument_nr = resolveDokumentNr(r.Dokument)
  if (!dokument_nr) {
    skippedPos.push(str(r.Dokument))
    continue
  }
  posRows.push({
    dokument_nr,
    gewerk: str(r.Gewerk),
    leistung: str(r['Tätigkeit / Artikel']) ?? 'Leistung',
    einheit: str(r.Einheit),
    menge: num(r.Menge),
    einzelpreis_netto: num(r.Einzelpreis_Netto),
    gesamt_netto: num(r.Gesamt_Netto),
    berechnung: str(r.Berechnung),
    kostenart: str(r['Kostenart/Leistungsart']),
    crm_modul: str(r.CRM_Modul),
    import_batch: BATCH,
  })
}

if (skippedPos.length) {
  console.warn(`  ⚠ ${skippedPos.length} Position(en) übersprungen (kein Vorgang): ${[...new Set(skippedPos)].join(', ')}`)
}

const CHUNK = 100
for (let i = 0; i < posRows.length; i += CHUNK) {
  const chunk = posRows.slice(i, i + CHUNK)
  const { error } = await supabase.from('ki_historische_positionen').insert(chunk)
  if (error) throw new Error(`ki_historische_positionen: ${error.message}`)
}
console.log(`✓ ${posRows.length} Positionen importiert`)

// Produktkatalog
const katRows = katalog.map((r, idx) => ({
  hauptmodul: str(r.Hauptmodul) ?? 'Sonstiges',
  untermodul: str(r['Untermodul/Vorgang']),
  typische_einheit: str(r['Typische Einheit']),
  preislogik: str(r['Preislogik aus Daten']),
  beispiele: str(r.Beispiele),
  sort_order: idx,
  import_batch: BATCH,
})).filter((r) => r.hauptmodul)

const { error: kErr } = await supabase.from('ki_produkt_katalog').upsert(katRows, {
  onConflict: 'hauptmodul,untermodul',
})
if (kErr) throw new Error(`ki_produkt_katalog: ${kErr.message}`)
console.log(`✓ ${katRows.length} Produktkatalog-Zeilen importiert`)

console.log(`\nQuelle: ${xlsxPath}`)
console.log('KI Analytics: npm run import:historik:ki  (Import + Preise + Produkte + Claude)')
