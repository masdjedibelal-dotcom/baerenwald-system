'use server'

import { generateAngebotKi } from '@/lib/angebote/angebot-ki-generate'
import { speichereAngebotKiBeispiel } from '@/lib/angebote/angebot-ki-lernen'
import type {
  AngebotKiErgebnis,
  AngebotKiGenerateInput,
  AngebotKiLernenInput,
} from '@/lib/angebote/angebot-ki-types'
import { createClient } from '@/lib/supabase-server'

async function requireAuth(): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet.' }
  return { ok: true }
}

export async function angebotKiGenerate(
  input: AngebotKiGenerateInput
): Promise<{ ok: true; ergebnis: AngebotKiErgebnis } | { ok: false; message: string }> {
  const auth = await requireAuth()
  if (!auth.ok) return auth
  const prompt = input.prompt?.trim()
  if (!prompt) return { ok: false, message: 'Bitte einen Prompt eingeben.' }
  try {
    const ergebnis = await generateAngebotKi({ ...input, prompt })
    return { ok: true, ergebnis }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'KI-Generierung fehlgeschlagen.',
    }
  }
}

/** Nach „Übernehmen“: Beispiel speichern, damit die KI daraus lernt. */
export async function angebotKiLernen(
  input: AngebotKiLernenInput
): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = await requireAuth()
  if (!auth.ok) return auth
  const r = await speichereAngebotKiBeispiel(input)
  if (!r.ok) return { ok: false, message: r.message }
  return { ok: true }
}
