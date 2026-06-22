'use client'

import Link from 'next/link'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AngebotEinfachStatusBadge } from '@/components/ui/AngebotEinfachStatusBadge'
import { AuftragStatusBadge } from '@/components/ui/AuftragStatusBadge'
import { LeadStatusBadge } from '@/components/ui/Badge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { RECHNUNG_STATUS_LABELS, type RechnungStatus } from '@/lib/rechnung-config'
import { buildKundeProjektBaeume, type KundeProjektAst } from '@/lib/crm/build-kunde-projekt-baum'
import type { KundeDetailPayload } from '@/lib/kunden/load-kunde-detail'
import { cn } from '@/lib/utils'

type Props = {
  kunde: KundeDetailPayload
}

function AstKnoten({
  ast,
  defaultOpen,
}: {
  ast: KundeProjektAst
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen ?? false)

  return (
    <div className="rounded-lg border border-bw-border bg-white">
      <button
        type="button"
        className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-bw-hover/40"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-bw-text-muted" aria-hidden />
        ) : (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-bw-text-muted" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={ast.leadHref}
              className="font-medium text-bw-text hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {ast.leadLabel}
            </Link>
            <LeadStatusBadge status={ast.leadStatus as never} />
          </div>
          <p className="mt-0.5 text-xs text-bw-text-muted">
            {ast.angebote.length} Angebot{ast.angebote.length === 1 ? '' : 'e'}
            {ast.auftrag ? ' · Auftrag' : ''}
            {ast.rechnungen.length ? ` · ${ast.rechnungen.length} Rechnung${ast.rechnungen.length === 1 ? '' : 'en'}` : ''}
          </p>
        </div>
      </button>

      {open ? (
        <div className="space-y-3 border-t border-bw-border px-3 py-3 pl-9">
          {ast.angebote.length > 0 ? (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-bw-text-muted">
                Angebote
              </p>
              <ul className="space-y-1.5">
                {ast.angebote.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <Link href={a.href} className="hover:underline">
                      {a.label}
                    </Link>
                    <span className="flex items-center gap-2">
                      <AngebotEinfachStatusBadge status={a.statusEinfach} />
                      <span className="tabular-nums text-bw-text-muted">{a.betrag}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {ast.auftrag ? (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-bw-text-muted">
                Auftrag
              </p>
              <Link
                href={ast.auftrag.href}
                className="flex flex-wrap items-center justify-between gap-2 text-sm hover:underline"
              >
                <span>{ast.auftrag.titel}</span>
                <AuftragStatusBadge status={ast.auftrag.status} />
              </Link>
            </div>
          ) : null}

          {ast.rechnungen.length > 0 ? (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-bw-text-muted">
                Rechnungen
              </p>
              <ul className="space-y-1.5">
                {ast.rechnungen.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <Link href={r.href} className="hover:underline">
                      {r.nummer}
                    </Link>
                    <span className="flex items-center gap-2">
                      <StatusBadge
                        status="done"
                        label={RECHNUNG_STATUS_LABELS[r.status as RechnungStatus] ?? r.status}
                      />
                      <span className="tabular-nums text-bw-text-muted">{r.betrag}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function KundenVorgaengeBaum({ kunde }: Props) {
  const baeume = useMemo(() => buildKundeProjektBaeume(kunde), [kunde])

  if (!baeume.length) {
    return (
      <p className="py-4 text-center text-sm text-bw-text-muted">
        Noch keine Vorgänge.{' '}
        <Link href={`/anfragen?neu=1&kunde_id=${kunde.id}`} className="text-bw-link hover:underline">
          Anfrage anlegen
        </Link>
      </p>
    )
  }

  return (
    <div className={cn('space-y-2')}>
      {baeume.map((ast, i) => (
        <AstKnoten key={ast.leadId} ast={ast} defaultOpen={i === 0} />
      ))}
    </div>
  )
}
