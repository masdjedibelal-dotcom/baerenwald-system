import type { SupabaseClient } from '@supabase/supabase-js'

type GeschwisterPos = {
  handwerker_id?: string | null
  handwerker_status?: string | null
  gewerk_block_key?: string | null
  gewerk_slug?: string | null
  gewerk_name?: string
}

export type ErerbterHandwerker = {
  handwerker_id: string
  handwerker_status: string | null
}

function norm(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase()
}

/** Handwerker-Zuordnung von Geschwister-Positionen im selben Gewerk/Block übernehmen. */
export function handwerkerAusGeschwisterPositionen(
  positionen: GeschwisterPos[],
  target: {
    gewerk_block_key?: string | null
    gewerk_slug?: string | null
    gewerk_name: string
  }
): ErerbterHandwerker | null {
  const blockKey = target.gewerk_block_key?.trim()
  let siblings = positionen

  if (blockKey) {
    const imBlock = positionen.filter((p) => p.gewerk_block_key?.trim() === blockKey)
    if (imBlock.length) siblings = imBlock
  }

  if (siblings === positionen) {
    const slug = target.gewerk_slug?.trim()
    if (slug) {
      const imGewerk = positionen.filter((p) => p.gewerk_slug?.trim() === slug)
      if (imGewerk.length) siblings = imGewerk
    }
  }

  if (siblings === positionen) {
    const gName = norm(target.gewerk_name)
    if (gName) {
      const imGewerk = positionen.filter((p) => norm(p.gewerk_name) === gName)
      if (imGewerk.length) siblings = imGewerk
    }
  }

  const quelle = siblings.find((p) => p.handwerker_id?.trim())
  if (!quelle?.handwerker_id?.trim()) return null

  return {
    handwerker_id: quelle.handwerker_id.trim(),
    handwerker_status: quelle.handwerker_status?.trim() || null,
  }
}

/** Fehlende gewerk_id auf angebot_handwerker nachziehen (Partner-Portal-Filter). */
export async function ensureAngebotHandwerkerGewerkId(
  supabase: SupabaseClient,
  input: {
    auftragId: string
    handwerkerId: string
    gewerkSlug?: string | null
    gewerkName: string
  }
): Promise<void> {
  const { data: auftrag } = await supabase
    .from('auftraege')
    .select('angebot_id')
    .eq('id', input.auftragId)
    .maybeSingle()
  const angebotId = auftrag?.angebot_id ? String(auftrag.angebot_id).trim() : ''
  if (!angebotId) return

  let gewerkId: string | null = null
  const slug = input.gewerkSlug?.trim()
  if (slug) {
    const { data: gw } = await supabase.from('gewerke').select('id').eq('slug', slug).maybeSingle()
    gewerkId = gw?.id ? String(gw.id) : null
  }
  if (!gewerkId) {
    const name = input.gewerkName.trim()
    if (name) {
      const { data: gw } = await supabase.from('gewerke').select('id').eq('name', name).maybeSingle()
      gewerkId = gw?.id ? String(gw.id) : null
    }
  }
  if (!gewerkId) return

  await supabase
    .from('angebot_handwerker')
    .update({ gewerk_id: gewerkId })
    .eq('angebot_id', angebotId)
    .eq('handwerker_id', input.handwerkerId)
    .is('gewerk_id', null)
}
