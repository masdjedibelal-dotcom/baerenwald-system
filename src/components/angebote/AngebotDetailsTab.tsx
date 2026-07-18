'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { EntityProjektUebersichtCard } from '@/components/crm/EntityProjektUebersichtCard'
import { PosBoard } from '@/components/posboard/PosBoard'
import { toast } from '@/components/ui/app-toast'
import { updateAngebotProjektFelder } from '@/app/(dashboard)/angebote/actions'
import { replaceAngebotPositionen } from '@/app/(dashboard)/angebote/angebot-positionen-steuerung-actions'
import { resolveLeadPreisAnzeige } from '@/lib/lead-display-helpers'
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
import { formatDatum, formatDatumZeit, kanalLabel } from '@/lib/utils'

function projektTitel(detail: AngebotDetail, lead?: LeadDetail | null): string {
  return angebotTitelOderSituationBereich({
    angebot: detail,
    situation: lead?.situation,
    bereiche: lead?.bereiche ?? detail.leads?.bereiche,
    fallback: detail.angebotsnr?.trim() || `AN-${detail.id.slice(0, 8).toUpperCase()}`,
  })
}

function regionLabel(detail: AngebotDetail, lead?: LeadDetail | null): string | null {
  const ort = (detail.kunden?.ort ?? '').trim()
  const plz = (detail.kunden?.plz ?? lead?.plz ?? '').trim()
  if (ort && plz) return `${ort} · ${plz}`
  if (ort) return ort
  if (plz) return plz
  return null
}

function beschreibungFrom(detail: AngebotDetail, lead?: LeadDetail | null): string | null {
  const t =
    lead?.kontakt_nachricht?.trim() ||
    detail.projektbeschreibung?.trim() ||
    lead?.notizen?.trim() ||
    ''
  return t || null
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

/** Mock Details: Projekt-Übersicht + PosBoard Leistungen (mit Netto/MwSt/Brutto). */
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

  const preisrahmen = useMemo(() => {
    if (!lead) return null
    const raw = resolveLeadPreisAnzeige(
      lead.kanal,
      lead.budget_ca,
      lead.preis_min,
      lead.preis_max,
      lead.funnel_daten
    )
    return raw !== '—' ? raw : null
  }, [lead])

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
        title="Angebotsdetails"
        initial={{
          titel: projektTitel(detail, lead),
          beschreibung: beschreibungFrom(detail, lead) ?? '',
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
        region={regionLabel(detail, lead)}
        preisrahmenLabel={preisrahmen}
        quelle={lead ? kanalLabel(lead.kanal) : null}
        footerRows={[
          { label: 'Angebot', children: angebotNr },
          {
            label: 'Gesamt (DB)',
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
