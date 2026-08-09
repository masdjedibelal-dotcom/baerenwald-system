import 'server-only'

import { listHandwerkerFuerGewerkCopilot } from '@/lib/copilot/wizard-copilot'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Schlägt Handwerker-Zuordnung nach Gewerken für Angebot oder Auftrag vor.
 */
export async function vorschlageHandwerkerZuordnung(input: {
  angebot_id?: string
  auftrag_id?: string
}) {
  const angebotId = input.angebot_id?.trim()
  const auftragId = input.auftrag_id?.trim()

  if (!angebotId && !auftragId) {
    return { error: 'angebot_id oder auftrag_id erforderlich' }
  }

  type GewerkBucket = { gewerk_slug: string; gewerk_name: string; positionen: string[] }
  const buckets = new Map<string, GewerkBucket>()

  if (auftragId) {
    const { data: pos } = await supabaseAdmin
      .from('auftrag_positionen')
      .select('id, leistung_name, gewerk_slug, gewerk_name, handwerker_id')
      .eq('auftrag_id', auftragId)
      .order('sort_order', { ascending: true })
    for (const p of pos ?? []) {
      const slug = String(p.gewerk_slug || 'sonstiges')
      const name = String(p.gewerk_name || slug)
      const b = buckets.get(slug) ?? { gewerk_slug: slug, gewerk_name: name, positionen: [] }
      b.positionen.push(String(p.leistung_name || p.id))
      buckets.set(slug, b)
    }
  } else if (angebotId) {
    const { data: ang } = await supabaseAdmin
      .from('angebote')
      .select('id, positionen')
      .eq('id', angebotId)
      .maybeSingle()
    const positionen = Array.isArray(ang?.positionen) ? ang!.positionen : []
    for (const raw of positionen) {
      const p = raw as Record<string, unknown>
      if (p.typ && p.typ !== 'artikel' && p.typ !== 'leistung') continue
      const slug = String(p.gewerk_slug || p.gewerk || 'sonstiges')
      const name = String(p.gewerk_name || slug)
      const b = buckets.get(slug) ?? { gewerk_slug: slug, gewerk_name: name, positionen: [] }
      b.positionen.push(String(p.name || p.leistung || 'Position'))
      buckets.set(slug, b)
    }
  }

  const vorschlaege = []
  for (const b of Array.from(buckets.values())) {
    const hw = await listHandwerkerFuerGewerkCopilot(b.gewerk_slug)
    const list = Array.isArray((hw as { handwerker?: unknown[] }).handwerker)
      ? (hw as { handwerker: Array<Record<string, unknown>> }).handwerker.slice(0, 3)
      : []
    vorschlaege.push({
      gewerk_slug: b.gewerk_slug,
      gewerk_name: b.gewerk_name,
      positionen_count: b.positionen.length,
      positionen_beispiel: b.positionen.slice(0, 5),
      empfohlene_handwerker: list.map((h) => ({
        id: h.id,
        name: h.firma || h.name,
      })),
      gewerk_id: (hw as { gewerk?: { id?: string } }).gewerk?.id ?? null,
    })
  }

  return {
    angebot_id: angebotId ?? null,
    auftrag_id: auftragId ?? null,
    gewerke: vorschlaege,
    naechste_schritte: [
      'Mit User die Zuordnung bestätigen',
      auftragId
        ? 'crm_aktion assign_auftrag_handwerker_gewerk (bestaetigt) je Gewerk'
        : 'save_angebot_wizard mit handwerker_zuweisungen oder send_angebot_handwerker',
      'Optional crm_oeffnen auf Auftrag/Angebot zum Prüfen',
    ],
  }
}
