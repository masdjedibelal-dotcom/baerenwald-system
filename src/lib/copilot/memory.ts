import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'

export type CopilotHistoryMessage = {
  role: 'user' | 'assistant'
  content: string
}

export async function loadHistory(limit = 20): Promise<CopilotHistoryMessage[]> {
  const { data } = await supabaseAdmin
    .from('copilot_messages')
    .select('role, content')
    .order('created_at', { ascending: false })
    .limit(limit)

  const rows = (data ?? []) as CopilotHistoryMessage[]
  return rows.reverse()
}

export async function saveMessage(role: 'user' | 'assistant', content: string): Promise<void> {
  await supabaseAdmin.from('copilot_messages').insert({ role, content })

  const { data } = await supabaseAdmin
    .from('copilot_messages')
    .select('id')
    .order('created_at', { ascending: false })

  if ((data?.length ?? 0) > 100) {
    const toDelete = data!.slice(100).map((d) => d.id as string)
    await supabaseAdmin.from('copilot_messages').delete().in('id', toDelete)
  }
}
