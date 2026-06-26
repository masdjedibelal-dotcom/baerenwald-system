'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
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
    { value: '', label: 'Handwerker wählen…' },
    ...(selected && !opts.some((h) => h.id === selected.id)
      ? [{ value: selected.id, label: selected.name }]
      : []),
    ...opts.map((h) => ({ value: h.id, label: h.name })),
  ]
  const handwerkerLabel = selected?.name ?? '—'

  const form = (
    <div className="space-y-3">
      <Select
        label="Handwerker"
        name={`hw-${block.gewerk_id}`}
        value={block.handwerker_id}
        disabled={disabled}
        onChange={(e) => onPatch({ handwerker_id: e.target.value })}
        options={selectOptions}
      />
      <Textarea
        label="Notiz für Handwerker"
        rows={3}
        value={block.aufgabe_notiz}
        disabled={disabled}
        placeholder="z. B. Zugang über Hausmeister, Terminwunsch, Besonderheiten…"
        onChange={(e) => onPatch({ aufgabe_notiz: e.target.value })}
      />
    </div>
  )

  const overview = (
    <dl className="space-y-2.5">
      <MobileOverviewField label="Handwerker" value={handwerkerLabel} />
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
    <div className="rounded-lg border border-bw-border bg-bw-bg-soft/40 p-4">
      <p className="mb-3 text-[13px] font-semibold text-bw-text">{block.gewerk_name}</p>
      <MobileEditableBlock
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
      <Card title="Handwerker">
        <p className="text-sm text-bw-text-muted">
          Bitte in Schritt 1 mindestens eine Leistung mit Gewerk erfassen.
        </p>
      </Card>
    )
  }

  function patch(gewerkId: string, patchData: Partial<GewerkHandwerkerZuweisung>) {
    onChange(blocks.map((b) => (b.gewerk_id === gewerkId ? { ...b, ...patchData } : b)))
  }

  return (
    <Card title="Handwerker — Angebot / Rechnung einholen">
      <p className="mb-4 text-sm text-bw-text-muted">
        Pro Gewerk Partner auswählen und optional eine Notiz für die Anfrage hinterlegen. Erst nach
        Partner-Einreichung und Bestätigung senden Sie das Angebot an den Kunden.
      </p>
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
