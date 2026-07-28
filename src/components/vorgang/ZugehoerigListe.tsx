'use client'

import Link from 'next/link'
import { FileText, ClipboardList, FileSpreadsheet, Inbox } from 'lucide-react'
import type { ProjektKontext } from '@/lib/crm/projekt-kontext-types'
import { formatDatum } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { hrefWithAkteFrom, type AkteFromRef } from '@/lib/vorgang/akte-from'
import {
  abnahmeMetaKurz,
  anfrageStatusKurz,
  angebotNrAnzeige,
  angebotStatusKurz,
  auftragStatusKurz,
  formatEurKurz,
  rechnungStatusKurz,
} from '@/lib/vorgang/projekt-kontext-labels'

export type ZugehoerigAbnahme = {
  id: string
  abnahme_datum: string
  pdf_url?: string | null
  an_kunde_gesendet_at?: string | null
}

type Row = {
  key: string
  icon: 're' | 'au' | 'ag' | 'an' | 'ab'
  label: string
  meta: string
  href: string
  active: boolean
}

/**
 * Orientierungs-Anker — 1-Zeiler, keine Karten (Spec §3.5 / Welle 2).
 */
export function ZugehoerigListe({
  kontext,
  abnahmen = [],
  fromRef,
  className,
}: {
  kontext: ProjektKontext | null | undefined
  abnahmen?: ZugehoerigAbnahme[]
  /** Wenn gesetzt: Links bekommen ?from= (1 Ebene). */
  fromRef?: AkteFromRef | null
  className?: string
}) {
  if (!kontext) return null

  const rows: Row[] = []
  const withFrom = (href: string) =>
    fromRef ? hrefWithAkteFrom(href.split('?')[0]!, fromRef) : href

  if (kontext.lead && kontext.activeKind !== 'anfrage') {
    rows.push({
      key: `anfrage-${kontext.lead.id}`,
      icon: 'an',
      label: kontext.lead.label || 'Anfrage',
      meta: anfrageStatusKurz(kontext.lead.status),
      href: withFrom(`/anfragen/${kontext.lead.id}`),
      active: false,
    })
  }

  for (const a of kontext.angebote.slice(0, 3)) {
    const betrag = a.gesamt_fix ?? a.gesamt_max ?? a.gesamt_min
    rows.push({
      key: `angebot-${a.id}`,
      icon: 'ag',
      label: angebotNrAnzeige(a.angebotsnr, a.id),
      meta: [angebotStatusKurz(a.status, a.status_einfach), formatEurKurz(betrag)]
        .filter(Boolean)
        .join(' · '),
      href: withFrom(`/angebote/${a.id}`),
      active: kontext.activeKind === 'angebot' && kontext.activeId === a.id,
    })
  }

  if (kontext.auftrag) {
    rows.push({
      key: `auftrag-${kontext.auftrag.id}`,
      icon: 'au',
      label: kontext.auftrag.titel?.trim() || 'Auftrag',
      meta: auftragStatusKurz(kontext.auftrag.status),
      href: withFrom(`/auftraege/${kontext.auftrag.id}`),
      active: kontext.activeKind === 'auftrag' && kontext.activeId === kontext.auftrag.id,
    })
  }

  const res = [...kontext.rechnungen].sort((a, b) =>
    String(b.rechnungsdatum || b.created_at || '').localeCompare(
      String(a.rechnungsdatum || a.created_at || '')
    )
  )
  for (const r of res) {
    rows.push({
      key: `rechnung-${r.id}`,
      icon: 're',
      label: r.rechnungsnummer?.trim() || 'Rechnung',
      meta: [
        r.rechnungsdatum ? formatDatum(r.rechnungsdatum) : null,
        formatEurKurz(r.brutto),
        rechnungStatusKurz(r.status),
      ]
        .filter(Boolean)
        .join(' · '),
      href: withFrom(`/rechnungen/${r.id}`),
      active: kontext.activeKind === 'rechnung' && kontext.activeId === r.id,
    })
  }

  for (const p of abnahmen) {
    rows.push({
      key: `abnahme-${p.id}`,
      icon: 'ab',
      label: `Abnahme ${formatDatum(p.abnahme_datum)}`,
      meta: abnahmeMetaKurz({
        anKundeGesendetAt: p.an_kunde_gesendet_at,
        pdfUrl: p.pdf_url,
      }),
      href: kontext.auftrag
        ? withFrom(`/auftraege/${kontext.auftrag.id}?tab=ausfuehrung`)
        : '#',
      active: false,
    })
  }

  if (!rows.length) return null

  return (
    <section className={cn('zugehoerig-liste', className)} aria-label="Zugehörig">
      <h3 className="text-[length:var(--fs-head)] mb-2">Zugehörig</h3>
      <ul className="divide-y divide-[var(--app-separator)] rounded-xl border border-[var(--app-separator)] bg-[var(--bw-bg-paper)]">
        {rows.map((row) => (
          <li key={row.key}>
            <Link
              href={row.href}
              className={cn(
                'flex min-h-[44px] items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-bw-hover',
                row.active && 'bg-bw-primary/5'
              )}
            >
              <RowIcon kind={row.icon} />
              <span className="text-body min-w-0 flex-1 truncate font-medium">{row.label}</span>
              <span className="text-[length:var(--fs-meta)] shrink-0 truncate max-w-[45%]">{row.meta}</span>
              {row.active ? (
                <span className="text-[length:var(--fs-meta)] shrink-0 font-semibold text-bw-primary">Hier</span>
              ) : (
                <span className="text-[length:var(--fs-meta)] shrink-0 text-bw-text-muted" aria-hidden>
                  →
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function RowIcon({ kind }: { kind: Row['icon'] }) {
  const cls = 'h-4 w-4 shrink-0 text-bw-text-muted'
  switch (kind) {
    case 're':
      return <FileSpreadsheet className={cls} aria-hidden />
    case 'au':
      return <ClipboardList className={cls} aria-hidden />
    case 'ag':
      return <FileText className={cls} aria-hidden />
    case 'an':
      return <Inbox className={cls} aria-hidden />
    case 'ab':
      return <ClipboardList className={cls} aria-hidden />
  }
}
