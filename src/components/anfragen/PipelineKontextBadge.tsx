import {
  PIPELINE_KONTEXT_LABELS,
  resolvePipelineKontext,
  type PipelineKontextLead
} from '@/lib/leads/pipeline-kontext'

export function PipelineKontextBadge({ lead }: { lead: PipelineKontextLead }) {
  const ctx = resolvePipelineKontext(lead)
  // Eigene Anfragen sind der Normalfall — Etikett nur, wenn es etwas aussagt (HV, Website)
  if (ctx === 'direktkunde' || ctx === 'sonstiges') return null
  const label = PIPELINE_KONTEXT_LABELS[ctx]
  const cls =
    ctx === 'hv_meldung'
      ? 'bg-status-order-bg text-status-order-text border-status-order-bg'
      : 'bg-bw-surface-alt text-bw-muted border-bw-border'

  return (
    <span className={`inline-flex items-center rounded-card border px-2 py-0.5 text-[length:var(--fs-meta)] font-medium ${cls}`}>
      {label}
    </span>
  )
}
