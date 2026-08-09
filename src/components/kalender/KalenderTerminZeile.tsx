'use client'

import { AppEntityListRow } from '@/components/layout/app'
import { TerminMarker } from '@/components/kalender/TerminMarker'
import { KALENDER_TYP_LABEL } from '@/lib/kalender-styles'
import type { KalenderTermin } from '@/lib/types'
import { cn, formatDatum } from '@/lib/utils'

export function kalenderTitelZeile(t: KalenderTermin): string {
  if (t.titel?.trim()) return t.titel.trim()
  const l = t.leads?.kontakt_name
  const k = t.auftraege?.kunden?.name
  const a = t.auftraege?.titel
  return l || a || k || 'Termin'
}

function formatUhrzeit(von: string | null, bis: string | null): string {
  const v = von?.slice(0, 5) ?? ''
  const b = bis?.slice(0, 5) ?? ''
  if (v && b) return `${v}–${b}`
  if (v) return v
  return 'Ganztägig'
}

function faelligkeitLabel(termin: KalenderTermin, showFaelligkeit: boolean): string {
  if (!showFaelligkeit) return termin.uhrzeit_von?.slice(0, 5) ?? 'Ganztägig'
  const zeit = termin.uhrzeit_von?.slice(0, 5)
  const datum = formatDatum(termin.datum)
  return zeit ? `${datum} · ${zeit}` : datum
}

export function KalenderTerminZeile({
  termin,
  onClick,
  className,
  showTyp = true,
  showFaelligkeit = false,
}: {
  termin: KalenderTermin
  onClick?: () => void
  className?: string
  showTyp?: boolean
  showFaelligkeit?: boolean
}) {
  const line2Parts = [showTyp ? KALENDER_TYP_LABEL[termin.typ] : null]
  if (termin.adresse?.trim()) line2Parts.push(termin.adresse.trim())
  else if (!showTyp) line2Parts.push(formatUhrzeit(termin.uhrzeit_von, termin.uhrzeit_bis))

  return (
    <AppEntityListRow
      onClick={onClick}
      className={cn('rounded-none border-0 border-b border-bw-border shadow-none', className)}
      avatar={
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-bw-hover">
          <TerminMarker typ={termin.typ} className="h-3 w-3 rounded-full" />
        </span>
      }
      eyebrow={faelligkeitLabel(termin, showFaelligkeit)}
      title={kalenderTitelZeile(termin)}
      line2={line2Parts.filter(Boolean).join(' · ')}
    />
  )
}
