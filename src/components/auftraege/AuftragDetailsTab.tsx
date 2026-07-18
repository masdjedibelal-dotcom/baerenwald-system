'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { AuftragDetailTopCards } from '@/components/auftraege/AuftragDetailTopCards'
import { EntityProjektUebersichtCard } from '@/components/crm/EntityProjektUebersichtCard'
import { PosBoard } from '@/components/posboard/PosBoard'
import { toast } from '@/components/ui/app-toast'
import {
  updateAuftragNotizen,
  updateAuftragProjektFelder,
} from '@/app/(dashboard)/auftraege/actions'
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
import { kanalLabel } from '@/lib/utils'
import { angebotTitelOderSituationBereich } from '@/lib/vorgang/vorgang-anzeige-titel'

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
      | 'bereiche'
      | 'kontakt_nachricht'
      | 'notizen'
      | 'budget_ca'
      | 'preis_min'
      | 'preis_max'
      | 'created_at'
    >
  >

function projektTitel(detail: AuftragDetail, lead?: AuftragLeadSnap | null): string {
  const ang = Array.isArray(detail.angebote) ? detail.angebote[0] : detail.angebote
  return angebotTitelOderSituationBereich({
    angebot: ang,
    situation: lead?.situation,
    bereiche: lead?.bereiche,
    fallback: detail.titel?.trim() || 'Auftrag',
  })
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

      <EntityProjektUebersichtCard
        title="Auftragsdetails"
        initial={{
          titel: detail.titel?.trim() || projektTitel(detail, lead),
          beschreibung: beschreibungFrom(detail, lead) ?? '',
          startDatum: detail.start_datum?.slice(0, 10) ?? '',
          endDatum: detail.end_datum?.slice(0, 10) ?? '',
          istBauprojekt: detail.ist_bauprojekt === true,
        }}
        editableFields={
          editable
            ? ['titel', 'beschreibung', 'startDatum', 'endDatum', 'istBauprojekt']
            : []
        }
        onSave={
          editable
            ? async (draft) => {
                const r1 = await updateAuftragProjektFelder(detail.id, {
                  titel: draft.titel,
                  start_datum: draft.startDatum || null,
                  end_datum: draft.endDatum || null,
                  ist_bauprojekt: draft.istBauprojekt,
                })
                if (!r1.ok) return r1
                const r2 = await updateAuftragNotizen(detail.id, draft.beschreibung)
                if (r2.ok) onSaved?.()
                return r2
              }
            : undefined
        }
        disabled={!editable}
        region={regionLabel(detail, lead)}
        preisrahmenLabel={preisrahmen}
        quelle={lead?.kanal ? kanalLabel(lead.kanal) : null}
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
