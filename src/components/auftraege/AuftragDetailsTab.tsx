'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useMemo, useState } from 'react'
import { toast } from '@/components/ui/app-toast'
import { AuftragDetailTopCards } from '@/components/auftraege/AuftragDetailTopCards'
import { EntityProjektUebersichtCard } from '@/components/crm/EntityProjektUebersichtCard'
import {
  LeistungenTab,
  leistungenFromAuftragPositionen,
} from '@/components/leistungen'
import { AuftragLeistungZuweisungModal } from '@/components/auftraege/leistungen-v3/AuftragLeistungZuweisungModal'
import { CrmPositionEintragModal } from '@/components/auftraege/CrmPositionEintragModal'
import { TagebuchAnfordernSheet } from '@/components/auftraege/TagebuchAnfordernSheet'
import {
  AuftragBautagebuchSection,
  type BautagebuchListenEintrag,
} from '@/components/auftraege/AuftragBautagebuchSection'
import { updateAuftragPositionLeistungStatus } from '@/app/(dashboard)/auftraege/positionen-steuerung-actions'
import { listAuftragPositionEintraege } from '@/app/(dashboard)/auftraege/position-lebenszyklus-actions'
import { AuftragPartnerPositionsPruefungPanel } from '@/components/auftraege/AuftragPartnerPositionsPruefungPanel'
import {
  updateAuftragNotizen,
  updateAuftragProjektFelder,
} from '@/app/(dashboard)/auftraege/actions'
import { buildFunnelBedarfExtraRows } from '@/lib/anfragen/funnel-bedarf-rows'
import { auftragFortschritt } from '@/lib/auftraege/auftrag-liste-helpers'
import { auftragPositionenToAngebotPositionen } from '@/lib/auftraege/auftrag-positionen-rechnung'
import { auftragSummenAusPositionen } from '@/lib/rechnungen/zahlungsplan'
import type { CrmTeamMitglied } from '@/lib/crm-team'
import type { AngebotDetail, AuftragDetail, Lead } from '@/lib/types'
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

