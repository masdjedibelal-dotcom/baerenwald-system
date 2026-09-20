#!/usr/bin/env node
/**
 * P2-4 Paritätstest (CRM-Seite): Byte-Gleichheit CRM-Quelle → Portal-Ziel.
 * Alias für: node scripts/sync-shared-domain.mjs --check
 */
import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const r = spawnSync(process.execPath, [path.join(root, 'scripts/sync-shared-domain.mjs'), '--check'], {
  stdio: 'inherit',
  env: process.env,
})
process.exit(r.status ?? 1)
