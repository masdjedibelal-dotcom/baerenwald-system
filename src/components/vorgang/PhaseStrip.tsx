'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { ProjektKontext } from '@/lib/crm/projekt-kontext-types'
import { hrefWithAkteFrom, type AkteFromRef } from '@/lib/vorgang/akte-from'
import { cn } from '@/lib/utils'

type SlotKind = 'anfrage' | 'angebot' | 'auftrag' | 'rechnung'

type Slot = {
  kind: SlotKind
  title: string
  href: string | null
  active: boolean
}

/**
 * Projekt-Kette Anfrage → Angebot → Auftrag → Rechnung (Spec §1.2).
 * Fehlende Phasen: tertiary, nicht klickbar.
 */
export function PhaseStrip({
  kontext,
  fromRef,
  className,
}: {
  kontext: ProjektKontext
  /** 1-Ebene Rückweg beim Sprung */
  fromRef?: AkteFromRef | null
  className?: string
}) {
  const slots = buildSlots(kontext, fromRef)
  if (slots.every((s) => !s.href && !s.active)) return null

  return (
    <nav
      aria-label="Projekt-Phasen"
      className={cn('phase-strip', className)}
    >
      {slots.map((slot, i) => (
        <span key={slot.kind} className="phase-strip__item">
          {i > 0 ? (
            <ChevronRight className="phase-strip__chev" aria-hidden />
          ) : null}
          {slot.active ? (
            <span className="phase-strip__active" aria-current="page">
              {slot.title}
            </span>
          ) : slot.href ? (
            <Link href={slot.href} className="phase-strip__link">
              {slot.title}
            </Link>
          ) : (
            <span className="phase-strip__empty">{slot.title}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

function buildSlots(kontext: ProjektKontext, fromRef?: AkteFromRef | null): Slot[] {
  const withFrom = (href: string) =>
    fromRef ? hrefWithAkteFrom(href, fromRef) : href

  const angebot =
    kontext.activeKind === 'angebot'
      ? kontext.angebote.find((a) => a.id === kontext.activeId) ?? kontext.angebote[0]
      : kontext.angebote[0]

  const rechnung =
    kontext.activeKind === 'rechnung'
      ? kontext.rechnungen.find((r) => r.id === kontext.activeId)
      : kontext.rechnungen[0]

  return [
    {
      kind: 'anfrage',
      title: 'Anfrage',
      href: kontext.lead ? withFrom(`/anfragen/${kontext.lead.id}`) : null,
      active: kontext.activeKind === 'anfrage',
    },
    {
      kind: 'angebot',
      title: 'Angebot',
      href: angebot ? withFrom(`/angebote/${angebot.id}`) : null,
      active: kontext.activeKind === 'angebot',
    },
    {
      kind: 'auftrag',
      title: 'Auftrag',
      href: kontext.auftrag ? withFrom(`/auftraege/${kontext.auftrag.id}`) : null,
      active: kontext.activeKind === 'auftrag',
    },
    {
      kind: 'rechnung',
      title: 'Rechnung',
      href: rechnung ? withFrom(`/rechnungen/${rechnung.id}`) : null,
      active: kontext.activeKind === 'rechnung',
    },
  ]
}
