import type { KalenderTermin } from '@/lib/types'
import { kalenderTypMarkerClass } from '@/lib/kalender-styles'
import { cn } from '@/lib/utils'

/** 3px farbiger Linke-Marker für Termin-Zeilen (Mockup). */
export function TerminMarker({
  typ,
  className,
}: {
  typ: KalenderTermin['typ']
  className?: string
}) {
  return <span className={cn(kalenderTypMarkerClass(typ), className)} aria-hidden />
}
