import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  COPILOT_HISTORY_TURNS,
  COPILOT_MAX_HISTORY_MESSAGE_CHARS,
  truncateCopilotText,
} from '@/lib/copilot/message-limits'

export type CopilotHistoryMessage = {
  role: 'user' | 'assistant'
  content: string
}

export async function loadHistory(limit = COPILOT_HISTORY_TURNS): Promise<CopilotHistoryMessage[]> {
  const { data, error } = await supabaseAdmin
    .from('copilot_messages')
    .select('role, content')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Supabase copilot_messages (lesen): ${error.message}`)
  }

  const rows = (data ?? []) as CopilotHistoryMessage[]
  return rows.reverse().map((row) => ({
    role: row.role,
    content: truncateCopilotText(row.content, COPILOT_MAX_HISTORY_MESSAGE_CHARS),
  }))
}

export async function saveMessage(role: 'user' | 'assistant', content: string): Promise<void> {
  const stored = truncateCopilotText(
    content,
    role === 'user' ? 12_000 : 8_000
  )

  const { error: insertError } = await supabaseAdmin
    .from('copilot_messages')
    .insert({ role, content: stored })
  if (insertError) {
    throw new Error(`Supabase copilot_messages (speichern): ${insertError.message}`)
  }

  const { data } = await supabaseAdmin
    .from('copilot_messages')
    .select('id')
    .order('created_at', { ascending: false })

  if ((data?.length ?? 0) > 100) {
    const toDelete = data!.slice(100).map((d) => d.id as string)
    await supabaseAdmin.from('copilot_messages').delete().in('id', toDelete)
  }
}

export async function clearCopilotHistory(): Promise<void> {
  const { error } = await supabaseAdmin.from('copilot_messages').delete().not('id', 'is', null)
  if (error) {
    throw new Error(`Supabase copilot_messages (löschen): ${error.message}`)
  }
}

const RESET_COMMANDS = new Set([
  '/reset',
  '/clear',
  '/neustart',
  '/start',
  'reset',
  'neustart',
  'verlauf löschen',
  'chat löschen',
  'chat reset',
  'chat zurücksetzen',
  'zurücksetzen',
  'verlauf reset',
])

export function isCopilotResetCommand(text: string): boolean {
  const t = text.trim().toLowerCase()
  if (!t) return false
  if (RESET_COMMANDS.has(t)) return true
  return /^(bitte\s+)?(chat\s+)?(zurück)?setzen$/.test(t)
}

/** Letzte User-Nachricht entfernen (z. B. nach Fehler, bevor Verlauf komplett leer ist). */
export async function rollbackLastUserMessage(): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('copilot_messages')
    .select('id, role')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    throw new Error(`Supabase copilot_messages (rollback): ${error.message}`)
  }
  if (!data || data.role !== 'user') return false
  const { error: delError } = await supabaseAdmin.from('copilot_messages').delete().eq('id', data.id)
  if (delError) {
    throw new Error(`Supabase copilot_messages (rollback löschen): ${delError.message}`)
  }
  return true
}

export async function resetCopilotChat(): Promise<void> {
  await clearCopilotHistory()
}
