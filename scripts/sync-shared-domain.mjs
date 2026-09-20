#!/usr/bin/env node
/**
 * P2-4 / E4: Kopiert Shared-Domain- + Resolver-Dateien CRM → Portal.
 * Usage: node scripts/sync-shared-domain.mjs [--check]
 *   --check  nur Byte-Vergleich (exit 1 bei Drift), nichts schreiben
 *
 * Bei entry.rewrite=true: Import-Pfade auf Portal-Layout umschreiben
 * (@/lib/vorgang → @/lib/crm-vorgang, Hilfsdateien, status-map, …).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const CRM_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORTAL_ROOT =
  process.env.PORTAL_ROOT || path.join(CRM_ROOT, '..', 'baerenwald')
const MANIFEST = path.join(CRM_ROOT, 'scripts/shared-domain-files.json')

const checkOnly = process.argv.includes('--check')

/** CRM → Portal Import-Umleitungen (nur bei rewrite: true). */
export function rewriteImportsForPortal(src) {
  let s = src
  // Reihenfolge: spezifisch vor generisch
  s = s.replaceAll(
    '@/lib/anfragen/anfrage-akut-schwelle',
    '@/lib/crm-vorgang/anfrage-akut-schwelle'
  )
  s = s.replaceAll('@/lib/org/hv-lead-helpers', '@/lib/crm-vorgang/hv-lead-helpers')
  s = s.replaceAll('@/lib/vorgang/', '@/lib/crm-vorgang/')
  s = s.replaceAll('@/lib/status/status-map', '@/lib/shared-domain/status-map')
  s = s.replaceAll('@/lib/format/geld-datum', '@/lib/shared-domain/geld-datum')
  s = s.replaceAll('@/lib/status/status-vokabular', '@/lib/shared-domain/status-vokabular')
  s = s.replaceAll('@/lib/pdf/chrome', '@/lib/shared-domain/pdf-chrome')
  s = s.replaceAll('@/lib/tokens/colors', '@/lib/shared-domain/colors')
  s = s.replaceAll(
    '@/lib/templates/angebot-mail',
    '@/lib/portal/portal-display'
  )
  // CRM Lead/OrgFreigabeStatus → Portal-Bridge (nicht sync't)
  s = s.replaceAll(
    "from '@/lib/types'",
    "from '@/lib/crm-vorgang/crm-types-bridge'"
  )
  s = s.replaceAll(
    'from "@/lib/types"',
    'from "@/lib/crm-vorgang/crm-types-bridge"'
  )
  return s
}

function loadManifest() {
  const raw = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
  return {
    header: raw.header || '// SYNCED FROM CRM — do not edit\n',
    files: raw.files || [],
  }
}

export function expectedPortalContent(crmRel, header, rewrite) {
  const src = fs.readFileSync(path.join(CRM_ROOT, crmRel), 'utf8')
  const body = src.replace(/^\/\/ SYNCED FROM CRM — do not edit\n/, '')
  const transformed = rewrite ? rewriteImportsForPortal(body) : body
  return header + transformed
}

function main() {
  if (!fs.existsSync(PORTAL_ROOT)) {
    console.error(`Portal-Root fehlt: ${PORTAL_ROOT}`)
    console.error('Setze PORTAL_ROOT oder lege baerenwald neben baerenwald-system.')
    process.exit(1)
  }

  const { header, files } = loadManifest()
  let drift = 0
  let written = 0

  for (const entry of files) {
    const expected = expectedPortalContent(entry.crm, header, Boolean(entry.rewrite))
    const target = path.join(PORTAL_ROOT, entry.portal)
    const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null

    if (current === expected) {
      console.log(`OK   ${entry.portal}`)
      continue
    }

    if (checkOnly) {
      drift++
      console.error(`DRIFT ${entry.portal} (≠ CRM ${entry.crm})`)
      continue
    }

    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, expected, 'utf8')
    written++
    console.log(`SYNC ${entry.portal}`)
  }

  if (checkOnly) {
    if (drift) {
      console.error(`\n${drift} Datei(en) drift — npm run sync:shared-domain im CRM`)
      process.exit(1)
    }
    console.log(`OK: Shared-Domain Byte-Parität (${files.length} Dateien)`)
    return
  }

  console.log(`\nFertig: ${written} geschrieben, ${files.length - written} unverändert`)
}

main()
