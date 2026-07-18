'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { EntityProjektUebersichtCard } from '@/components/crm/EntityProjektUebersichtCard'
import { PosBoard } from '@/components/posboard/PosBoard'
import { toast } from '@/components/ui/app-toast'
import { updateAngebotProjektFelder } from '@/app/(dashboard)/angebote/actions'
import { replaceAngebotPositionen } from '@/app/(dashboard)/angebote/angebot-positionen-steuerung-actions'
import {
  angebotPositionenToPosBoardLines,
  posBoardLinesToAngebotPositionenWithBase,
} from '@/lib/posboard/position-adapters'
import {
  neuePosBoardLine,
  POS_BOARD_DEFAULT_GEWERK,
  type PosBoardLine,
} from '@/lib/posboard/pos-board-line'
import { betragAnzeige } from '@/lib/angebot-einfach'
import { angebotTitelOderSituationBereich } from '@/lib/vorgang/vorgang-anzeige-titel'
import type { AngebotDetail, Gewerk, LeadDetail } from '@/lib/types'
import { formatDatum, formatDatumZeit } from '@/lib/utils'

function projektTitel(detail: AngebotDetail, lead?: LeadDetail | null): string {
  return angebotTitelOderSituationBereich({
    angebot: detail,
    situation: lead?.situation,
    bereiche: lead?.bereiche ?? detail.leads?.bereiche,
    fallback: detail.angebotsnr?.trim() || `AN-${detail.id.slice(0, 8).toUpperCase()}`,
  })
}

function beschreibungFromAngebot(detail: AngebotDetail): string | null {
  return detail.projektbeschreibung?.trim() || null
}

function enrichGewerke(
  positionen: ReturnType<typeof posBoardLinesToAngebotPositionenWithBase>,
  gewerke: Gewerk[]
) {
  return positionen.map((p) => {
    if (p.gewerk_id?.trim()) return p
    const byName = gewerke.find((g) => g.name.trim() === (p.gewerk_name ?? '').trim())
    if (byName) {
      return {
        ...p,
        gewerk_id: byName.id,
        gewerk_name: byName.name,
        gewerk_slug: byName.slug,
      }
    }
    const slug =
      p.gewerk_slug?.trim() ||
      (p.gewerk_name || POS_BOARD_DEFAULT_GEWERK)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') ||
      'allgemein'
    return {
      ...p,
      gewerk_id: p.gewerk_id || `name:${slug}`,
      gewerk_slug: slug,
      gewerk_block_key: p.gewerk_block_key || `${slug}-board`,
    }
  })
}

/** Angebot: nur Verkauf (Beschreibung, Summe, Gültigkeit) + gepreiste Positionen. */
export function AngebotDetailsTab({
  detail,
  lead,
  gewerke = [],
  editable = true,
  onSaved,
}: {
  detail: AngebotDetail
  lead?: LeadDetail | null
  gewerke?: Gewerk[]
  editable?: boolean
  onSaved?: () => void
}) {
  const [lines, setLines] = useState(() =>
    angebotPositionenToPosBoardLines(detail.positionen ?? [])
  )
  const baseRef = useRef(detail.positionen ?? [])
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    baseRef.current = detail.positionen ?? []
    setLines(angebotPositionenToPosBoardLines(detail.positionen ?? []))
  }, [detail.id, detail.positionen])

  const persist = useCallback(
    (next: PosBoardLine[]) => {
      if (!editable) return
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        startTransition(async () => {
          const mapped = enrichGewerke(
            posBoardLinesToAngebotPositionenWithBase(next, baseRef.current),
            gewerke
          )
          const res = await replaceAngebotPositionen(detail.id, mapped)
          if (!res.ok) {
            toast.error(res.message)
            return
          }
          baseRef.current = mapped
          onSaved?.()
        })
      }, 450)
    },
    [detail.id, editable, gewerke, onSaved]
  )

  const onPosBoardChange = useCallback(
    (next: PosBoardLine[]) => {
      setLines(next)
      persist(next)
    },
    [persist]
  )

  const betragLabel = betragAnzeige(detail.gesamt_fix, detail.gesamt_min, detail.gesamt_max)
  const angebotNr =
    detail.angebotsnr?.trim() || `AN-${detail.id.slice(0, 8).toUpperCase()}`

  const gewerkNames = useMemo(
    () => gewerke.map((g) => g.name.trim()).filter(Boolean),
    [gewerke]
  )

  return (
    <>
      <EntityProjektUebersichtCard
        title="Angebot"
        icon="file-invoice"
        initial={{
          titel: projektTitel(detail, lead),
          beschreibung: beschreibungFromAngebot(detail) ?? '',
          startDatum: '',
          endDatum: '',
          istBauprojekt: false,
        }}
        editableFields={editable ? ['beschreibung'] : []}
        onSave={
          editable
            ? async (draft) => {
                const r = await updateAngebotProjektFelder(detail.id, {
                  projektbeschreibung: draft.beschreibung,
                })
                if (r.ok) onSaved?.()
                return r
              }
            : undefined
        }
        disabled={!editable}
        footerRows={[
          { label: 'Angebotsnr.', children: angebotNr },
          {
            label: 'Angebotssumme',
            children: (
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>{betragLabel || '—'}</span>
            ),
          },
          { label: 'Erstellt', children: formatDatumZeit(detail.created_at) },
          {
            label: 'Gültig bis',
            children: detail.gueltig_bis ? formatDatum(detail.gueltig_bis) : '—',
          },
        ]}
      />

      <PosBoard
        title="Leistungen"
        positionen={lines}
        onChange={editable ? onPosBoardChange : undefined}
        showUst
        gewerke={gewerkNames.length ? gewerkNames : undefined}
        makeNew={(gewerk) =>
          neuePosBoardLine({
            gewerk: gewerk || POS_BOARD_DEFAULT_GEWERK,
            name: '',
            menge: 1,
            einheit: 'Stück',
            preis: 0,
            ust: 19,
          })
        }
      />
    </>
  )
}
