/**
 * Legt den Storage-Bucket lead-notizen-fotos an (falls fehlend).
 * Nutzung: node --env-file=.env.local scripts/ensure-lead-notizen-fotos-bucket.mjs
 *
 * RLS-Policy für öffentliches Lesen: supabase/apply-lead-notizen-fotos-bucket.sql
 * im Supabase SQL Editor ausführen, falls Bilder in der App nicht laden.
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY in .env.local setzen.')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const BUCKET = 'lead-notizen-fotos'
const MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]

const { data: existing, error: listErr } = await supabase.storage.listBuckets()
if (listErr) {
  console.error('Buckets auflisten fehlgeschlagen:', listErr.message)
  process.exit(1)
}

if (existing?.some((b) => b.id === BUCKET || b.name === BUCKET)) {
  console.log(`Bucket „${BUCKET}“ existiert bereits.`)
  process.exit(0)
}

const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
  public: true,
  fileSizeLimit: 5 * 1024 * 1024,
  allowedMimeTypes: MIME,
})

if (createErr) {
  if (/already exists|duplicate/i.test(createErr.message)) {
    console.log(`Bucket „${BUCKET}“ existiert bereits.`)
    process.exit(0)
  }
  console.error('Bucket anlegen fehlgeschlagen:', createErr.message)
  process.exit(1)
}

console.log(`Bucket „${BUCKET}“ wurde angelegt (öffentlich, max. 5 MB, Bilder).`)
console.log(
  'Optional: supabase/apply-lead-notizen-fotos-bucket.sql im SQL Editor ausführen (Leserecht-Policy).'
)
