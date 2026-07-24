'use client'

import { useEffect, useMemo, useState } from 'react'
import { AuftragDetailTopCards } from '@/components/auftraege/AuftragDetailTopCards'
import { AuftragPositionenSteuerungTab } from '@/components/auftraege/AuftragPositionenSteuerungTab'
import { EntityProjektUebersichtCard } from '@/components/crm/EntityProjektUebersichtCard'
import { VorgangArtWiederkehrField } from '@/components/vorgang/VorgangArtWiederkehrField'
import { toast } from '@/components/ui/app-toast'
import {
  updateAuftragNotizen,
  updateAuftragProjektFelder,
} from '@/app/(dashboard)/auftraege/actions'
import type { HandwerkerZuweisenKontext } from '@/components/auftraege/HandwerkerZuweisenModal'
import { buildFunnelBedarfExtraRows } from '@/lib/anfragen/funnel-bedarf-rows'
import { auftragFortschritt } from '@/lib/auftraege/auftrag-liste-helpers'
import type { CrmTeamMitglied } from '@/lib/crm-team'
import type {
  AngebotDetail,
  AngebotHandwerkerRow,
  AuftragDetail,
  Lead,
} from '@/lib/types'
import {
  normalizeVorgangWiederkehr,
  type VorgangWiederkehr,
} from '@/lib/vorgang/wiederkehrend'
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

/** Auftrag: Steuerung + Ausführung + Leistungen mit Handwerker-Zuweisung/Status. */
export function AuftragDetailsTab({
  detail,
  lead,
  team = [],
  gewerke = [],
  angebotDetail = null,
  editable = true,
  onSaved,
}: {
  detail: AuftragDetail
  lead?: AuftragLeadSnap | null
  team?: CrmTeamMitglied[]
  gewerke?: { id: string; name: string; slug: string }[]
  angebotDetail?: AngebotDetail | null
  editable?: boolean
  onSaved?: () => void
}) {
  const fortschritt = auftragFortschritt(detail)
  const auftragNotiz = detail.notizen?.trim() || ''
  const angebotTitel = projektTitel(detail, lead)
  const istAbgeschlossen = detail.status === 'abgeschlossen' || detail.status === 'storniert'

  const [wiederkehr, setWiederkehr] = useState<VorgangWiederkehr>(() =>
    normalizeVorgangWiederkehr({
      ist_wiederkehrend: detail.ist_wiederkehrend,
      wiederkehr_turnus: detail.wiederkehr_turnus,
    })
  )
  const [wiederkehrSaving, setWiederkehrSaving] = useState(false)

  useEffect(() => {
    setWiederkehr(
      normalizeVorgangWiederkehr({
        ist_wiederkehrend: detail.ist_wiederkehrend,
        wiederkehr_turnus: detail.wiederkehr_turnus,
      })
    )
  }, [detail.id, detail.ist_wiederkehrend, detail.wiederkehr_turnus])

  const handwerkerKontext = useMemo((): HandwerkerZuweisenKontext => {
    const k = detail.kunden
    return {
      kundeName: k?.name?.trim() || lead?.kontakt_name?.trim() || 'Kunde',
      adresse: k?.adresse?.trim() || k?.strasse?.trim() || null,
      plz: k?.plz?.trim() || lead?.plz?.trim() || null,
      ort: k?.ort?.trim() || null,
      startDatum: detail.start_datum,
      endDatum: detail.end_datum,
      notizen: detail.notizen,
    }
  }, [detail, lead])

  const angebotHandwerker = useMemo(
    (): AngebotHandwerkerRow[] => angebotDetail?.angebot_handwerker ?? [],
    [angebotDetail]
  )

  const funnelUi = useMemo(
    () => (lead ? buildFunnelBedarfExtraRows(lead) : { extraRows: [], footerRows: [] }),
    [lead]
  )

  function saveWiederkehr(next: VorgangWiederkehr) {
    if (!editable || wiederkehrSaving) return
    const prev = wiederkehr
    setWiederkehr(next)
    setWiederkehrSaving(true)
    void updateAuftragProjektFelder(detail.id, {
      ist_wiederkehrend: next.ist_wiederkehrend,
      wiederkehr_turnus: next.wiederkehr_turnus,
    }).then((r) => {
      setWiederkehrSaving(false)
      if (!r.ok) {
        toast.error(r.message)
        setWiederkehr(prev)
        return
      }
      toast.success(
        next.ist_wiederkehrend
          ? 'Als wiederkehrende Leistung gespeichert'
          : 'Als einmalige Leistung gespeichert'
      )
      onSaved?.()
    })
  }

  return (
    <>
      <AuftragDetailTopCards detail={detail} team={team} />

      <AuftragPositionenSteuerungTab
        auftragId={detail.id}
        positionen={detail.auftrag_positionen ?? []}
        gewerke={gewerke}
        angebotId={detail.angebot_id}
        angebotTitel={angebotTitel}
        angebotHandwerker={angebotHandwerker}
        handwerkerRows={detail.auftrag_handwerker ?? []}
        handwerkerKontext={handwerkerKontext}
        auftragAbgeschlossen={istAbgeschlossen || !editable}
        onChanged={() => onSaved?.()}
      />

      <div
        className="card"
        style={{
          marginTop: 16,
          padding: 16,
          opacity: wiederkehrSaving ? 0.7 : 1,
        }}
      >
        <VorgangArtWiederkehrField
          value={wiederkehr}
          disabled={!editable || wiederkehrSaving}
          onChange={saveWiederkehr}
          hint="Auch nach Angebotsannahme hier änderbar — Filter „Bestand“ in Vorgänge"
        />
      </div>

      <EntityProjektUebersichtCard
        title="Projektinfos"
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
