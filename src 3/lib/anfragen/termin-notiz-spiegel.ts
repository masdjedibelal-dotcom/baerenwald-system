import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { formatDatum } from '@/lib/utils'

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildTerminNotizSpiegelInhalt(input: {
  terminLabel: string
  titel: string | null
  inhalt: string
}): string {
  const label = `<p style="margin:0 0 8px;font-size:12px;color:#6B7280;">Termin-Notiz · ${escHtml(input.terminLabel)}</p>`
  const titelBlock = input.titel?.trim()
    ? `<p style="margin:0 0 8px;font-weight:600;">${escHtml(input.titel.trim())}</p>`
    : ''
  const raw = input.inhalt.trim()
  const body = raw
    ? raw.startsWith('<')
      ? raw
      : `<p style="margin:0;white-space:pre-wrap;">${escHtml(raw).replace(/\n/g, '<br/>')}</p>`
    : ''
  return `${label}${titelBlock}${body}`.trim() || label
}

async function loadTerminLabel(
  supabase: SupabaseClient,
  terminId: string
): Promise<string> {
  const { data } = await supabase
    .from('kalender_termine')
    .select('titel, datum, uhrzeit_von')
    .eq('id', terminId)
    .maybeSingle()

  if (!data) return 'Termin'

  const titel = (data.titel as string | null)?.trim() || 'Termin'
  const datum = formatDatum(String(data.datum))
  const zeit = (data.uhrzeit_von as string | null)?.slice(0, 5)
  return zeit ? `${titel} · ${datum} · ${zeit} Uhr` : `${titel} · ${datum}`
}

export async function syncTerminNotizSpiegel(
  supabase: SupabaseClient,
  input: {
    leadId: string
    terminNotizId: string
    terminId: string
    titel: string | null
    inhalt: string
    datei_url: string | null
    datei_urls: string[] | null
    erstellt_von: string | null
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const terminLabel = await loadTerminLabel(supabase, input.terminId)
  const urls = (input.datei_urls ?? []).map((u) => u.trim()).filter(Boolean)
  const legacyUrl = input.datei_url?.trim() || urls[0] || null
  const allUrls = urls.length ? urls : legacyUrl ? [legacyUrl] : []

  const spiegelRow = {
    lead_id: input.leadId,
    inhalt: buildTerminNotizSpiegelInhalt({
      terminLabel,
      titel: input.titel,
      inhalt: input.inhalt,
    }),
    titel: input.titel,
    datei_url: legacyUrl,
    datei_urls: allUrls.length ? allUrls : null,
    quelle_notiz_id: input.terminNotizId,
    kalender_termin_id: null,
  }

  const { data: existing } = await supabase
    .from('lead_notizen')
    .select('id')
    .eq('quelle_notiz_id', input.terminNotizId)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await supabase.from('lead_notizen').update(spiegelRow).eq('id', existing.id)
    if (error) return { ok: false, message: error.message }
    return { ok: true }
  }

  const { error } = await supabase.from('lead_notizen').insert({
    ...spiegelRow,
    erstellt_von: input.erstellt_von,
  })
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}
