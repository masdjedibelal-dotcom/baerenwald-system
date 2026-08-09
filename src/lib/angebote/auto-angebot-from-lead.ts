import { createAngebot } from '@/app/(dashboard)/angebote/actions'
import { angebotWizardPositionenFromLead } from '@/lib/angebote/angebot-positionen-from-lead'
import { wizardPositionsToAngebot } from '@/lib/angebote/angebot-wizard-types'
import { summenAusPositionen } from '@/lib/angebot-positionen'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Gewerk, Lead, Preisliste } from '@/lib/types'

export type AutoAngebotResult =
  | { ok: true; angebotId: string; created: boolean }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; message: string }

/**
 * Legt bei Bedarf automatisch einen Angebots-Entwurf aus Lead-Funnel-Daten an (Phase D).
 * Idempotent: überspringt, wenn bereits ein nicht-storniertes Angebot existiert.
 */
export async function ensureAutoAngebotEntwurfForLead(leadId: string): Promise<AutoAngebotResult> {
  const id = leadId?.trim()
  if (!id) return { ok: false, message: 'Lead-ID fehlt.' }

  const { data: lead, error: leadErr } = await supabaseAdmin
    .from('leads')
    .select(
      'id, kunde_id, kunde_objekt_id, status, situation, bereiche, funnel_daten, kontakt_name, plz, org_freigabe_status'
    )
    .eq('id', id)
    .maybeSingle()

  if (leadErr || !lead) {
    return { ok: false, message: leadErr?.message ?? 'Lead nicht gefunden.' }
  }

  const { data: existing } = await supabaseAdmin
    .from('angebote')
    .select('id, status_einfach, status')
    .eq('lead_id', id)
    .order('created_at', { ascending: false })
    .limit(5)

  const hasActive = (existing ?? []).some((a) => {
    const s = String(a.status_einfach ?? a.status ?? '').toLowerCase()
    return s !== 'storniert' && s !== 'ersetzt' && s !== 'abgelehnt'
  })
  if (hasActive) {
    return { ok: true, skipped: true, reason: 'Angebot existiert bereits.' }
  }

  if ((lead.org_freigabe_status ?? '').trim() === 'ausstehend') {
    return { ok: true, skipped: true, reason: 'Wartet auf Org-Freigabe.' }
  }

  const [{ data: gewerke }, { data: preislisten }] = await Promise.all([
    supabaseAdmin.from('gewerke').select('id, name, slug, aktiv, sort_order').eq('aktiv', true),
    supabaseAdmin.from('preislisten').select('*').eq('aktiv', true),
  ])

  const wizardPos = angebotWizardPositionenFromLead(
    lead as Lead,
    (gewerke ?? []) as Gewerk[],
    (preislisten ?? []) as Preisliste[]
  )

  if (!wizardPos.length) {
    return { ok: true, skipped: true, reason: 'Keine Positionen aus Funnel ableitbar.' }
  }

  const positionen = wizardPositionsToAngebot(wizardPos)
  const summen = summenAusPositionen(positionen, 19)
  const res = await createAngebot(
    {
      lead_id: id,
      kunde_id: lead.kunde_id,
      kunde_objekt_id: lead.kunde_objekt_id,
      positionen,
      notizen: null,
      preis_typ: 'fix',
      gesamt_min: summen.nettoMin,
      gesamt_max: summen.nettoMax,
    },
    { asSystem: true }
  )

  if (!res.ok) return res

  await supabaseAdmin.from('lead_timeline').insert({
    lead_id: id,
    angebot_id: res.id,
    typ: 'angebot',
    titel: 'Auto-Angebot (Entwurf)',
    beschreibung: `${wizardPos.length} Position(en) aus Lead-Funnel übernommen.`,
    erstellt_von: null,
  })

  return { ok: true, angebotId: res.id, created: true }
}
