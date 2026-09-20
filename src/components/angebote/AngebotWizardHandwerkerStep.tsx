'use client'

import { MockField } from '@/components/mock-ui/MockForm'
import { useMemo } from 'react'
import { Combobox } from '@/components/ui/Combobox'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { Card } from '@/components/ui/Card'
import { MobileEditableBlock, MobileOverviewField } from '@/components/ui/MobileEditSheet'
import { gewerkById } from '@/lib/gewerke-ausfuehrung'
import { filterHandwerkerFuerGewerkSlug } from '@/lib/handwerker/gewerk-match'
import type { DokumentZeile } from '@/lib/dokument-zeilen'
import type { Gewerk, Handwerker } from '@/lib/types'

export type GewerkHandwerkerZuweisung = {
  gewerk_id: string
  gewerk_name: string
  handwerker_id: string
  aufgabe_notiz: string
}

function gewerkeAusZeilen(zeilen: DokumentZeile[]): { gewerk_id: string; gewerk_name: string }[] {
  const seen = new Set<string>()
  const out: { gewerk_id: string; gewerk_name: string }[] = []
  for (const z of zeilen) {
    if (z.typ !== 'artikel') continue
    const gid = z.gewerk_id?.trim()
    if (!gid || seen.has(gid)) continue
    seen.add(gid)
    out.push({
      gewerk_id: gid,
      gewerk_name: z.gewerkName?.trim() || 'Gewerk',
    })
  }
  return out
}

function handwerkerFuerGewerk(handwerker: Handwerker[], gewerke: Gewerk[], gewerkId: string): Handwerker[] {
  const g = gewerkById(gewerke, gewerkId)
  const slug = g?.slug
  if (!slug) return handwerker.filter((h) => h.aktiv !== false)
  return filterHandwerkerFuerGewerkSlug(
    handwerker.filter((h) => h.aktiv !== false),
    slug
  )
}

export function buildGewerkHandwerkerZuweisungen(
  zeilen: DokumentZeile[],
  prev: GewerkHandwerkerZuweisung[]
): GewerkHandwerkerZuweisung[] {
  const gewerke = gewerkeAusZeilen(zeilen)
  const prevMap = new Map(prev.map((p) => [p.gewerk_id, p]))
  return gewerke.map((g) => {
    const old = prevMap.get(g.gewerk_id)
    return {
      gewerk_id: g.gewerk_id,
      gewerk_name: g.gewerk_name,
      handwerker_id: old?.handwerker_id ?? '',
      aufgabe_notiz: old?.aufgabe_notiz ?? '',
    }
  })
}

export function gewerkHandwerkerZuweisungenToMaps(zuweisungen: GewerkHandwerkerZuweisung[]) {
  const positionQueues: { gewerk_id: string; handwerker_id: string }[] = []
  const notizenByGewerk: Record<string, string> = {}
  for (const z of zuweisungen) {
    if (!z.handwerker_id.trim()) continue
    positionQueues.push({ gewerk_id: z.gewerk_id, handwerker_id: z.handwerker_id.trim() })
    if (z.aufgabe_notiz.trim()) {
      notizenByGewerk[z.gewerk_id] = z.aufgabe_notiz.trim()
    }
  }
  return { positionQueues, notizenByGewerk }
}

function GewerkHandwerkerBlock({
  block,
  gewerke,
  handwerker,
  disabled,
  onPatch,
}: {
  block: GewerkHandwerkerZuweisung
  gewerke: Gewerk[]
  handwerker: Handwerker[]
  disabled?: boolean
  onPatch: (patch: Partial<GewerkHandwerkerZuweisung>) => void
}) {
  const opts = handwerkerFuerGewerk(handwerker, gewerke, block.gewerk_id)
  const selected =
    opts.find((h) => h.id === block.handwerker_id) ??
    handwerker.find((h) => h.id === block.handwerker_id) ??
    null
  const selectOptions = [
    { value: '', label: 'Partner wählen…' },
    ...(selected && !opts.some((h) => h.id === selected.id)
      ? [{ value: selected.id, label: selected.name }]
      : []),
    ...opts.map((h) => ({ value: h.id, label: h.name })),
  ]
  const handwerkerLabel = selected?.name ?? '—'

  const form = (
    <div className="space-y-3">
      <Combobox label="Partner" id={`hw-${block.gewerk_id}`} name={`hw-${block.gewerk_id}`} disabled={disabled} options={selectOptions} value={block.handwerker_id == null ? '' : String(block.handwerker_id)} placeholder="Auswählen…" onChange={(next) => { onPatch({ handwerker_id: next }); }} />
      <MockField label="Notiz für Partner"><RichTextEditor value={typeof (block.aufgabe_notiz) === 'string' ? (block.aufgabe_notiz) : ''} onChange={(__v) => onPatch({ aufgabe_notiz: __v })} disabled={disabled} placeholder="z. B. Zugang über Hausmeister, Terminwunsch, Besonderheiten…" minHeight={120} aria-label="Notiz für Partner" /></MockField>
    </div>
  )

  const overview = (
    <dl className="space-y-2.5">
      <MobileOverviewField label="Partner" value={handwerkerLabel} />
      <MobileOverviewField
        label="Notiz"
        value={
          <span className="whitespace-pre-wrap text-bw-text-muted">
            {block.aufgabe_notiz.trim() || '—'}
          </span>
        }
      />
    </dl>
  )

  return (
    <div className="rounded-card border border-bw-border bg-bw-bg-soft/40 p-4">
      <p className="mb-3 text-[length:var(--fs-text)] font-semibold text-bw-text">{block.gewerk_name}</p>
      <MobileEditableBlock
        sheetContext="canvas"
        sheetTitle={block.gewerk_name}
        overview={overview}
        disabled={disabled}
        editLabel="Zuweisung bearbeiten"
      >
        {form}
      </MobileEditableBlock>
    </div>
  )
}

export function AngebotWizardHandwerkerStep({
  zeilen,
  gewerke,
  handwerker,
  zuweisungen,
  onChange,
  disabled,
}: {
  zeilen: DokumentZeile[]
  gewerke: Gewerk[]
  handwerker: Handwerker[]
  zuweisungen: GewerkHandwerkerZuweisung[]
  onChange: (next: GewerkHandwerkerZuweisung[]) => void
  disabled?: boolean
}) {
  const blocks = useMemo(() => buildGewerkHandwerkerZuweisungen(zeilen, zuweisungen), [zeilen, zuweisungen])

  if (!blocks.length) {
    return (
      <Card title="Partner">
        <p className="text-[length:var(--fs-text)] text-bw-text-muted">
          Bitte zuerst Positionen mit Gewerk erfassen.
        </p>
      </Card>
    )
  }

  function patch(gewerkId: string, patchData: Partial<GewerkHandwerkerZuweisung>) {
    onChange(blocks.map((b) => (b.gewerk_id === gewerkId ? { ...b, ...patchData } : b)))
  }

  return (
    <Card title="Partner — Angebot / Rechnung einholen">
      <div className="space-y-4">
        {blocks.map((b) => (
          <GewerkHandwerkerBlock
            key={b.gewerk_id}
            block={b}
            gewerke={gewerke}
            handwerker={handwerker}
            disabled={disabled}
            onPatch={(patchData) => patch(b.gewerk_id, patchData)}
          />
        ))}
      </div>
    </Card>
  )
}
