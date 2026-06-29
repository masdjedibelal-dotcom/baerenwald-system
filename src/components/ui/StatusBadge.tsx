import { cn } from '@/lib/utils'

/** Semantische Varianten — eine Sprache für alle Entitäts-Badges (Phase D). */
export type StatusBadgeVariant = 'neutral' | 'active' | 'success' | 'danger' | 'warning'

const VARIANT_CLASS: Record<StatusBadgeVariant, string> = {
  neutral: 'badge badge-plain badge-no-dot',
  active: 'badge badge-order',
  success: 'badge badge-done',
  danger: 'badge badge-cancel',
  warning: 'badge badge-contacted',
}

/** Legacy-HubSpot-Typen (Kunden, Rechnungen, Partner) — visuell unverändert. */
export type HubSpotStatusType =
  | 'new'
  | 'contacted'
  | 'offer'
  | 'order'
  | 'done'
  | 'cancel'

const LEGACY_CONFIG: Record<
  HubSpotStatusType,
  {
    label: string
    className: string
  }
> = {
  new: { label: 'Neu', className: 'badge-new' },
  contacted: { label: 'Kontaktiert', className: 'badge-contacted' },
  offer: { label: 'Angebot', className: 'badge-offer' },
  order: { label: 'Auftrag', className: 'badge-order' },
  done: { label: 'Abgeschlossen', className: 'badge-done' },
  cancel: { label: 'Abgebrochen', className: 'badge-cancel' },
}

type StatusBadgeProps = {
  label?: string
  variant?: StatusBadgeVariant
  /** Legacy: HubSpot-Status — nutzt bestehende badge-*-Klassen. */
  status?: HubSpotStatusType
  className?: string
  dot?: boolean
  title?: string
}

export function StatusBadge({
  label,
  variant,
  status,
  className,
  dot = false,
  title,
}: StatusBadgeProps) {
  if (status && !variant) {
    const config = LEGACY_CONFIG[status]
    return (
      <span
        title={title}
        className={cn('badge', dot ? config.className : `badge-no-dot ${config.className}`, className)}
      >
        {label ?? config.label}
      </span>
    )
  }

  const resolvedVariant = variant ?? 'neutral'
  const base = VARIANT_CLASS[resolvedVariant]
  return (
    <span
      title={title}
      className={cn(base, dot && resolvedVariant === 'neutral' && 'badge-dot', className)}
    >
      {label ?? ''}
    </span>
  )
}
