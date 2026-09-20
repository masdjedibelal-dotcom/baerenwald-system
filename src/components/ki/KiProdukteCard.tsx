'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn, MockEmpty } from '@/components/mock-ui'
import { useState } from 'react'
import type { ProduktePaketeErgebnis } from '@/lib/ki/types'
import { KiCardShell } from '@/components/ki/KiCardShell'
import {
  KiEmptyCardBody,
  KiHeroStat,
  type KiCardProps,
  formatEur,
} from '@/components/ki/ki-card-shared'

function CopyBlock({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  if (!text.trim()) return null
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-fs-caption font-semibold uppercase tracking-wide text-muted">{label}</p>
        <MockBtn className="inline-flex items-center gap-1 text-fs-caption text-bw-primary hover:underline" type="button" onClick={async () => {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}>
          {copied ? <MockIcon n="check" ctx="default" className="h-3 w-3" /> : <MockIcon n="copy" ctx="default" className="h-3 w-3" />}
          {copied ? 'Kopiert' : 'Kopieren'}
        </MockBtn>
      </div>
      <pre className="mt-1 whitespace-pre-wrap rounded-button bg-bw-bg px-3 py-2 text-xs font-sans text-bw-text">
        {text}
      </pre>
    </div>
  )
}

export function KiProdukteCard({ analyse, onGenerateKi, kiLoading }: KiCardProps) {
  const ergebnis = analyse.ergebnis as ProduktePaketeErgebnis
  const zeilen = ergebnis.zeilen ?? []
  const top = zeilen[0]
  const paket = top?.standardpakete?.[0]
  const empty = zeilen.length === 0

  const hero = top ? (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <KiHeroStat label="Top Gewerk" value={top.gewerk} sub={`${top.auftraege} Aufträge`} />
        <KiHeroStat
          label="Top-Paket"
          value={paket?.name ?? '—'}
          sub={paket ? `${paket.haeufigkeit}×` : undefined}
        />
      </div>
      {top.angebot_ablauf_vorschlag ? (
        <p className="rounded-card bg-bw-bg px-3 py-2 text-xs text-bw-text line-clamp-3">
          {top.angebot_ablauf_vorschlag}
        </p>
      ) : null}
    </div>
  ) : (
    <MockEmpty title="Keine Pakete" />
  )

  const details = (
    <div className="space-y-4">
      {zeilen.map((z) => (
        <div key={z.gewerk} className="border-b border-bw-border/60 pb-4 last:border-0">
          <h4 className="font-semibold text-bw-text">{z.gewerk}</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {(z.standardpakete ?? []).slice(0, 4).map((p) => (
              <span
                key={p.name}
                className="rounded-pill border border-bw-border bg-bw-bg px-2.5 py-1 text-xs"
              >
                {p.name} ({p.haeufigkeit}×)
                {p.vk_median != null ? ` · ${formatEur(p.vk_median)}` : ''}
              </span>
            ))}
          </div>
          <CopyBlock text={z.angebot_ablauf_vorschlag} label="Angebots-Ablauf" />
        </div>
      ))}
    </div>
  )

  return (
    <KiCardShell
      analyse={analyse}
      hinweis={ergebnis.hinweis}
      onGenerateKi={onGenerateKi}
      kiLoading={kiLoading}
      hero={hero}
      details={details}
      empty={empty}
      emptyBody={
        <KiEmptyCardBody
          title="Noch keine Standardpakete"
          hint="Mehr Angebote mit Positionen erzeugen erkennbare Leistungs-Bündel."
        />
      }
    />
  )
}
