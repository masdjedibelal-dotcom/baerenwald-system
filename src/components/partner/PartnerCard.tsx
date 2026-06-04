'use client'

import { Phone, Mail, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PartnerRow } from '@/components/partner/PartnerNetzwerkClient'

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function PartnerCard({
  partner,
  onOpen,
  onEdit,
}: {
  partner: PartnerRow
  onOpen: () => void
  onEdit: () => void
}) {
  const kategorie = partner.partner_kategorien?.name?.trim() || partner.subkategorie?.trim() || null
  const initials = initialsFromName(partner.name)

  return (
    <article
      className={cn(
        'flex flex-col rounded-lg border border-bw-border bg-bw-card p-4 shadow-card',
        'transition-colors hover:border-bw-primary/30 hover:bg-bw-hover/40'
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 flex-col text-left"
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-bw-green-bg text-base font-semibold tracking-wide text-bw-primary"
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-semibold text-bw-text">{partner.name}</h3>
            {kategorie ? (
              <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-bw-text-muted">
                {kategorie}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-3 space-y-1.5 text-sm text-bw-text-muted">
          {partner.telefon ? (
            <div className="flex items-center gap-2 min-w-0">
              <Phone className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              <span className="truncate">{partner.telefon}</span>
            </div>
          ) : null}
          {partner.email ? (
            <div className="flex items-center gap-2 min-w-0">
              <Mail className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              <span className="truncate">{partner.email}</span>
            </div>
          ) : null}
          {partner.adresse ? (
            <div className="flex items-start gap-2 min-w-0">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              <span className="line-clamp-2">{partner.adresse}</span>
            </div>
          ) : null}
        </div>
      </button>

      <div className="mt-4 flex flex-col gap-2 border-t border-bw-border pt-3 sm:flex-row sm:flex-wrap">
        {partner.telefon ? (
          <a
            href={`tel:${partner.telefon.replace(/\s/g, '')}`}
            className="btn-secondary btn-sm inline-flex w-full justify-center gap-1.5 sm:w-auto sm:flex-1 sm:min-w-[7rem]"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="h-3.5 w-3.5" aria-hidden />
            Anrufen
          </a>
        ) : null}
        {partner.email ? (
          <a
            href={`mailto:${partner.email}`}
            className="btn-secondary btn-sm inline-flex w-full justify-center gap-1.5 sm:w-auto sm:flex-1 sm:min-w-[7rem]"
            onClick={(e) => e.stopPropagation()}
          >
            <Mail className="h-3.5 w-3.5" aria-hidden />
            Mail
          </a>
        ) : null}
        <button
          type="button"
          className="btn-ghost btn-sm w-full justify-center text-bw-link sm:ml-auto sm:w-auto sm:justify-start"
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
        >
          Bearbeiten
        </button>
      </div>
    </article>
  )
}
