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
      ? 'bg-status-order-bg text-status-order-text border-status-order-bg'
      : ctx === 'direktkunde'
        ? 'bg-status-new-bg text-status-new-text border-status-new-bg'
        : 'bg-bw-surface-alt text-bw-muted border-bw-border'

  return (
    <span className={`inline-flex items-center rounded-card border px-2 py-0.5 text-[length:var(--fs-meta)] font-medium ${cls}`}>
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
    <p className="rounded-card border border-status-contact-bg bg-status-contact-bg px-3 py-2 text-[length:var(--fs-meta)] text-status-contact-text">
      Portal-Status weicht vom CRM-Auftrag ab. Nach Deploy/Sync: Auftrag erneut abschließen oder kurz warten,
      bis die Synchronisation greift.
    </p>
  )
}
