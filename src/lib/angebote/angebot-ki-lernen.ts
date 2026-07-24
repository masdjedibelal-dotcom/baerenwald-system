import 'server-only'

import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type {
  AngebotKiGenerateInput,
  AngebotKiLernenInput,
  AngebotKiScope,
} from '@/lib/angebote/angebot-ki-types'

export type AngebotKiBeispielRow = {
  id: string
  scope: string
  prompt: string
  gewerk_slug: string | null
  ergebnis: unknown
  created_at: string
}

async function authUserId(): Promise<string | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

/** Few-Shot: zuletzt akzeptierte Beispiele (gleicher Scope, optional Gewerk). */
export async function loadAngebotKiBeispiele(input: {
  scope: AngebotKiScope
  gewerk_slug?: string | null
  limit?: number
}): Promise<AngebotKiBeispielRow[]> {
  const limit = Math.min(8, Math.max(1, input.limit ?? 5))
  let q = supabaseAdmin
    .from('angebot_ki_beispiele')
    .select('id, scope, prompt, gewerk_slug, ergebnis, created_at')
    .eq('akzeptiert', true)
    .eq('scope', 'positionen')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (input.gewerk_slug?.trim()) {
    q = q.or(`gewerk_slug.eq.${input.gewerk_slug.trim()},gewerk_slug.is.null`)
  }

  const { data, error } = await q
  if (error) {
    // Tabelle noch nicht migriert → still ohne Lernen weiter
    console.warn('[angebot-ki] beispiele lesen:', error.message)
    return []
  }
  return (data ?? []) as AngebotKiBeispielRow[]
}

export async function speichereAngebotKiBeispiel(
  input: AngebotKiLernenInput
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const userId = await authUserId()
  const { data, error } = await supabaseAdmin
    .from('angebot_ki_beispiele')
    .insert({
      scope: 'positionen',
      prompt: input.prompt.trim().slice(0, 4000),
      gewerk_slug: input.gewerk_slug?.trim() || null,
      kontext: input.kontext,
      ergebnis: input.ergebnis,
      akzeptiert: true,
      user_id: userId,
    })
    .select('id')
    .single()

  if (error) {
    console.warn('[angebot-ki] beispiele speichern:', error.message)
    return { ok: false, message: error.message }
  }
  return { ok: true, id: data.id as string }
}

/** Kompakte Few-Shot-Zeilen für den System-/User-Prompt. */
export function formatBeispieleForPrompt(rows: AngebotKiBeispielRow[]): string {
  if (!rows.length) return ''
  const blocks = rows.map((r, i) => {
    const ergebnis =
      typeof r.ergebnis === 'object' ? JSON.stringify(r.ergebnis).slice(0, 900) : String(r.ergebnis)
    return `Beispiel ${i + 1}:\nPrompt: ${r.prompt.slice(0, 400)}\nErgebnis: ${ergebnis}`
  })
  return `\n\nLERN-BEISPIELE (vom Team akzeptiert — Stil und Match-Logik übernehmen):\n${blocks.join('\n\n')}`
}

export function dominantGewerkSlug(input: AngebotKiGenerateInput): string | null {
  const counts = new Map<string, number>()
  for (const p of input.positionen) {
    const s = p.gewerk_slug?.trim()
    if (!s) continue
    counts.set(s, (counts.get(s) ?? 0) + 1)
  }
  let best: string | null = null
  let n = 0
  for (const [k, v] of Array.from(counts.entries())) {
    if (v > n) {
      best = k
      n = v
    }
  }
  return best
}
