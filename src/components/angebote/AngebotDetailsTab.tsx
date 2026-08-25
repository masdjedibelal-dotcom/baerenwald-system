'use client'

import { useMemo, useState } from 'react'
import { EntityProjektUebersichtCard } from '@/components/crm/EntityProjektUebersichtCard'
import { LeistungenTab, leistungenFromAngebotPositionen } from '@/components/leistungen'
import { AnfragePartnerEinholungCards } from '@/components/anfragen/AnfragePartnerEinholungCards'
import { partnerLvZuweisungen } from '@/lib/angebote/partner-einholung'
import { AuftragLeistungZuweisungModal } from '@/components/auftraege/leistungen-v3/AuftragLeistungZuweisungModal'
import { updateAngebotProjektFelder } from '@/app/(dashboard)/angebote/actions'
import { buildFunnelBedarfExtraRows } from '@/lib/anfragen/funnel-bedarf-rows'
import { formatAngebotEurKurzBrutto } from '@/lib/vorgang/projekt-kontext-labels'
import { summenAusPositionen } from '@/lib/angebot-positionen'
import { angebotDarfImWizardBearbeitetWerden } from '@/lib/angebote/angebot-wizard-types'
import { istGewerkBeschreibungPosition } from '@/lib/dokument-zeilen'
import { angebotTitelOderSituationBereich } from '@/lib/vorgang/vorgang-anzeige-titel'
import type { AngebotDetail, AngebotPosition, AuftragPosition, Gewerk, LeadDetail } from '@/lib/types'
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

/** AngebotPosition → View-Model für das gemeinsame Zuweisungs-Sheet. */
function angebotPosAlsZuweisungView(p: AngebotPosition): AuftragPosition {
  const menge = Math.max(p.menge || 1, 0.0001)
  const vkLine =
    p.gesamt_min != null && p.gesamt_min > 0
      ? p.gesamt_min
      : Math.round((p.lohn_netto + p.material_netto) * menge * 100) / 100
  const ekLine =
    p.einkaufspreis != null && Number.isFinite(p.einkaufspreis)
      ? Math.round(p.einkaufspreis * menge * 100) / 100
      : null
  return {
    id: p.id,
    auftrag_id: '',
    gewerk_slug: p.gewerk_slug ?? null,
    gewerk_name: p.gewerk_name,
    gewerk_block_key: p.gewerk_block_key,
    oberkategorie: null,
    unterkategorie: null,
    leistung_name: p.leistung_name?.trim() || p.leistung || 'Position',
    beschreibung: p.beschreibung ?? null,
    einheit: p.einheit ?? null,
    menge: p.menge ?? null,
    preis_fix: vkLine,
    preis_partner: ekLine,
    lohn_fix: null,
    material_fix: null,
    handwerker_id: p.handwerker_id ?? null,
    handwerker: p.handwerker_name?.trim() ? { name: p.handwerker_name.trim() } : null,
    sort_order: null,
  }
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
  const betragLabel = formatAngebotEurKurzBrutto(
    detail.gesamt_fix,
    detail.gesamt_min,
    detail.gesamt_max
  )
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

/** Angebot: Leistungen — shared Tabelle + Zuweisen wie Auftrag. */
export function AngebotLeistungenTab({
  detail,
  lead,
  onOpenDokument,
  onSaved,
}: {
  detail: AngebotDetail
  lead?: LeadDetail | null
  gewerke?: Gewerk[]
  editable?: boolean
  onSaved?: () => void
  onOpenDokument?: () => void
}) {
  const [zuweisungIds, setZuweisungIds] = useState<string[] | null>(null)

  const kannZuweisen = angebotDarfImWizardBearbeitetWerden(String(detail.status))

  const leistungPositionen = useMemo(
    () => (detail.positionen ?? []).filter((p) => !istGewerkBeschreibungPosition(p)),
    [detail.positionen]
  )

  const rows = useMemo(
    () =>
      leistungenFromAngebotPositionen(leistungPositionen, {
        status: 'entwurf',
        statusLabel: 'Im Angebot',
      }),
    [leistungPositionen]
  )

  const zuweisungPositionen = useMemo(
    () => leistungPositionen.map(angebotPosAlsZuweisungView),
    [leistungPositionen]
  )

  const summen = useMemo(() => summenAusPositionen(detail.positionen ?? [], 19), [detail.positionen])

  const projektName = useMemo(() => projektTitel(detail, lead), [detail, lead])

  const lvRows = useMemo(
    () => partnerLvZuweisungen(detail.angebot_handwerker),
    [detail.angebot_handwerker]
  )

  return (
    <>
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
        bulkActions={
          kannZuweisen
            ? [{ id: 'zuweisen', label: 'Zuweisen', onClick: (ids) => setZuweisungIds(ids) }]
            : undefined
        }
        drawerActionsForRow={
          kannZuweisen
            ? (row) => [
                {
                  id: 'zuweisen',
                  label: 'Zuweisen',
                  icon: 'user',
                  onClick: () => setZuweisungIds([row.id]),
                },
              ]
            : undefined
        }
        belowTable={
          lvRows.length ? (
            <AnfragePartnerEinholungCards
              rows={lvRows}
              showCta={false}
              onDeleted={onSaved}
            />
          ) : null
        }
      />

      {zuweisungIds ? (
        <AuftragLeistungZuweisungModal
          open
          onClose={() => setZuweisungIds(null)}
          auftragId={null}
          angebotId={detail.id}
          projektName={projektName}
          positionIds={zuweisungIds}
          positionen={zuweisungPositionen}
          gewerke={[]}
          onDone={() => {
            setZuweisungIds(null)
            onSaved?.()
          }}
        />
      ) : null}
    </>
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
      <AngebotLeistungenTab detail={props.detail} onSaved={props.onSaved} />
      <AngebotProjektinfosTab
        detail={props.detail}
        lead={props.lead}
        editable={props.editable}
        onSaved={props.onSaved}
      />
    </>
  )
}
