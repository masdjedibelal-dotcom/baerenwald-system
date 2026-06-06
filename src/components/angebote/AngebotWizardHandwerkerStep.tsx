'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { gewerkById } from '@/lib/gewerke-ausfuehrung'
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
  const slug = g?.slug?.toLowerCase()
  if (!slug) return handwerker
  return handwerker.filter((h) =>
    (h.gewerke ?? []).some((x) => String(x).toLowerCase() === slug)
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
        {blocks.map((b) => {
          const opts = handwerkerFuerGewerk(handwerker, gewerke, b.gewerk_id)
          const selected =
            opts.find((h) => h.id === b.handwerker_id) ??
            handwerker.find((h) => h.id === b.handwerker_id) ??
            null
          const selectOptions = [
            { value: '', label: 'Handwerker wählen…' },
            ...(selected && !opts.some((h) => h.id === selected.id)
              ? [{ value: selected.id, label: selected.name }]
              : []),
            ...opts.map((h) => ({ value: h.id, label: h.name })),
          ]
          return (
            <div
              key={b.gewerk_id}
              className="rounded-lg border border-bw-border bg-bw-bg-soft/40 p-4 space-y-3"
            >
              <p className="text-[13px] font-semibold text-bw-text">{b.gewerk_name}</p>
              <Select
                label="Handwerker"
                name={`hw-${b.gewerk_id}`}
                value={b.handwerker_id}
                disabled={disabled}
                onChange={(e) => patch(b.gewerk_id, { handwerker_id: e.target.value })}
                options={selectOptions}
              />
              <Textarea
                label="Notiz für Handwerker"
                rows={2}
                value={b.aufgabe_notiz}
                disabled={disabled}
                placeholder="z. B. Zugang über Hausmeister, Terminwunsch, Besonderheiten…"
                onChange={(e) => patch(b.gewerk_id, { aufgabe_notiz: e.target.value })}
              />
            </div>
          )
        })}
      </div>
    </Card>
  )
}
