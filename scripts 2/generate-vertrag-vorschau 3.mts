#!/usr/bin/env node
/**
 * Vorschau-PDFs aus Referenzdaten (WDVS Krumptnerstr. / Rausch ProjektBAU).
 * Aufruf: npx tsx scripts/generate-vertrag-vorschau.mts
 */
import { mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { renderVertragPdfBuffer } from '../src/lib/pdf/vertrag-pdf.tsx'
import {
  RAUSCH_PARTNER_INSERT_SQL,
  rauschRahmenVertragPayload,
  wdvsNachtragVertragPayload,
  wdvsProjektVertragPayload,
} from '../src/lib/vertraege/vertrag-referenz-daten.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const crmRoot = join(__dirname, '..')
const outDir = join(crmRoot, 'data', 'vorschau')
const desktop = process.env.HOME ? join(process.env.HOME, 'Desktop') : outDir

mkdirSync(outDir, { recursive: true })

const files = [
  {
    name: 'Nachunternehmervertrag_WDVS_Krumptnerstr.pdf',
    payload: wdvsProjektVertragPayload(),
  },
  {
    name: 'Ergänzungsvereinbarung_WDVS_Krumptnerstr_+3000qm.pdf',
    payload: wdvsNachtragVertragPayload(),
  },
  {
    name: 'Partner-Rahmenvertrag_Rausch_ProjektBAU.pdf',
    payload: rauschRahmenVertragPayload(),
  },
] as const

for (const f of files) {
  const buffer = await renderVertragPdfBuffer(f.payload)
  const projectPath = join(outDir, f.name)
  const desktopPath = join(desktop, f.name)
  writeFileSync(projectPath, buffer)
  writeFileSync(desktopPath, buffer)
  console.log('PDF:', projectPath)
  console.log('     ', desktopPath)
}

writeFileSync(join(outDir, 'partner-rausch-insert.sql'), RAUSCH_PARTNER_INSERT_SQL)
console.log('\nPartner-SQL:', join(outDir, 'partner-rausch-insert.sql'))
