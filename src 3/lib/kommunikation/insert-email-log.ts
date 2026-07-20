import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'

const EXTENDED_COLUMNS = [
  'kontext_typ',
  'richtung',
  'cc_email',
  'von_email',
  'in_reply_to_log_id',
  'internet_message_id',
] as const

const OPTIONAL_COLUMNS = ['anhang_dateiname', ...EXTENDED_COLUMNS] as const

const CORE_COLUMNS = new Set([
  'id',
  'typ',
  'an_email',
  'an_name',
  'betreff',
  'inhalt_html',
  'status',
  'fehler_nachricht',
  'kunde_id',
  'lead_id',
  'angebot_id',
  'auftrag_id',
  'rechnung_id',
  'gesendet_von',
  'resend_id',
  'created_at',
])

function isColumnError(message: string): boolean {
  return /column|schema cache|could not find/i.test(message)
}

function legacyEmailLogRow(row: Record<string, unknown>): Record<string, unknown> {
  const out = { ...row }
  for (const key of OPTIONAL_COLUMNS) delete out[key]
  return out
}

function coreEmailLogRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (CORE_COLUMNS.has(key)) out[key] = value
  }
  return out
}

/** Schreibt in email_log; fällt auf ältere Schemas zurück, wenn Migrationen noch fehlen. */
export async function insertEmailLogRow(
  row: Record<string, unknown>
): Promise<{ id: string | null; error: string | null }> {
  const attempts: Record<string, unknown>[] = [row, legacyEmailLogRow(row), coreEmailLogRow(row)]

  let lastError: string | null = null
  for (const attempt of attempts) {
    const { data, error } = await supabaseAdmin.from('email_log').insert(attempt).select('id').single()
    if (!error) {
      return { id: (data?.id as string) ?? null, error: null }
    }
    lastError = error.message
    if (!isColumnError(error.message)) break
  }

  if (lastError) console.warn('[insertEmailLogRow]', lastError)
  return { id: null, error: lastError }
}
