import {
  portalSyncDivergiert,
  PIPELINE_KONTEXT_LABELS,
  resolvePipelineKontext,
  type PipelineKontextLead,
  type PortalSyncLead,
} from '@/lib/leads/pipeline-kontext'

export function PipelineKontextBadge({ lead }: { lead: PipelineKontextLead }) {
  const ctx = resolvePipelineKontext(lead)
  const label = PIPELINE_KONTEXT_LABELS[ctx]
  const cls =
    ctx === 'hv_meldung'
      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
      : ctx === 'direktkunde'
        ? 'bg-sky-50 text-sky-900 border-sky-200'
        : 'bg-bw-surface-alt text-bw-muted border-bw-border'

  return (
    <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

export function PortalSyncWarning({
  lead,
  auftragStatus,
}: {
  lead: PortalSyncLead
  auftragStatus?: string | null
}) {
  if (!portalSyncDivergiert(lead, auftragStatus)) return null
  return (
    <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
      Portal-Status weicht vom CRM-Auftrag ab. Nach Deploy/Sync: Auftrag erneut abschließen oder kurz warten,
      bis die Synchronisation greift.
    </p>
  )
}
