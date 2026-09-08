import { cn } from '@/lib/utils'

/** Portal-Registrierung = verknüpfter Auth-Account (`auth_user_id`). */
export function istPortalRegistriert(authUserId: string | null | undefined): boolean {
  return Boolean(String(authUserId ?? '').trim())
}

/** Grüner/roter Punkt: Portal registriert oder nicht (Listen + Mobile hinter Name). */
export function PortalRegistriertDot({
  registered,
  className,
}: {
  registered: boolean
  className?: string
}) {
  const label = registered ? 'Portal registriert' : 'Portal nicht registriert'
  return (
    <span
      className={cn('dot', registered ? 'green' : 'red', 'shrink-0', className)}
      title={label}
      aria-label={label}
      role="img"
    />
  )
}
