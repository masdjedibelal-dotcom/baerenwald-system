import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { AbnahmeprotokollCreateWizard } from '@/components/auftraege/AbnahmeprotokollCreateWizard'
import {
  loadAbnahmeprotokollSummary,
  loadOffenenAbnahmeEntwurf,
} from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import { loadAuftragDetail } from '@/app/(dashboard)/auftraege/auftraege-data'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { buildDefaultAbnahmeMetaFromAuftrag } from '@/lib/auftraege/abnahme-protokoll-html-payload'
import { formatAuftragsNr } from '@/lib/auftraege/auftrag-liste-helpers'
import { maengelCheckItemsFromStored } from '@/lib/auftraege/abnahme-protokoll-types'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { loadWizardContext } from '@/lib/wizard-context'

export default async function AuftragAbnahmeErstellenPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { protokollId?: string }
}) {
  const detail = await loadAuftragDetail(params.id, { mode: 'tabs' })
  if (!detail) notFound()

  const supabase = createClient()
  const protokollId = searchParams?.protokollId?.trim() || null

  const [wizardCtx, firm, existing] = await Promise.all([
    loadWizardContext(supabase),
    fetchFirmenEinstellungen(supabase),
    // Mit ID: genau dieses Protokoll. Ohne: nur offenen Entwurf — nie blind freigegebene laden.
    protokollId
      ? loadAbnahmeprotokollSummary(params.id, protokollId)
      : loadOffenenAbnahmeEntwurf(params.id),
  ])

  const angebot = Array.isArray(detail.angebote) ? detail.angebote[0] : detail.angebote
  const angebotPositionen = normalizeAngebotPositionen(
    (angebot as { positionen?: unknown } | null)?.positionen
  )
  const defaults = buildDefaultAbnahmeMetaFromAuftrag(detail, firm)
  const kundeName =
    detail.kunden?.name?.trim() ||
    [detail.kunden?.vorname, detail.kunden?.nachname].filter(Boolean).join(' ').trim() ||
    'Kunde'

  const initialMaengelItems = existing
    ? maengelCheckItemsFromStored(existing.maengel, existing.punkte)
    : []

  return (
    <AbnahmeprotokollCreateWizard
      auftragId={detail.id}
      positionen={detail.auftrag_positionen ?? []}
      angebotPositionen={angebotPositionen}
      gewerke={wizardCtx.gewerke.map((g) => ({ id: g.id, name: g.name, slug: g.slug }))}
      kundeName={kundeName}
      auftragsLabel={formatAuftragsNr(detail)}
      initialMeta={{ ...defaults, ...(existing?.meta ?? {}) }}
      initialPunkte={existing?.punkte}
      initialAbnahmeDatum={existing?.abnahme_datum}
      initialNotizen={existing?.notizen}
      initialMaengelItems={initialMaengelItems}
      initialFreigabeStatus={existing?.freigabe_status ?? null}
      isEdit={Boolean(existing)}
      protokollId={existing?.id ?? null}
    />
  )
}
