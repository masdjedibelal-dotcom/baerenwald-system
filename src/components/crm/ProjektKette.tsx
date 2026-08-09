'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { buildProjektKette, type ProjektKontext } from '@/lib/crm/projekt-kontext-types'

const KIND_LABEL: Record<string, string> = {
  kunde: 'Kunde',
  anfrage: 'Anfrage',
  angebot: 'Angebot',
  auftrag: 'Auftrag',
  rechnung: 'Rechnung',
}

type Props = {
  kontext: ProjektKontext
  className?: string
}

export function ProjektKette({ kontext, className = '' }: Props) {
  const chain = buildProjektKette(kontext)
  if (chain.length <= 1) return null

  return (
    <nav
      aria-label="Projekt-Kette"
      className={`flex flex-wrap items-center gap-1 text-sm text-bw-text-muted ${className}`}
    >
      {chain.map((glied, i) => {
        const isActive = glied.kind === kontext.activeKind && glied.id === kontext.activeId
        return (
          <span key={`${glied.kind}-${glied.id}`} className="inline-flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />}
            {isActive ? (
              <span className="font-medium text-bw-text" aria-current="page">
                {KIND_LABEL[glied.kind] ?? glied.kind}: {glied.label}
              </span>
            ) : (
              <Link href={glied.href} className="text-bw-link hover:underline">
                {KIND_LABEL[glied.kind] ?? glied.kind}: {glied.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
