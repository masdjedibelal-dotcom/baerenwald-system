#!/usr/bin/env node
/**
 * Entfernt versehentlich im Repo-Root liegende Duplikate und abgelöste Vor-Ort/Vor-Baubeginn-Dateien,
 * die den Netlify-Typecheck blockieren (nicht mehr importiert bzw. durch src/-Varianten ersetzt).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const paths = [
  'vercel.json',
  'StatusActions.tsx',
  'ui',
  'rechnungen',
  'projekt',
  'preislisten',
  'src/app/(dashboard)/anfragen/[id]/vorab',
  'src/app/(dashboard)/auftraege/[id]/vor-baubeginn',
  'src/app/api/auftraege/[id]/protokoll',
  'src/components/anfragen/VorOrtAufnahmeClient.tsx',
  'src/components/anfragen/VorabAnfrageClient.tsx',
  'src/components/anfragen/AnfrageSidePanel.tsx',
  'src/components/angebote/AngebotDetailClient.tsx',
  'src/components/dashboard/DashboardHomeClient.tsx',
  'src/components/auftraege/AuftragKundenstatusSection.tsx',
  'src/components/auftraege/VorBaubeginnForm.tsx',
  'src/components/rechnungen/RechnungEntwurfForm.tsx',
  'src/lib/vorab-angebot-from-vorab.ts',
  'src/lib/vorab-vorort-initial.ts',
]

function rm(target) {
  const full = path.join(root, target)
  if (!fs.existsSync(full)) return
  fs.rmSync(full, { recursive: true, force: true })
  console.log('removed:', target)
}

for (const p of paths) rm(p)
console.log('deploy-blocker cleanup done')
