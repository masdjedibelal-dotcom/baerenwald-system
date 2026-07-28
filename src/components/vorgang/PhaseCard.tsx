'use client'

import Link from 'next/link'
import type { ProjektKontext } from '@/lib/crm/projekt-kontext-types'
import { formatDatum } from '@/lib/utils'
import { hrefWithAkteFrom, type AkteFromRef } from '@/lib/vorgang/akte-from'
import {
  anfrageStatusKurz,
  angebotNrAnzeige,
  angebotStatusKurz,
  auftragStatusKurz,
  formatEurKurz,
  rechnungStatusKurz,
} from '@/lib/vorgang/projekt-kontext-labels'
import { cn } from '@/lib/utils'

export type PhaseCardProps = {
  title: string
  line1: string
  line2?: string | null
  href: string
  className?: string
}

/** Fremde Phase in Übersicht — ganze Karte = Navigation (Spec §1.3). */
export function PhaseCard({ title, line1, line2, href, className }: PhaseCardProps) {
  return (
    <Link href={href} className={cn('phase-card', className)}>
      <div className="phase-card__head">
        <span className="text-[length:var(--fs-head)]">{title}</span>
        <span className="phase-card__open text-[length:var(--fs-meta)]">Öffnen →</span>
      </div>
      <p className="text-body phase-card__line1">{line1}</p>
      {line2 ? <p className="text-[length:var(--fs-meta)] phase-card__line2">{line2}</p> : null}
    </Link>
  )
}

/**
 * Nur Nachbar-Phasen (prev/next) — volle Liste bleibt Zugehörig (Spec §3.2 vs §3.5).
 */
export function PhaseCardsBlock({
  kontext,
  fromRef,
  className,
}: {
  kontext: ProjektKontext | null | undefined
  fromRef?: AkteFromRef | null
  className?: string
}) {
  if (!kontext) return null
  const withFrom = (href: string) =>
    fromRef ? hrefWithAkteFrom(href, fromRef) : href

  const cards: PhaseCardProps[] = []
  const kind = kontext.activeKind
  const angebot = kontext.angebote[0]
  const latestRe = [...kontext.rechnungen].sort((a, b) =>
    String(b.rechnungsdatum || b.created_at || '').localeCompare(
      String(a.rechnungsdatum || a.created_at || '')
    )
  )[0]

  if (kind === 'anfrage' && angebot) {
    const nr = angebotNrAnzeige(angebot.angebotsnr, angebot.id)
    cards.push({
      title: 'Angebot',
      line1: `${nr} · ${angebotStatusKurz(angebot.status, angebot.status_einfach)}`,
      line2: formatEurKurz(angebot.gesamt_fix ?? angebot.gesamt_max ?? angebot.gesamt_min),
      href: withFrom(`/angebote/${angebot.id}`),
    })
  }

  if (kind === 'angebot') {
    if (kontext.lead) {
      cards.push({
        title: 'Anfrage',
        line1: kontext.lead.label || 'Anfrage',
        line2: anfrageStatusKurz(kontext.lead.status),
        href: withFrom(`/anfragen/${kontext.lead.id}`),
      })
    }
    if (kontext.auftrag) {
      cards.push({
        title: 'Auftrag',
        line1: [
          kontext.auftrag.titel?.trim() || 'Auftrag',
          auftragStatusKurz(kontext.auftrag.status),
        ].join(' · '),
        href: withFrom(`/auftraege/${kontext.auftrag.id}`),
      })
    }
  }

  if (kind === 'auftrag') {
    if (angebot) {
      const nr = angebotNrAnzeige(angebot.angebotsnr, angebot.id)
      cards.push({
        title: 'Angebot',
        line1: `${nr} · ${angebotStatusKurz(angebot.status, angebot.status_einfach)}`,
        href: withFrom(`/angebote/${angebot.id}`),
      })
    }
    if (latestRe) {
      cards.push({
        title: 'Rechnung',
        line1: [
          latestRe.rechnungsnummer?.trim() || 'Rechnung',
          latestRe.rechnungsdatum ? formatDatum(latestRe.rechnungsdatum) : null,
          formatEurKurz(latestRe.brutto),
          rechnungStatusKurz(latestRe.status),
        ]
          .filter(Boolean)
          .join(' · '),
        href: withFrom(`/rechnungen/${latestRe.id}`),
      })
    }
  }

  if (kind === 'rechnung' && kontext.auftrag) {
    cards.push({
      title: 'Auftrag',
      line1: [
        kontext.auftrag.titel?.trim() || 'Auftrag',
        auftragStatusKurz(kontext.auftrag.status),
      ].join(' · '),
      line2: kontext.auftrag.created_at
        ? `Seit ${formatDatum(kontext.auftrag.created_at)}`
        : null,
      href: withFrom(`/auftraege/${kontext.auftrag.id}`),
    })
  }

  if (!cards.length) return null

  return (
    <div className={cn('phase-cards-block space-y-2', className)} aria-label="Weitere Phasen">
      {cards.map((c) => (
        <PhaseCard key={c.href + c.title} {...c} />
      ))}
    </div>
  )
}
