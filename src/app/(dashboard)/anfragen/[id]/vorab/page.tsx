import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { loadBetreuerVorabTemplate } from '@/app/(dashboard)/formulare/actions'
import { VorOrtAufnahmeClient } from '@/components/anfragen/VorOrtAufnahmeClient'
import { buildInitialVorOrtFormDaten } from '@/lib/vorab-vorort-initial'
import type { Lead } from '@/lib/types'

export default async function AnfrageVorabPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const [template, { data: lead, error }] = await Promise.all([
    loadBetreuerVorabTemplate(),
    supabase
      .from('leads')
      .select(
        'id, situation, bereiche, kundentyp, funnel_daten, preis_min, preis_max, kontakt_name, kunden(name)'
      )
      .eq('id', params.id)
      .maybeSingle(),
  ])

  if (error || !lead) notFound()
  if (!template) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
        <p className="font-medium">Kein Betreuer-Template gefunden.</p>
        <p className="mt-1">Bitte unter Formulare ein aktives Template mit Typ „Betreuer“ anlegen.</p>
      </div>
    )
  }

  const { data: vorab } = await supabase
    .from('vorab_formulare')
    .select('daten')
    .eq('lead_id', params.id)
    .maybeSingle()

  const row = lead as Lead & {
    kunden: { name: string } | null | { name: string }[] | undefined
  }
  const ku = row.kunden
  const kundeName =
    ku == null ? null : Array.isArray(ku) ? ku[0]?.name ?? null : ku.name
  const name = kundeName ?? row.kontakt_name ?? 'Anfrage'
  const savedDaten = (vorab?.daten as Record<string, unknown> | undefined) ?? {}

  const initialDaten = buildInitialVorOrtFormDaten(row, savedDaten)

  return (
    <VorOrtAufnahmeClient
      leadId={params.id}
      templateId={template.id}
      kundenName={name}
      websitePreisMin={row.preis_min ?? null}
      websitePreisMax={row.preis_max ?? null}
      initialDaten={initialDaten}
    />
  )
}
