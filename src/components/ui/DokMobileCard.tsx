'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { ListRowCheck } from '@/components/ui/ListRowCheck'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Dokument als Listenzeile (mobil wie eine Tabelle, keine Karte in der Karte):
 * Name + Meta links, Kennzeichnung und Pfeil rechts.
 */
export function DokMobileCard({
  title,
  badge,
  meta,
  onClick,
  className,
  children,
  menu,
  auswahl,
}: {
  title: string
  badge?: ReactNode
  meta?: string | null
  onClick?: () => void
  className?: string
  children?: ReactNode
  /** „…“-Menü (z. B. Löschen) — Klick öffnet nicht die Datei */
  menu?: ReactNode
  /** Häkchen für Mehrfachauswahl; `null` = Platzhalter (Zeile nicht löschbar) */
  auswahl?: { checked: boolean; onToggle: () => void } | null
}) {
  return (
    <div
      className={cn('dok-zeile', onClick && 'is-klickbar', className)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    >
      {auswahl ? (
        <ListRowCheck
          className="dok-zeile__check"
          checked={auswahl.checked}
          onToggle={auswahl.onToggle}
          title={auswahl.checked ? 'Auswahl aufheben' : 'Auswählen'}
        />
      ) : auswahl === null ? (
        <span className="dok-zeile__check" aria-hidden />
      ) : null}
      <div className="dok-zeile__main">
        <span className="dok-zeile__titel">{title}</span>
        {meta ? <span className="dok-zeile__meta">{meta}</span> : null}
        {children}
      </div>
      {badge ? <div className="dok-zeile__badge">{badge}</div> : null}
      {menu ? (
        <div className="dok-zeile__menu" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          {menu}
        </div>
      ) : onClick ? (
        <MockIcon n="chevron-right" ctx="default" className="dok-zeile__chev h-4 w-4" aria-hidden />
      ) : null}
    </div>
  )
}
