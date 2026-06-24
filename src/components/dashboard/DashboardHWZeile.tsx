'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Check, X } from 'lucide-react'
import { SidePanel } from '@/components/ui/SidePanel'
import { IconText } from '@/components/ui/IconText'
import type { HandwerkerZeile } from '@/components/handwerker/HandwerkerListeClient'
import { handwerkerDisplayName, handwerkerGfName } from '@/lib/handwerker-stammdaten'

function gewerkKurz(h: HandwerkerZeile): string {
  const g = h.gewerke
  if (g == null || g === '') return '—'
  if (typeof g === 'string') return g
  if (Array.isArray(g)) return g.slice(0, 2).join(', ')
  if (typeof g === 'object' && g !== null && 'name' in g) return String((g as { name: string }).name)
  return '—'
}

function ComplianceHint({ h }: { h: HandwerkerZeile }) {
  const s = h.compliance_status ?? ''
  if (s === 'vollständig') {
    return (
      <span className="text-xs text-emerald-700">
        <IconText icon={Check}>Compliance OK</IconText>
      </span>
    )
  }
  if (s === 'warnung' || s === 'abgelaufen') {
    return (
      <span className="text-xs text-amber-800">
        <IconText icon={AlertTriangle}>Dokument läuft ab</IconText>
      </span>
    )
  }
  if (s === 'unvollständig') {
    return (
      <span className="text-xs text-red-800">
        <IconText icon={X}>Docs fehlen</IconText>
      </span>
    )
  }
  return <span className="text-xs text-bw-text-muted">—</span>
}

export function DashboardHWZeile({ row: h }: { row: HandwerkerZeile }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="list-row w-full text-left">
        <div className="md:hidden w-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-bw-text">{handwerkerDisplayName(h)}</span>
            <span className="text-xs text-bw-text-muted">aktiv</span>
          </div>
          <p className="text-xs text-bw-text-muted">{gewerkKurz(h)}</p>
          <div className="mt-1">
            <ComplianceHint h={h} />
          </div>
        </div>
        <div className="hidden w-full items-center gap-4 md:flex">
          <span className="flex-1 truncate text-sm font-medium text-bw-text">{handwerkerDisplayName(h)}</span>
          <span className="w-32 truncate text-xs text-bw-text-muted">{gewerkKurz(h)}</span>
          <div className="w-40">
            <ComplianceHint h={h} />
          </div>
          <span className="text-xs text-bw-text-muted">aktiv</span>
        </div>
      </button>

      <SidePanel
        open={open}
        onClose={() => setOpen(false)}
        title={handwerkerDisplayName(h)}
        subtitle={handwerkerGfName(h) || undefined}
      >
        <div className="space-y-4 p-5 text-sm">
          <p className="text-bw-text-muted">{h.email ?? '—'}</p>
          <p>{h.telefon ?? '—'}</p>
          <Link
            href={`/handwerker/${h.id}`}
            className="btn btn-primary w-full justify-center"
            onClick={() => setOpen(false)}
          >
            Profil öffnen
          </Link>
        </div>
      </SidePanel>
    </>
  )
}
