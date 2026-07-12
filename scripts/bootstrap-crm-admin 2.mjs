#!/usr/bin/env node
/**
 * CRM-Admin anlegen / Passwort setzen (Supabase Auth + user_profiles).
 * Passwort nur in crm-bootstrap.config.local.mjs — nie ins Git committen.
 *
 *   cp scripts/crm-bootstrap.config.example.mjs scripts/crm-bootstrap.config.local.mjs
 *   # Passwort in .local.mjs eintragen
 *   npm run bootstrap:crm-admin
 */
import { createClient } from '@supabase/supabase-js'
import { existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const localConfigPath = resolve(__dirname, 'crm-bootstrap.config.local.mjs')

if (!existsSync(localConfigPath)) {
  console.error(
    'Fehlt: scripts/crm-bootstrap.config.local.mjs\n' +
      'Kopiere: cp scripts/crm-bootstrap.config.example.mjs scripts/crm-bootstrap.config.local.mjs'
  )
  process.exit(1)
}

const config = (await import(pathToFileURL(localConfigPath).href)).default
const email = String(config.email ?? '').trim().toLowerCase()
const password = String(config.password ?? '')
const name = String(config.name ?? email.split('@')[0] ?? 'CRM Admin').trim()
const role = config.role === 'manager' ? 'manager' : 'admin'

if (!email.includes('@')) {
  console.error('Ungültige E-Mail in crm-bootstrap.config.local.mjs')
  process.exit(1)
}
if (password.length < 8) {
  console.error('Passwort muss mindestens 8 Zeichen haben.')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
if (!url || !serviceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY in .env.local setzen.')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: listed, error: listErr } = await admin.auth.admin.listUsers({ perPage: 500 })
if (listErr) {
  console.error('listUsers:', listErr.message)
  process.exit(1)
}

let user = (listed?.users ?? []).find((u) => (u.email ?? '').toLowerCase() === email)

if (!user) {
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role },
  })
  if (createErr || !created.user) {
    console.error('createUser:', createErr?.message ?? 'unbekannt')
    process.exit(1)
  }
  user = created.user
  console.log('Auth-User angelegt:', email)
} else {
  const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
    user_metadata: { ...(user.user_metadata ?? {}), name, role },
  })
  if (updErr) {
    console.error('updateUserById:', updErr.message)
    process.exit(1)
  }
  console.log('Passwort gesetzt für:', email)
}

const { error: profileErr } = await admin.from('user_profiles').upsert(
  {
    id: user.id,
    email,
    name,
    role,
  },
  { onConflict: 'id' }
)

if (profileErr) {
  console.error('user_profiles:', profileErr.message)
  process.exit(1)
}

console.log('')
console.log('CRM-Zugang bereit.')
console.log('  E-Mail:  ', email)
console.log('  Rolle:   ', role)
console.log('  Login:   https://baerenwald-backend.netlify.app/login')
console.log('  Passwort: (wie in crm-bootstrap.config.local.mjs)')
