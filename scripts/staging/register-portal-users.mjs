#!/usr/bin/env node
/**
 * Staging: für jeden Kunden und Handwerker ein Auth-Konto anlegen
 * und auth_user_id setzen — damit Portale per CRM-Login testbar sind.
 *
 *   node --env-file=.env.staging scripts/staging/register-portal-users.mjs
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import {
  assertStagingWriteTarget,
  STAGING_PROJECT_REF_CANON,
} from '../lib/prod-guard.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CRM_ROOT = join(__dirname, '../..')
const STAGING_PASSWORD = 'StagingTest!2026'
const STAGING_ADMIN_EMAIL = 'admin@staging.baerenwald.test'

export function loadEnvStagingFile() {
  const envPath = join(CRM_ROOT, '.env.staging')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq)
    if (process.env[key]) continue
    let val = trimmed.slice(eq + 1)
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    process.env[key] = val
  }
}

function fail(label, error) {
  const msg = error?.message ?? String(error)
  console.error(`ABORT: ${label}: ${msg}`)
  process.exit(1)
}

function slugPart(value, fallback) {
  const s = String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 32)
  return s || fallback
}

function syntheticEmail(kind, id, name) {
  const short = String(id).replace(/-/g, '').slice(0, 10)
  const who = slugPart(name, kind)
  return `${kind}.${who}.${short}@staging.baerenwald.test`
}

function isUsableEmail(email) {
  const e = String(email ?? '').trim().toLowerCase()
  if (!e.includes('@') || e.length < 5) return false
  if (e === STAGING_ADMIN_EMAIL) return false
  return true
}

async function listAllAuthUsers(admin) {
  const byEmail = new Map()
  const byId = new Map()
  let page = 1
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    })
    if (error) fail('Auth listUsers', error)
    const users = data?.users ?? []
    for (const u of users) {
      byId.set(u.id, u)
      const email = (u.email ?? '').trim().toLowerCase()
      if (email) byEmail.set(email, u)
    }
    if (users.length < 1000) break
    page += 1
  }
  return { byEmail, byId }
}

async function ensurePortalAuthUser(admin, cache, opts) {
  const email = opts.email.trim().toLowerCase()
  const existing = cache.byEmail.get(email)
  if (existing) {
    const meta = existing.app_metadata ?? {}
    if (meta.crm_role || meta.is_crm_admin) {
      return { id: existing.id, blocked: true }
    }
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: STAGING_PASSWORD,
      email_confirm: true,
      user_metadata: {
        ...(existing.user_metadata ?? {}),
        name: opts.name,
      },
    })
    if (error) fail(`Auth update (${email})`, error)
    return { id: existing.id, blocked: false, existed: true }
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: STAGING_PASSWORD,
    email_confirm: true,
    user_metadata: { name: opts.name },
  })
  if (error || !data.user) fail(`Auth create (${email})`, error)
  cache.byEmail.set(email, data.user)
  cache.byId.set(data.user.id, data.user)
  return { id: data.user.id, blocked: false, existed: false }
}

async function fetchAll(admin, table, columns) {
  const rows = []
  let from = 0
  const pageSize = 1000
  for (;;) {
    const to = from + pageSize - 1
    const { data, error } = await admin
      .from(table)
      .select(columns)
      .range(from, to)
    if (error) fail(`${table} select`, error)
    const batch = data ?? []
    rows.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }
  return rows
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 */
export async function registerAllPortalUsers(admin) {
  const cache = await listAllAuthUsers(admin)
  const takenAuthIds = new Set()
  const takenEmails = new Set(
    [...cache.byEmail.keys()].filter((e) => {
      const u = cache.byEmail.get(e)
      const meta = u?.app_metadata ?? {}
      return Boolean(meta.crm_role || meta.is_crm_admin || e === STAGING_ADMIN_EMAIL)
    })
  )
  takenEmails.add(STAGING_ADMIN_EMAIL)

  const kunden = await fetchAll(
    admin,
    'kunden',
    'id, email, name, vorname, nachname, auth_user_id, ist_spam'
  )
  const handwerker = await fetchAll(
    admin,
    'handwerker',
    'id, email, name, firma, auth_user_id, ist_portal_gesperrt'
  )

  for (const row of [...kunden, ...handwerker]) {
    const id = row.auth_user_id?.trim()
    if (id) takenAuthIds.add(id)
  }

  let created = 0
  let linked = 0
  let skipped = 0

  async function registerRow(kind, row) {
    const label =
      kind === 'kunde'
        ? row.name || [row.vorname, row.nachname].filter(Boolean).join(' ') || row.id
        : row.firma || row.name || row.id

    if (kind === 'kunde' && row.ist_spam) {
      console.log(`  skip spam: ${label}`)
      skipped += 1
      return
    }
    if (kind === 'handwerker' && row.ist_portal_gesperrt) {
      console.log(`  skip gesperrt: ${label}`)
      skipped += 1
      return
    }

    let email = String(row.email ?? '').trim().toLowerCase()
    let emailChanged = false
    if (!isUsableEmail(email) || takenEmails.has(email)) {
      const next = syntheticEmail(kind, row.id, label)
      if (email !== next) {
        email = next
        emailChanged = true
      }
    }
    if (takenEmails.has(email)) {
      email = syntheticEmail(kind, row.id, `${label}-x`)
      emailChanged = true
    }

    const auth = await ensurePortalAuthUser(admin, cache, {
      email,
      name: label,
    })
    if (auth.blocked) {
      const next = syntheticEmail(kind, row.id, `${label}-portal`)
      const retry = await ensurePortalAuthUser(admin, cache, {
        email: next,
        name: label,
      })
      if (retry.blocked) {
        console.log(`  skip crm-konto: ${label}`)
        skipped += 1
        return
      }
      email = next
      emailChanged = true
      auth.id = retry.id
      auth.existed = retry.existed
    }

    if (takenAuthIds.has(auth.id) && row.auth_user_id !== auth.id) {
      const next = syntheticEmail(kind, row.id, `${label}-dup`)
      const retry = await ensurePortalAuthUser(admin, cache, {
        email: next,
        name: label,
      })
      email = next
      emailChanged = true
      auth.id = retry.id
      auth.existed = retry.existed
    }

    const patch = { auth_user_id: auth.id }
    if (emailChanged || !row.email) patch.email = email

    if (row.auth_user_id === auth.id && !emailChanged) {
      takenEmails.add(email)
      takenAuthIds.add(auth.id)
      if (!auth.existed) created += 1
      return
    }

    const table = kind === 'kunde' ? 'kunden' : 'handwerker'
    const { error } = await admin.from(table).update(patch).eq('id', row.id)
    if (error) fail(`${table} update ${row.id}`, error)

    takenEmails.add(email)
    takenAuthIds.add(auth.id)
    if (!auth.existed) created += 1
    linked += 1
    console.log(
      `  ${kind} ${label} → ${email}${auth.existed ? '' : ' (neu)'}`
    )
  }

  for (const row of kunden) await registerRow('kunde', row)
  for (const row of handwerker) await registerRow('handwerker', row)

  console.log(
    `  fertig: ${linked} verknüpft, ${created} Auth neu, ${skipped} übersprungen`
  )
  return { linked, created, skipped }
}

async function main() {
  loadEnvStagingFile()
  const projectId = process.env.STAGING_PROJECT_ID?.trim()
  const supabaseUrl = process.env.STAGING_SUPABASE_URL?.trim()
  const serviceKey = process.env.STAGING_SERVICE_ROLE_KEY?.trim()
  const projectRef = process.env.STAGING_PROJECT_REF?.trim()
  const dbUrl = process.env.STAGING_DB_URL?.trim()

  assertStagingWriteTarget({ projectId, supabaseUrl, projectRef, dbUrl })
  if (!supabaseUrl || !serviceKey) {
    console.error(
      'ABORT: STAGING_SUPABASE_URL und STAGING_SERVICE_ROLE_KEY müssen gesetzt sein (.env.staging).'
    )
    process.exit(1)
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log(`==> Portal-Konten Staging ${STAGING_PROJECT_REF_CANON}`)
  await registerAllPortalUsers(admin)
  console.log(`  Passwort aller Portal-Logins: ${STAGING_PASSWORD}`)
}

const thisFile = fileURLToPath(import.meta.url)
const invoked = process.argv[1] ? resolve(process.argv[1]) : ''
if (invoked === thisFile) {
  await main()
}
