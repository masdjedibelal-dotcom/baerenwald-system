import { cn } from '@/lib/utils'

export type HubSpotStatusType =
  | 'new'
  | 'contacted'
  | 'offer'
  | 'order'
  | 'done'
  | 'cancel'

const STATUS_CONFIG: Record<
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

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: HubSpotStatusType
  label?: string
  className?: string
}) {
  const config = STATUS_CONFIG[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5', config.className, className)}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden />
      {label ?? config.label}
    </span>
  )
}
