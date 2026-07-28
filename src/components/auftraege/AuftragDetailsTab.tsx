'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
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
import { AuftragAbnahmeprotokollCard } from '@/components/auftraege/AuftragAbnahmeprotokollCard'
import { CrmPositionEintragModal } from '@/components/auftraege/CrmPositionEintragModal'
import { AuftragNachtragBaustoppSection } from '@/components/auftraege/AuftragNachtragBaustoppSection'
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
  const rows = useMemo(() => {
    const base = leistungenFromAuftragPositionen(detail.auftrag_positionen ?? [])
    return base.map((row) => {
      const extra = eintragByPos[row.id]
      if (!extra?.length) return row
      const existing = row.dokumentationEintraege ?? []
      return {
        ...row,
        dokumentationEintraege: [...extra, ...existing],
      }
    })
  }, [detail.auftrag_positionen, eintragByPos])

  useEffect(() => {
    let cancelled = false
    void loadAbnahmeprotokollSummary(detail.id).then((s) => {
      if (cancelled) return
      setMaengel(s ? maengelFuerLeistungenTab(s.maengel ?? []) : [])
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
        onOpenDokument={onOpenDokument}
        dokumentHint="Positionen stammen aus dem Angebot. Änderungen öffnen das Dokument — hier nur Steuerung."
        emptyHint="Noch keine Leistungen am Auftrag. Sie entstehen mit dem angenommenen Angebot."
        bulkActions={
          disabled
            ? undefined
            : [
                { id: 'zuweisen', label: 'Zuweisen', onClick: (ids) => setZuweisungIds(ids) },
                { id: 'erledigt', label: 'Erledigt', onClick: markErledigt },
                { id: 'termin', label: 'Termin', onClick: (ids) => setZuweisungIds(ids) },
              ]
        }
        drawerActionsForRow={
          disabled
            ? undefined
            : (row) => [
                {
                  id: 'zuweisen',
                  label: row.handwerkerId ? 'Handwerker ändern' : 'Handwerker anfragen',
                  variant: 'secondary',
                  onClick: () => setZuweisungIds([row.id]),
                },
                {
                  id: 'tagebuch',
                  label: 'Tagebucheintrag',
                  variant: 'secondary',
                  onClick: () => openTagebuch(row.id),
                },
                {
                  id: 'erledigt',
                  label: 'Als erledigt',
                  variant: 'secondary',
                  onClick: () => markErledigt([row.id]),
                  disabled: row.status === 'erledigt',
                },
              ]
        }
        belowTable={
          <div className="space-y-4 pt-1">
            <div className="flex flex-wrap gap-2">
              {!disabled ? (
                <Button type="button" variant="secondary" onClick={() => openTagebuch(null)}>
                  Tagebucheintrag
                </Button>
              ) : null}
              <a
                className="btn ghost"
                href={`/api/auftraege/${detail.id}/regiebericht-lebenszyklus`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Regiebericht PDF
              </a>
              <a
                className="btn ghost"
                href={`/api/auftraege/${detail.id}/bautagebuch-lebenszyklus`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Bautagebuch PDF
              </a>
            </div>
            <AuftragAbnahmeprotokollCard auftragId={detail.id} onChanged={() => onSaved?.()} />
            <AuftragNachtragBaustoppSection
              detail={detail}
              onChanged={() => onSaved?.()}
              vertragNachtragVerfuegbar={vertragNachtragVerfuegbar}
              onVertragNachtragErstellen={onVertragNachtragErstellen}
            />
          </div>
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
