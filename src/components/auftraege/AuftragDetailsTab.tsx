'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { toast } from '@/components/ui/app-toast'
import { AuftragDetailTopCards } from '@/components/auftraege/AuftragDetailTopCards'
import { EntityProjektUebersichtCard } from '@/components/crm/EntityProjektUebersichtCard'
import {
  LeistungenTab,
  leistungenFromAuftragPositionen,
  maengelFuerLeistungenTab,
  type LeistungMangelAnzeige,
} from '@/components/leistungen'
import { AuftragLeistungZuweisungModal } from '@/components/auftraege/leistungen-v3/AuftragLeistungZuweisungModal'
import { CrmPositionEintragModal } from '@/components/auftraege/CrmPositionEintragModal'
import { updateAuftragPositionLeistungStatus } from '@/app/(dashboard)/auftraege/positionen-steuerung-actions'
import { loadAbnahmeprotokollSummary } from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import { listAuftragPositionEintraege } from '@/app/(dashboard)/auftraege/position-lebenszyklus-actions'
import { eintragTypLabel } from '@/lib/auftraege/position-lebenszyklus'
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
import { Button } from '@/components/ui/Button'

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
  onOpenDokument,
  vertragNachtragVerfuegbar = false,
  onVertragNachtragErstellen,
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
}) {
  const [, startTransition] = useTransition()
  const [zuweisungIds, setZuweisungIds] = useState<string[] | null>(null)
  const [maengel, setMaengel] = useState<LeistungMangelAnzeige[]>([])
  const [tagebuchOpen, setTagebuchOpen] = useState(false)
  const [tagebuchPositionId, setTagebuchPositionId] = useState<string | null>(null)
  const [eintragByPos, setEintragByPos] = useState<
    Record<string, { at?: string | null; text: string }[]>
  >({})

  const istAbgeschlossen = detail.status === 'abgeschlossen' || detail.status === 'storniert'
  const disabled = istAbgeschlossen || !editable
  const angebotTitel = projektTitel(detail, lead)

  const footerNettoMwst = useMemo(() => {
    const netto = auftragSummenAusPositionen(
      auftragPositionenToAngebotPositionen(
        (detail.auftrag_positionen ?? []).filter(
          (p) => (p.aenderung_typ ?? '').toLowerCase() !== 'entfernt'
        )
      )
    ).netto
    const satz = Math.max(0, mwstSatz)
    const mwstBetrag = Math.round(netto * (satz / 100) * 100) / 100
    return { netto, mwstSatz: satz, mwstBetrag }
  }, [detail.auftrag_positionen, mwstSatz])

  const rows = useMemo(() => {
    const base = leistungenFromAuftragPositionen(detail.auftrag_positionen ?? [])
    const mangelGewerke = new Set(
      maengel
        .filter((m) => m.status !== 'behoben')
        .map((m) => (m.gewerk ?? '').trim().toLowerCase())
        .filter(Boolean)
    )
    return base.map((row) => {
      const extra = eintragByPos[row.id]
      const existing = row.dokumentationEintraege ?? []
      const doku = extra?.length ? [...extra, ...existing] : existing
      const hatMangel =
        Boolean(row.gewerkName && mangelGewerke.has(row.gewerkName.trim().toLowerCase())) &&
        row.status !== 'erledigt' &&
        row.status !== 'abgenommen'
      return {
        ...row,
        dokumentationEintraege: doku,
        hatMangel,
        status: hatMangel ? 'mangel' : row.status,
        statusLabel: hatMangel ? 'Mangel' : row.statusLabel,
        subline: hatMangel
          ? [row.handwerkerName, 'Mangel erfasst'].filter(Boolean).join(' · ')
          : row.subline,
      }
    })
  }, [detail.auftrag_positionen, eintragByPos, maengel])

  useEffect(() => {
    let cancelled = false
    void loadAbnahmeprotokollSummary(detail.id).then((s) => {
      if (cancelled) return
      setMaengel(
        s
          ? maengelFuerLeistungenTab(s.maengel ?? [], s.punkte ?? [])
          : []
      )
    })
    void listAuftragPositionEintraege(detail.id).then((list) => {
      if (cancelled) return
      const m: Record<string, { at?: string | null; text: string }[]> = {}
      for (const e of list) {
        if (!e.position_id) continue
        const text = [eintragTypLabel(e.typ), e.beschreibung?.trim()].filter(Boolean).join(': ')
        if (!text) continue
        const arr = m[e.position_id] ?? []
        arr.push({ at: e.ereignis_zeit || e.created_at || null, text })
        m[e.position_id] = arr
      }
      setEintragByPos(m)
    })
    return () => {
      cancelled = true
    }
  }, [detail.id, detail.updated_at])

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
    <>
      <LeistungenTab
        phase="auftrag"
        rows={rows}
        maengel={maengel}
        groupByGewerk
        footerNettoMwst={footerNettoMwst}
        onOpenDokument={
          vertragNachtragVerfuegbar && onVertragNachtragErstellen
            ? onVertragNachtragErstellen
            : onOpenDokument
        }
        dokumentHint="Positionen sind beauftragt — Änderungen brauchen einen Nachtrag."
        dokumentActionLabel="Nachtrag erstellen"
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
                  id: 'fortschritt',
                  label: 'Fortschritt erfassen',
                  variant: 'primary',
                  onClick: () => openTagebuch(row.id),
                },
                {
                  id: 'zuweisen',
                  label: 'Zuweisung ändern',
                  variant: 'ghost',
                  onClick: () => setZuweisungIds([row.id]),
                },
                {
                  id: 'abnahme',
                  label: 'Abnahme erfassen',
                  variant: 'ghost',
                  onClick: () => {
                    window.location.href = `/auftraege/${detail.id}/abnahme/erstellen`
                  },
                  disabled: row.status === 'erledigt' || row.status === 'abgenommen',
                },
              ]
        }
        belowTable={
          !disabled ? (
            <button type="button" className="lt-add-entry" onClick={() => openTagebuch(null)}>
              + Tagebuch-Eintrag
            </button>
          ) : null
        }
      />

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
    </>
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
