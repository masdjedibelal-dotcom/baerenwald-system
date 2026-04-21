import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import { AnfragenListeClient } from '@/components/anfragen/AnfragenListeClient'
import type { LeadWithAngebote } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Anfragen',
}

export const revalidate = 60

export default async function AnfragenPage() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('leads')
    .select(
      `
      id,
      kunde_id,
      status,
      kanal,
      situation,
      bereiche,
      bereiche_sonstiges,
      budget_ca,
      preis_min,
      preis_max,
      plz,
      zeitraum,
      zeitraum_von,
      zeitraum_bis,
      kundentyp,
      funnel_daten,
      kontakt_name,
      kontakt_email,
      kontakt_telefon,
      kontakt_nachricht,
      notizen,
      erstellt_von,
      created_at,
      updated_at,
      kunden(id, name, email, telefon),
      angebote(id, status, gesamt_fix, gesamt_min, gesamt_max, created_at)
    `
    )
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return (
      <div className="rounded-lg border border-status-cancel-bg bg-status-cancel-bg/30 p-4 text-sm text-status-cancel-text">
        <p className="font-medium">Anfragen konnten nicht geladen werden.</p>
        <p className="mt-1 opacity-90">{error.message}</p>
        <p className="mt-2 text-xs text-bw-text-muted">
          Hinweis: Relation „angebote“ benötigt <code className="rounded bg-bw-card px-1">lead_id</code> auf{' '}
          <code className="rounded bg-bw-card px-1">angebote</code>.
        </p>
      </div>
    )
  }

  return <AnfragenListeClient leads={(data ?? []) as unknown as LeadWithAngebote[]} />
}
