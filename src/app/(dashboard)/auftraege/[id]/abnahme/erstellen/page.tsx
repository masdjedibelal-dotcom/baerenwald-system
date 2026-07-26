import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { loadAuftragDetail } from '@/app/(dashboard)/auftraege/auftraege-data'
import { AbnahmeprotokollCreateWizard } from '@/components/auftraege/AbnahmeprotokollCreateWizard'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { buildDefaultAbnahmeMetaFromAuftrag } from '@/lib/auftraege/abnahme-protokoll-html-payload'
import { formatAuftragsNr, auftragTitel } from '@/lib/auftraege/auftrag-liste-helpers'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import type { AngebotPosition } from '@/lib/types'

export default async function AuftragAbnahmeErstellenPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const [detail, firm, gwRes] = await Promise.all([
    loadAuftragDetail(params.id),
    fetchFirmenEinstellungen(supabase),
    supabase.from('gewerke').select('id, name, slug').eq('aktiv', true).order('name'),
  ])

  if (!detail?.kunden) notFound()

  const ang = Array.isArray(detail.angebote) ? detail.angebote[0] : detail.angebote
  const angebotPositionen = normalizeAngebotPositionen(
    (ang as { positionen?: unknown } | null)?.positionen
  ) as AngebotPosition[]

  const initialMeta = buildDefaultAbnahmeMetaFromAuftrag(detail, firm)
  const kundeName = detail.kunden.name?.trim() || 'Kunde'

  return (
    <AbnahmeprotokollCreateWizard
      auftragId={detail.id}
      positionen={detail.auftrag_positionen ?? []}
      angebotPositionen={angebotPositionen}
      gewerke={(gwRes.data ?? []) as { id: string; name: string; slug: string }[]}
      kundeName={kundeName}
      auftragsLabel={formatAuftragsNr(detail) || auftragTitel(detail)}
      initialMeta={initialMeta}
    />
  )
}
