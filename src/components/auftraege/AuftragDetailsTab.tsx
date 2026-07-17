'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { AuftragDetailTopCards } from '@/components/auftraege/AuftragDetailTopCards'
import { MockProjektUebersichtCard } from '@/components/mock-ui/MockProjektUebersichtCard'
import { PosBoard } from '@/components/posboard/PosBoard'
import { toast } from '@/components/ui/app-toast'
import { replaceAuftragPositionenFromPosBoard } from '@/app/(dashboard)/auftraege/auftrag-posboard-actions'
import { resolveLeadPreisAnzeige } from '@/lib/lead-display-helpers'
import { auftragFortschritt } from '@/lib/auftraege/auftrag-liste-helpers'
import { auftragPositionenToPosBoardLines } from '@/lib/posboard/position-adapters'
import {
  neuePosBoardLine,
  POS_BOARD_DEFAULT_GEWERK,
  type PosBoardLine,
} from '@/lib/posboard/pos-board-line'
import type { CrmTeamMitglied } from '@/lib/crm-team'
import type { AuftragDetail, AuftragPosition, Lead } from '@/lib/types'
import { kanalLabel, SITUATION_LABELS } from '@/lib/utils'

type AuftragLeadSnap = Pick<
  Lead,
  | 'id'
  | 'plz'
  | 'kontakt_name'
  | 'kontakt_email'
  | 'kontakt_telefon'
  | 'funnel_daten'
  | 'kanal'
  | 'auftraggeber_kunde_id'
  | 'anlass'
> &
  Partial<
    Pick<
      Lead,
      | 'situation'
      | 'kontakt_nachricht'
      | 'notizen'
      | 'budget_ca'
      | 'preis_min'
      | 'preis_max'
      | 'created_at'
    >
  >

function projektTitel(detail: AuftragDetail, lead?: AuftragLeadSnap | null): string {
  const t = detail.titel?.trim()
  if (t) return t
  const sit = lead?.situation?.trim()
  if (sit) return SITUATION_LABELS[sit] ?? sit
  const ang = Array.isArray(detail.angebote) ? detail.angebote[0] : detail.angebote
  const angTitel = (ang as { titel?: string } | null)?.titel?.trim()
  if (angTitel) return angTitel
  return 'Projekt'
}

function regionLabel(detail: AuftragDetail, lead?: AuftragLeadSnap | null): string | null {
  const ort = (detail.kunden?.ort ?? '').trim()
  const plz = (detail.kunden?.plz ?? lead?.plz ?? '').trim()
  if (ort && plz) return `${ort} · ${plz}`
  if (ort) return ort
  if (plz) return plz
  return null
}

function beschreibungFrom(detail: AuftragDetail, lead?: AuftragLeadSnap | null): string | null {
  const t =
    lead?.kontakt_nachricht?.trim() ||
    lead?.notizen?.trim() ||
    detail.notizen?.trim() ||
    ''
  return t || null
}

/** Mock Details: Auftragsdaten + Projekt-Übersicht + PosBoard Leistungen. */
export function AuftragDetailsTab({
  detail,
  lead,
  team = [],
  gewerke = [],
  editable = true,
  onSaved,
}: {
  detail: AuftragDetail
  lead?: AuftragLeadSnap | null
  team?: CrmTeamMitglied[]
  gewerke?: { id: string; name: string; slug: string }[]
  editable?: boolean
  onSaved?: () => void
}) {
  const positionen = detail.auftrag_positionen ?? []
  const [lines, setLines] = useState(() => auftragPositionenToPosBoardLines(positionen))
  const baseRef = useRef<AuftragPosition[]>(positionen)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    const next = detail.auftrag_positionen ?? []
    baseRef.current = next
    setLines(auftragPositionenToPosBoardLines(next))
  }, [detail.id, detail.auftrag_positionen])

  const persist = useCallback(
    (next: PosBoardLine[]) => {
      if (!editable) return
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        startTransition(async () => {
          const res = await replaceAuftragPositionenFromPosBoard(detail.id, next)
          if (!res.ok) {
            toast.error(res.message)
            return
          }
          onSaved?.()
        })
      }, 450)
    },
    [detail.id, editable, onSaved]
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

  const gewerkNames = useMemo(
    () => gewerke.map((g) => g.name.trim()).filter(Boolean),
    [gewerke]
  )

  const fortschritt = auftragFortschritt(detail)

  return (
    <>
      <AuftragDetailTopCards detail={detail} team={team} />

      <MockProjektUebersichtCard
        projekt={projektTitel(detail, lead)}
        beschreibung={beschreibungFrom(detail, lead)}
        region={regionLabel(detail, lead)}
        preisrahmenLabel={preisrahmen}
        quelle={lead?.kanal ? kanalLabel(lead.kanal) : null}
        startDatum={detail.start_datum}
        endDatum={detail.end_datum}
        fortschritt={fortschritt}
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
