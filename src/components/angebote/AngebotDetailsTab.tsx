'use client'

import { useMemo } from 'react'
import { EntityProjektUebersichtCard } from '@/components/crm/EntityProjektUebersichtCard'
import { LeistungenTab, leistungenFromAngebotPositionen } from '@/components/leistungen'
import { updateAngebotProjektFelder } from '@/app/(dashboard)/angebote/actions'
import { buildFunnelBedarfExtraRows } from '@/lib/anfragen/funnel-bedarf-rows'
import { betragAnzeige } from '@/lib/angebot-einfach'
import { summenAusPositionen } from '@/lib/angebot-positionen'
import { istGewerkBeschreibungPosition } from '@/lib/dokument-zeilen'
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

/** Angebot: eigener Tab Projektinfos (nicht unter Leistungen). */
export function AngebotProjektinfosTab({
  detail,
  lead,
  editable = true,
  onSaved,
}: {
  detail: AngebotDetail
  lead?: LeadDetail | null
  editable?: boolean
  onSaved?: () => void
}) {
  const betragLabel = betragAnzeige(detail.gesamt_fix, detail.gesamt_min, detail.gesamt_max)
  const angebotNr =
    detail.angebotsnr?.trim() || `AN-${detail.id.slice(0, 8).toUpperCase()}`

  const funnelUi = useMemo(
    () => (lead ? buildFunnelBedarfExtraRows(lead) : { extraRows: [], footerRows: [] }),
    [lead]
  )

  return (
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
  )
}

/** Angebot: Leistungen — shared read-only Tabelle (Phase 6). */
export function AngebotLeistungenTab({
  detail,
  onOpenDokument,
}: {
  detail: AngebotDetail
  lead?: LeadDetail | null
  gewerke?: Gewerk[]
  editable?: boolean
  onSaved?: () => void
  onOpenDokument?: () => void
}) {
  const rows = useMemo(() => {
    const pos = (detail.positionen ?? []).filter((p) => !istGewerkBeschreibungPosition(p))
    return leistungenFromAngebotPositionen(pos, {
      status: 'entwurf',
      statusLabel: 'Im Angebot',
    })
  }, [detail.positionen])

  const summen = useMemo(() => summenAusPositionen(detail.positionen ?? [], 19), [detail.positionen])

  return (
    <LeistungenTab
      phase="angebot"
      rows={rows}
      onOpenDokument={onOpenDokument}
      dokumentHint=""
      groupByGewerk
      footerNettoMwst={{
        netto: summen.nettoMin,
        mwstSatz: summen.mwstSatz,
        mwstBetrag: summen.mwstBetragMin,
      }}
      emptyHint="Noch keine Positionen — über „Angebot bearbeiten“ anlegen."
    />
  )
}

/** @deprecated Nutze AngebotProjektinfosTab + AngebotLeistungenTab. */
export function AngebotDetailsTab(props: {
  detail: AngebotDetail
  lead?: LeadDetail | null
  gewerke?: Gewerk[]
  editable?: boolean
  onSaved?: () => void
}) {
  return (
    <>
      <AngebotLeistungenTab detail={props.detail} />
      <AngebotProjektinfosTab
        detail={props.detail}
        lead={props.lead}
        editable={props.editable}
        onSaved={props.onSaved}
      />
    </>
  )
}
