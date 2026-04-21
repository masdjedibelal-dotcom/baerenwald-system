import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { AnfrageDetailClient } from '@/components/anfragen/AnfrageDetailClient'
import type { LeadDetail } from '@/lib/types'

export default async function AnfrageDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('leads')
    .select(
      `
      *,
      kunden(*),
      angebote(
        id,
        status,
        gesamt_fix,
        gesamt_min,
        gesamt_max,
        positionen,
        created_at
      ),
      leads_status_history(
        *,
        user_profiles(name)
      ),
      lead_timeline(*),
      kalender_termine(*),
      vorab_formulare(
        id,
        daten,
        created_at,
        updated_at,
        formular_templates(name, phase, typ, felder)
      ),
      lead_notizen(*)
    `
    )
    .eq('id', params.id)
    .maybeSingle()

  if (error || !data) {
    if (error) {
      const { data: fallback, error: err2 } = await supabase
        .from('leads')
        .select(
          `
          *,
          kunden(*),
          leads_status_history(
            *,
            user_profiles(name)
          ),
          lead_timeline(*),
          kalender_termine(*),
          vorab_formulare(
            id,
            daten,
            created_at,
            updated_at,
            formular_templates(name, phase, typ, felder)
          ),
          lead_notizen(*)
        `
        )
        .eq('id', params.id)
        .maybeSingle()
      if (err2 || !fallback) notFound()
      const lead = fallback as LeadDetail
      const history = [...(lead.leads_status_history ?? [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      const { data: angebotRows } = await supabase
        .from('angebote')
        .select('id, status, gesamt_fix, gesamt_min, gesamt_max, created_at')
        .eq('lead_id', params.id)
        .order('created_at', { ascending: false })
      return (
        <AnfrageDetailClient
          lead={{ ...lead, leads_status_history: history }}
          angeboteListe={
            (angebotRows ?? []) as {
              id: string
              status: string
              gesamt_fix?: number | null
              gesamt_min: number | null
              gesamt_max: number | null
              created_at: string
            }[]
          }
        />
      )
    }
    notFound()
  }

  const lead = data as LeadDetail
  const history = [...(lead.leads_status_history ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const angeboteFromLead = lead.angebote as
    | {
        id: string
        status: string
        gesamt_fix?: number | null
        gesamt_min: number | null
        gesamt_max: number | null
        created_at: string
      }[]
    | null
    | undefined

  if (angeboteFromLead && angeboteFromLead.length) {
    const sorted = [...angeboteFromLead].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    return (
      <AnfrageDetailClient lead={{ ...lead, leads_status_history: history }} angeboteListe={sorted} />
    )
  }

  const { data: angebotRows } = await supabase
    .from('angebote')
    .select('id, status, gesamt_fix, gesamt_min, gesamt_max, created_at')
    .eq('lead_id', params.id)
    .order('created_at', { ascending: false })

  return (
    <AnfrageDetailClient
      lead={{ ...lead, leads_status_history: history }}
      angeboteListe={(angebotRows ?? []) as never}
    />
  )
}