/** Auftragdetails: Auftragsdaten + Projektdetails (gemeinsamer Tab). */
export function AuftragAuftragdetailsTab({
  detail,
  lead,
  team = [],
  editable = true,
  onSaved,
}: {
  detail: AuftragDetail
  lead?: AuftragLeadSnap | null
  team?: CrmTeamMitglied[]
  editable?: boolean
  onSaved?: () => void
}) {
  const fortschritt = auftragFortschritt(detail)
  const auftragNotiz = detail.notizen?.trim() || ''
  const angebotTitel = projektTitel(detail, lead)

  const funnelUi = useMemo(
    () => (lead ? buildFunnelBedarfExtraRows(lead) : { extraRows: [], footerRows: [] }),
    [lead]
  )

  return (
    <>
      <AuftragDetailTopCards detail={detail} team={team} />

      <EntityProjektUebersichtCard
        title="Projektdetails"
        icon="tool"
        initial={{
          titel: detail.titel?.trim() || angebotTitel,
          beschreibung: auftragNotiz,
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
        fortschritt={fortschritt}
        extraRows={funnelUi.extraRows}
      />
    </>
  )
}

/** Leistungen: shared read-only Tabelle + Drawer; Sammelaktionen nur Auftrag. */
export function AuftragLeistungenTab({
  detail,
  lead,
  editable = true,
  mwstSatz = 19,
  onSaved,
  onOpenDokument: _onOpenDokument,
  vertragNachtragVerfuegbar: _vertragNachtragVerfuegbar = false,
  onVertragNachtragErstellen: _onVertragNachtragErstellen,
  initialLeistungenView = 'leistungen',
}: {
  detail: AuftragDetail
  lead?: AuftragLeadSnap | null
  team?: CrmTeamMitglied[]
  gewerke?: { id: string; name: string; slug: string }[]
  angebotDetail?: AngebotDetail | null
  editable?: boolean
  mwstSatz?: number
  onSaved?: () => void
  onOpenDokument?: () => void
  vertragNachtragVerfuegbar?: boolean
  onVertragNachtragErstellen?: () => void
  /** Deep-Link z. B. ?tab=bautagebuch */
  initialLeistungenView?: 'leistungen' | 'bautagebuch'
}) {
  const [, startTransition] = useTransition()
  const [zuweisungIds, setZuweisungIds] = useState<string[] | null>(null)
  const [tagebuchOpen, setTagebuchOpen] = useState(false)
  const [tagebuchPositionId, setTagebuchPositionId] = useState<string | null>(null)
  const [anfordernOpen, setAnfordernOpen] = useState(false)
  const [bautagebuchEintraege, setBautagebuchEintraege] = useState<BautagebuchListenEintrag[]>([])
  const [leistungenView, setLeistungenView] = useState<'leistungen' | 'bautagebuch'>(
    initialLeistungenView
  )

  useEffect(() => {
    setLeistungenView(initialLeistungenView)
  }, [initialLeistungenView])

  const istAbgeschlossen = detail.status === 'abgeschlossen' || detail.status === 'storniert'
  const disabled = istAbgeschlossen || !editable
  const angebotTitel = projektTitel(detail, lead)

  const posNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of detail.auftrag_positionen ?? []) {
      m.set(p.id, p.leistung_name?.trim() || 'Leistung')
    }
    return m
  }, [detail.auftrag_positionen])

  const footerNettoMwst = useMemo(() => {
    const pos = (detail.auftrag_positionen ?? []).filter(
      (p) => (p.aenderung_typ ?? '').toLowerCase() !== 'entfernt'
    )
    const zeitMap: Record<string, number> = {}
    for (const e of bautagebuchEintraege) {
      const pid = e.position_id?.trim()
      if (!pid) continue
      zeitMap[pid] = (zeitMap[pid] ?? 0) + (Number(e.zeit_minuten) || 0)
    }
    const netto = auftragSummenAusPositionen(
      auftragPositionenToAngebotPositionen(pos, { regieZeitMinutenByPositionId: zeitMap })
    ).netto
    const satz = Math.max(0, mwstSatz)
    const mwstBetrag = Math.round(netto * (satz / 100) * 100) / 100
    return { netto, mwstSatz: satz, mwstBetrag }
  }, [detail.auftrag_positionen, mwstSatz, bautagebuchEintraege])

  const rows = useMemo(() => {
    return leistungenFromAuftragPositionen(detail.auftrag_positionen ?? [], {
      eintraege: bautagebuchEintraege.map((e) => ({
        position_id: e.position_id,
        typ: e.typ,
        beschreibung: e.beschreibung,
        zeit_minuten: e.zeit_minuten,
        created_at: e.created_at,
        erfasst_von: e.erfasst_von,
        fotoCount: e.eintrag_fotos?.length ?? 0,
      })),
    })
  }, [detail.auftrag_positionen, bautagebuchEintraege])

  useEffect(() => {
    let cancelled = false
    void listAuftragPositionEintraege(detail.id).then((list) => {
      if (cancelled) return
      const enriched: BautagebuchListenEintrag[] = []
      for (const e of list) {
        const leistungName = e.position_id ? posNameById.get(e.position_id) ?? null : null
        enriched.push({ ...e, leistungName })
      }
      setBautagebuchEintraege(enriched)
    })
    return () => {
      cancelled = true
    }
  }, [detail.id, detail.updated_at, posNameById])

  function openTagebuch(positionId?: string | null) {
    setTagebuchPositionId(positionId ?? null)
    setTagebuchOpen(true)
  }

  function markErledigt(ids: string[]) {
    if (disabled || !ids.length) return
    startTransition(async () => {
      for (const positionId of ids) {
        const r = await updateAuftragPositionLeistungStatus({
          auftragId: detail.id,
          positionId,
          status: 'erledigt',
        })
        if (!r.ok) {
          toast.error(r.message)
          return
        }
      }
      toast.success(ids.length === 1 ? 'Als erledigt markiert.' : `${ids.length} Leistungen erledigt.`)
      onSaved?.()
    })
  }

  return (
    <div className="space-y-4">
      <div className="lt-view-seg" role="tablist" aria-label="Ansicht">
        <button
          type="button"
          role="tab"
          aria-selected={leistungenView === 'leistungen'}
          className={leistungenView === 'leistungen' ? 'on' : undefined}
          onClick={() => setLeistungenView('leistungen')}
        >
          Leistungen
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={leistungenView === 'bautagebuch'}
          className={leistungenView === 'bautagebuch' ? 'on' : undefined}
          onClick={() => setLeistungenView('bautagebuch')}
        >
          Bautagebuch
          {bautagebuchEintraege.length > 0 ? (
            <span className="lt-view-seg__count">{bautagebuchEintraege.length}</span>
          ) : null}
        </button>
      </div>

      {leistungenView === 'leistungen' ? (
        <>
          <AuftragPartnerPositionsPruefungPanel
            auftragId={detail.id}
            disabled={disabled}
            onChanged={onSaved}
          />
          <LeistungenTab
            phase="auftrag"
            rows={rows}
            groupByGewerk
            footerNettoMwst={footerNettoMwst}
            dokumentHint={null}
            emptyHint="Noch keine Leistungen am Auftrag. Sie entstehen mit dem angenommenen Angebot."
            bulkActions={
              disabled
                ? undefined
                : [
                    { id: 'zuweisen', label: 'Zuweisen', onClick: (ids) => setZuweisungIds(ids) },
                    { id: 'erledigt', label: 'Erledigt', onClick: markErledigt },
                  ]
            }
            drawerActionsForRow={
              disabled
                ? undefined
                : (row) => [
                    {
                      id: 'zuweisen',
                      label: 'Zuweisung ändern',
                      icon: 'user',
                      onClick: () => setZuweisungIds([row.id]),
                    },
                  ]
            }
          />
        </>
      ) : (
        <AuftragBautagebuchSection
          eintraege={bautagebuchEintraege}
          disabled={disabled}
          onAdd={() => openTagebuch(null)}
          onAnfordern={() => setAnfordernOpen(true)}
        />
      )}

      {zuweisungIds ? (
        <AuftragLeistungZuweisungModal
          open
          onClose={() => setZuweisungIds(null)}
          auftragId={detail.id}
          angebotId={detail.angebot_id}
          projektName={angebotTitel}
          positionIds={zuweisungIds}
          positionen={detail.auftrag_positionen ?? []}
          gewerke={[]}
          onDone={() => {
            setZuweisungIds(null)
            onSaved?.()
          }}
        />
      ) : null}

      <CrmPositionEintragModal
        open={tagebuchOpen}
        onClose={() => setTagebuchOpen(false)}
        auftragId={detail.id}
        positionen={detail.auftrag_positionen ?? []}
        initialPositionId={tagebuchPositionId}
        onSaved={() => onSaved?.()}
      />

      <TagebuchAnfordernSheet
        open={anfordernOpen}
        onClose={() => setAnfordernOpen(false)}
        auftragId={detail.id}
        auftragHandwerker={detail.auftrag_handwerker ?? []}
        positionen={detail.auftrag_positionen ?? []}
        onSent={() => onSaved?.()}
      />
    </div>
  )
}

/** @deprecated Nutze AuftragAuftragdetailsTab + AuftragLeistungenTab. */
export function AuftragDetailsTab(props: {
  detail: AuftragDetail
  lead?: AuftragLeadSnap | null
  team?: CrmTeamMitglied[]
  gewerke?: { id: string; name: string; slug: string }[]
  angebotDetail?: AngebotDetail | null
  editable?: boolean
  onSaved?: () => void
}) {
  return (
    <>
      <AuftragAuftragdetailsTab
        detail={props.detail}
        lead={props.lead}
        team={props.team}
        editable={props.editable}
        onSaved={props.onSaved}
      />
      <AuftragLeistungenTab
        detail={props.detail}
        lead={props.lead}
        gewerke={props.gewerke}
        angebotDetail={props.angebotDetail}
        editable={props.editable}
        onSaved={props.onSaved}
      />
    </>
  )
}
