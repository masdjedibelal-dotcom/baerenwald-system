'use client'

import { useEffect, useMemo, useState } from 'react'
import { EntityProjektUebersichtCard } from '@/components/crm/EntityProjektUebersichtCard'
import { PosBoard } from '@/components/posboard/PosBoard'
import { updateAngebotProjektFelder } from '@/app/(dashboard)/angebote/actions'
import { buildFunnelBedarfExtraRows } from '@/lib/anfragen/funnel-bedarf-rows'
import { angebotPositionenToPosBoardLines } from '@/lib/posboard/position-adapters'
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

/** Angebot-Details: Verkaufsinfos + Positionen nur Anzeige (Edit nur im Angebots-Wizard). */
export function AngebotDetailsTab({
  detail,
  lead,
  gewerke: _gewerke = [],
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

  useEffect(() => {
    setLines(angebotPositionenToPosBoardLines(detail.positionen ?? []))
  }, [detail.id, detail.positionen])

  const betragLabel = betragAnzeige(detail.gesamt_fix, detail.gesamt_min, detail.gesamt_max)
  const angebotNr =
    detail.angebotsnr?.trim() || `AN-${detail.id.slice(0, 8).toUpperCase()}`

  const funnelUi = useMemo(
    () => (lead ? buildFunnelBedarfExtraRows(lead) : { extraRows: [], footerRows: [] }),
    [lead]
  )

  return (
    <>
      <PosBoard title="Leistungen" positionen={lines} showUst />

      <EntityProjektUebersichtCard
        title="Projektinfos"
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
        extraRows={funnelUi.extraRows}
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
    </>
  )
}
