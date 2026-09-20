#!/usr/bin/env node
/**
 * P1-5 CRM: Service-Role in App-Entries ohne Session/Secret-Gate → Build bricht.
 * Pattern analog Portal scripts/check-service-role-gate.mjs.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'src')

const SERVICE_ROLE_IMPORT =
  /from\s+['"]@\/lib\/supabase-admin['"]|supabaseAdmin\b|SUPABASE_SERVICE_ROLE_KEY|getSupabaseAdmin/

const GATE =
  /requireStaffAndServiceRole|requireCrmAdmin|requireCrmStaff|requireCrmAngebotAccess|createClient\s*\(|\.auth\.getUser\s*\(|auth\.getUser\s*\(|crmRoleFromUser|CRON_SECRET|INTERNAL_API_SECRET|PARTNER_INTERNAL|LEAD_API_SECRET|COPILOT_WEBHOOK|GPT_VIZ|verifyToken|token_hash|webhookSecret|Authorization/

/** Bewusste Ausnahmen: Token-Routen, Cron-Helfer, Libs mit Gate beim Aufrufer. */
const ALLOWLIST = new Set([
  'src/lib/supabase-admin.ts',
  'src/lib/auth/require-staff-service-role.ts',
  'src/app/(dashboard)/angebote/nachfass-cron.ts',
  'src/app/(dashboard)/kommunikation/actions.ts',
  'src/app/actions/mails.ts',
  'src/lib/org/hv-auftrag-actions.ts',
  'src/app/api/webhooks/resend/route.ts',
  'src/app/api/cron/einbehalte/route.ts',
  'src/app/api/internal/partner-rahmenvertrag-accept/route.ts',
])

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.next') continue
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, acc)
    else if (/\.(ts|tsx)$/.test(ent.name)) acc.push(p)
  }
  return acc
}

function isAppEntry(rel, text) {
  if (rel.includes('/api/') && /\/route\.tsx?$/.test(rel)) return true
  if (/"use server"/.test(text) || /'use server'/.test(text)) return true
  return false
}

const offenders = []
for (const abs of walk(srcDir)) {
  const rel = path.relative(root, abs).split(path.sep).join('/')
  const text = fs.readFileSync(abs, 'utf8')
  if (!SERVICE_ROLE_IMPORT.test(text)) continue
  if (!isAppEntry(rel, text)) continue
  if (ALLOWLIST.has(rel)) continue
  if (rel.includes('/[token]/')) continue
  if (!GATE.test(text)) offenders.push(rel)
}

if (offenders.length) {
  console.error('[check-service-role-gate] P1-5 FEHLER:')
  for (const o of offenders.sort()) console.error('  -', o)
  process.exit(1)
}
console.log('[check-service-role-gate] OK')
process.exit(0)
