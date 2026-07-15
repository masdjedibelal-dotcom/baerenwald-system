'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import {
  CalendarClock,
  Check,
  Download,
  ExternalLink,
  History,
  LayoutGrid,
  List,
  ListChecks,
  Mail,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Sparkles,
  CircleX,
  Send,
  Trash2,
} from 'lucide-react'
import { DetailHead } from '@/components/layout/DetailHead'
import { EntityDetailLayout } from '@/components/layout/EntityDetailLayout'
import { PosBoard } from '@/components/posboard/PosBoard'
import {
  MockCard,
  MockDetailShell,
  MockDokumenteCard,
  MockEntityRowMenu,
  MockProjektUebersichtCard,
  MockProp,
  MockVerlaufCard,
} from '@/components/mock-ui'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { RichTextContent } from '@/components/ui/RichTextContent'
import { istGewerkBeschreibungPosition } from '@/lib/dokument-zeilen'
import { kundenObjektKurzlabel } from '@/lib/kunden-objekte'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { EmailPillsField } from '@/components/ui/EmailPillsField'
import { LeadTimelineList } from '@/components/anfragen/LeadTimelineList'
import { listEntityMenuItems } from '@/lib/list-entity-menu'
import { useKundenMailCompose } from '@/components/kommunikation/useKundenMailCompose'
import { mailComposeContextFromAngebot } from '@/app/(dashboard)/kommunikation/actions'
import { toast } from '@/components/ui/app-toast'
import {
  acceptAngebotAndCreateAuftrag,
  markAngebotAbgelehntEinfach,
  resendAngebotEinfach,
  sendAngebotEinfach,
  sendAngebotNachfassManuellAction,
} from '@/app/(dashboard)/angebote/angebot-flow-actions'
import { extendAngebotGueltigkeit } from '@/app/(dashboard)/angebote/extend-gueltigkeit-action'
import { loadAngebotWizardBootstrap } from '@/app/(dashboard)/angebote/wizard-actions'
import { AngebotBearbeitenWahlModal } from '@/components/angebote/AngebotBearbeitenWahlModal'
import { previewAuftragsbestaetigungMail, deleteAngebot } from '@/app/(dashboard)/angebote/actions'
import { KUNDE_MAIL_BCC_HINT } from '@/lib/mail-constants'
import { AngebotAnhaengeTab, anzahlAngebotAnhaenge } from '@/components/angebote/AngebotAnhaengeTab'
import { ENTITY_DETAIL_TAB_LABELS } from '@/lib/entity-detail/entity-detail-tabs'
import { AngebotOrgFreigabeBanner } from '@/components/angebote/AngebotOrgFreigabeBanner'
import { AngebotVersandSection } from '@/components/angebote/AngebotVersandSection'
import { AngebotWizard } from '@/components/angebote/AngebotWizard'
import { KundeModal } from '@/components/kunden/KundeModal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DetailMetaChip, DetailMetaRow } from '@/components/ui/DetailMetaChip'
import {
  angebotSummenBrutto,
  betragAnzeige,
  daysUntil,
  addDaysYmd,
  erinnerungGeplantAm,
  erinnerungReferenzAm,
  gesendetAmWert,
  gueltigBisClass,
  gueltigBisTone,
  heuteYmd,
  kundeNameAusAngebot,
  resolveStatusEinfach,
} from '@/lib/angebot-einfach'
import { angebotStatusDisplay } from '@/lib/status/status-display'
import { resolveVorgangFromCrmEntities } from '@/lib/vorgang/resolve-from-crm-entities'
import { vorgangBackNav } from '@/lib/vorgang/vorgang-back-nav'
import { angebotWizardZahlungLabel, angebotDarfImWizardBearbeitetWerden, parseZahlungsbedingungenKey, type AngebotWizardBootstrap } from '@/lib/angebote/angebot-wizard-types'
import { angebotPositionenToPosBoardLines } from '@/lib/posboard/position-adapters'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { KundenStammdatenCard } from '@/components/kunden/KundenStammdatenCard'
import type { AngebotDetail, Gewerk, LeadDetail, LeadTimelineRow, Preisliste } from '@/lib/types'
import { cn, formatDatum, formatDatumZeit } from '@/lib/utils'
import {
  KUNDE_ABLEHNUNG_GRUND_LABELS,
  KUNDE_ABLEHNUNG_GRUND_OPTIONS,
} from '@/lib/angebote/ablehnung-labels'
import {
  darfAngebotAnKundeSenden,
  handwerkerSendenBlockierHinweis,
} from '@/lib/angebote/angebot-handwerker-flow'
import { summenAusPositionen } from '@/lib/angebot-positionen'

export function AngebotDetailPageClient({
  detail,
  timeline: timelineInitial,
  auftragId,
  gewerke,
  wizardPreislisten,
  wizardFirm,
  lead,
  projektKontext,
}: {
  detail: AngebotDetail
  timeline: LeadTimelineRow[]
  auftragId: string | null
  gewerke: Gewerk[]
  wizardPreislisten: Preisliste[]
  wizardFirm: FirmenEinstellungen
  lead: LeadDetail | null
  projektKontext?: import('@/lib/crm/projekt-kontext-types').ProjektKontext
}) {
  const router = useRouter()
  const { refresh, generation } = useCrmRefresh()
  const [pending, startTransition] = useTransition()
  const [acceptOpen, setAcceptOpen] = useState(false)
  const [aufStart, setAufStart] = useState(() => addDaysYmd(heuteYmd(), 7))
  const [aufEnde, setAufEnde] = useState(() => addDaysYmd(addDaysYmd(heuteYmd(), 7), 14))
  const [aufBetreff, setAufBetreff] = useState('')
  const [aufTo, setAufTo] = useState<string[]>([])
  const [aufCc, setAufCc] = useState<string[]>([])
  const [aufPreviewHtml, setAufPreviewHtml] = useState('')
  const [aufPreviewLoading, setAufPreviewLoading] = useState(false)
  const [ablehnOpen, setAblehnOpen] = useState(false)
  const [abGrund, setAbGrund] = useState('zu_teuer')
  const [abNotiz, setAbNotiz] = useState('')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardBootstrap, setWizardBootstrap] = useState<AngebotWizardBootstrap | null>(null)
  const [wizardSessionKey, setWizardSessionKey] = useState(0)
  const [bearbeitenWahlOpen, setBearbeitenWahlOpen] = useState(false)
  const [verlaengernOpen, setVerlaengernOpen] = useState(false)
  const [verlaengernDatum, setVerlaengernDatum] = useState(() => {
    const raw = detail.gueltig_bis?.slice(0, 10)
    if (raw && raw > heuteYmd()) return raw
    return addDaysYmd(heuteYmd(), 30)
  })
  const [stammdatenModalOpen, setStammdatenModalOpen] = useState(false)
  const [kundeVersandOpen, setKundeVersandOpen] = useState(false)

  const orgFreigabeStatus = lead?.org_freigabe_status ?? null

  const statusEinfach = resolveStatusEinfach(detail)
  const { backHref, backLabel } = vorgangBackNav('angebot')
  const resolvedVorgang = useMemo(() => {
    if (!lead) return null
    return resolveVorgangFromCrmEntities({
      lead: {
        id: lead.id,
        status: lead.status,
        situation: lead.situation,
        funnel_daten: lead.funnel_daten,
        kanal: lead.kanal,
        org_freigabe_status: lead.org_freigabe_status,
        hv_meldung_status: lead.hv_meldung_status,
        kontakt_name: lead.kontakt_name,
        plz: lead.plz,
        bereiche: lead.bereiche,
        created_at: lead.created_at,
        updated_at: lead.updated_at,
      },
      angebote: [
        {
          id: detail.id,
          status: detail.status,
          status_einfach: statusEinfach,
          gesendet_am: detail.gesendet_am,
          gesendet_kunde_at: detail.gesendet_kunde_at,
          created_at: detail.created_at,
          updated_at: detail.updated_at,
        },
      ],
      auftraege: auftragId
        ? [{ id: auftragId, status: 'offen', created_at: detail.created_at }]
        : [],
    })
  }, [lead, detail, statusEinfach, auftragId])
  const angebotStatus = useMemo(() => angebotStatusDisplay(detail), [detail])
  const kannVerlaengern = statusEinfach === 'gesendet' || statusEinfach === 'abgelaufen'

  const positionenAnzeigeCount = useMemo(
    () => (detail.positionen ?? []).filter((p) => !istGewerkBeschreibungPosition(p)).length,
    [detail.positionen]
  )

  const kannBearbeiten =
    (statusEinfach === 'entwurf' || statusEinfach === 'gesendet' || statusEinfach === 'abgelaufen') &&
    angebotDarfImWizardBearbeitetWerden(detail.status)

  /** Positionen v3: wie Auftrag — solange Wizard-Status es erlaubt (auch nach Kundenannahme). */
  const positionenBearbeitbar = angebotDarfImWizardBearbeitetWerden(detail.status)

  function openWizardMitBootstrap(bootstrap: AngebotWizardBootstrap) {
    setWizardBootstrap(bootstrap)
    setWizardSessionKey((k) => k + 1)
    setWizardOpen(true)
  }

  function openWizardBearbeiten() {
    if (!kannBearbeiten) {
      toast.error('Dieses Angebot kann nicht mehr bearbeitet werden.')
      return
    }
    if (!detail.lead_id || !lead) {
      router.push(`/angebote/neu?angebot_id=${detail.id}`)
      return
    }
    if (statusEinfach !== 'entwurf') {
      setBearbeitenWahlOpen(true)
      return
    }
    startTransition(async () => {
      const res = await loadAngebotWizardBootstrap(detail.id, detail.lead_id!)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      openWizardMitBootstrap(res.bootstrap)
    })
  }

  function closeWizard() {
    setWizardOpen(false)
    setWizardBootstrap(null)
  }

  const kunde = detail.kunden

  useEffect(() => {
    if (!acceptOpen) return
    let cancelled = false
    setAufPreviewLoading(true)
    void previewAuftragsbestaetigungMail({
      angebotId: detail.id,
      start_datum: aufStart,
      end_datum: aufEnde || null,
    }).then((res) => {
      if (cancelled) return
      setAufPreviewLoading(false)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      setAufBetreff((prev) => prev.trim() || res.betreff)
      setAufTo((prev) => (prev.length ? prev : res.defaultTo))
      setAufCc((prev) => (prev.length ? prev : res.defaultCc))
      setAufPreviewHtml(res.html)
    })
    return () => {
      cancelled = true
    }
  }, [acceptOpen, detail.id, aufStart, aufEnde])

  const kundeName = kundeNameAusAngebot(detail)
  const summen = useMemo(() => angebotSummenBrutto(detail.positionen ?? []), [detail.positionen])
  const summenMail = useMemo(
    () => summenAusPositionen(detail.positionen ?? [], 19),
    [detail.positionen]
  )
  const gueltigBisYmd = detail.gueltig_bis?.slice(0, 10) ?? addDaysYmd(heuteYmd(), 30)
  const kannAngebotVersenden =
    (statusEinfach === 'entwurf' || detail.status === 'handwerker_akzeptiert') &&
    darfAngebotAnKundeSenden(detail.angebot_handwerker ?? [], detail.status) &&
    Boolean(kunde?.email?.trim())
  const gueltigTone = gueltigBisTone(detail.gueltig_bis)
  const tageRest = daysUntil(detail.gueltig_bis)
  const gesendetAm = gesendetAmWert(detail)
  const zahlungLabel = angebotWizardZahlungLabel(
    parseZahlungsbedingungenKey(
      detail.zahlungsbedingungen,
      detail.kunden?.typ ?? detail.leads?.kundentyp
    )
  )

  const timelineCount = timelineInitial.length || 1

  const anhaengeCount = useMemo(() => anzahlAngebotAnhaenge(detail), [detail])

  const betragLabel = betragAnzeige(detail.gesamt_fix, detail.gesamt_min, detail.gesamt_max)
  const headMeta = (
    <DetailMetaRow>
      {betragLabel ? <DetailMetaChip>{betragLabel}</DetailMetaChip> : null}
      {detail.gueltig_bis ? (
        <DetailMetaChip icon={CalendarClock}>gültig bis {formatDatum(detail.gueltig_bis)}</DetailMetaChip>
      ) : null}
      {detail.angebotsnr ? (
        <DetailMetaChip className="font-mono text-[11px]">{detail.angebotsnr}</DetailMetaChip>
      ) : null}
    </DetailMetaRow>
  )

  function openVerlaengernModal() {
    const raw = detail.gueltig_bis?.slice(0, 10)
    setVerlaengernDatum(raw && raw > heuteYmd() ? raw : addDaysYmd(heuteYmd(), 30))
    setVerlaengernOpen(true)
  }

  const mailCompose = useKundenMailCompose({ onSent: () => refresh() })
  const kundeEmail = kunde?.email?.trim() ?? ''

  function openAngebotVersandModal() {
    if (kannAngebotVersenden) {
      setKundeVersandOpen(true)
      return
    }
    if (!kundeEmail) {
      toast.error('Kunden-E-Mail fehlt — Versand nicht möglich.')
      return
    }
    toast.error(
      handwerkerSendenBlockierHinweis(detail.angebot_handwerker ?? [], orgFreigabeStatus) ||
        'Angebot kann derzeit nicht an den Kunden gesendet werden.'
    )
  }

  function openAcceptModal() {
    setAufBetreff('')
    setAufTo([])
    setAufCc([])
    setAufPreviewHtml('')
    setAcceptOpen(true)
  }

  function run(action: () => Promise<{ ok: boolean; message?: string }>, okMsg: string) {
    startTransition(async () => {
      const res = await action()
      if (!res.ok) {
        toast.error(res.message ?? 'Fehler')
        return
      }
      toast.success(okMsg)
      refresh()
    })
  }

  const detailHeadMenuItems = useMemo(
    () => {
      const menuStatus =
        statusEinfach === 'abgelaufen' ? 'gesendet' : statusEinfach
      const extra: Array<
        | 'sep'
        | { icon?: string; label: string; hint?: string; danger?: boolean; onClick: () => void }
      > = [
        {
          icon: 'mail',
          label: 'E-Mail schreiben',
          hint: kundeEmail ? undefined : 'E-Mail im Modal eintragen',
          onClick: () => mailCompose.openCompose(() => mailComposeContextFromAngebot(detail.id)),
        },
      ]

      if (kannVerlaengern) {
        extra.push({
          icon: 'calendar-event',
          label: 'Verlängern',
          onClick: openVerlaengernModal,
        })
      }

      if (statusEinfach === 'gesendet' || statusEinfach === 'abgelaufen') {
        if (!detail.nachgefasst_am && statusEinfach === 'gesendet') {
          extra.push({
            icon: 'mail',
            label: 'Nachfassen',
            hint: 'Erinnerungs-Mail an Kunden',
            onClick: () =>
              run(() => sendAngebotNachfassManuellAction(detail.id), 'Nachfass-Mail gesendet'),
          })
        }
        extra.push({
          icon: 'circle-x',
          label: 'Abgelehnt',
          onClick: () => setAblehnOpen(true),
        })
      }

      if (statusEinfach === 'entwurf' && !auftragId) {
        extra.push({
          icon: 'check',
          label: 'Angebot annehmen',
          hint: 'Auch ohne vorherigen Versand',
          onClick: openAcceptModal,
        })
      }

      return listEntityMenuItems(
        'angebot',
        {
          titel: detail.angebotsnr ?? kundeNameAusAngebot(detail),
          status: menuStatus,
        },
        {
          onEdit: kannBearbeiten ? openWizardBearbeiten : undefined,
          onAccept:
            statusEinfach === 'gesendet' || statusEinfach === 'abgelaufen'
              ? openAcceptModal
              : undefined,
          onPdf: () => window.open(`/api/angebote/${detail.id}/pdf`, '_blank'),
          onSend:
            statusEinfach !== 'angenommen' && statusEinfach !== 'abgelehnt'
              ? () => {
                  if (statusEinfach === 'entwurf') {
                    run(() => sendAngebotEinfach(detail.id), 'Angebot gesendet')
                  } else {
                    run(() => resendAngebotEinfach(detail.id), 'Angebot erneut gesendet')
                  }
                }
              : undefined,
          onDelete: !auftragId
            ? () => {
                startTransition(async () => {
                  const r = await deleteAngebot(detail.id)
                  if ('error' in r) {
                    toast.error(r.error)
                    return
                  }
                  toast.success('Angebot gelöscht')
                  if (detail.lead_id) router.push(`/anfragen/${detail.lead_id}`)
                  else router.push('/angebote')
                })
              }
            : undefined,
          deleteLabel: detail.angebotsnr ?? kundeNameAusAngebot(detail),
          extra,
        }
      )
    },
    [
      auftragId,
      detail,
      kannBearbeiten,
      kannVerlaengern,
      kundeEmail,
      mailCompose,
      openAcceptModal,
      openVerlaengernModal,
      openWizardBearbeiten,
      router,
      run,
      startTransition,
      statusEinfach,
    ]
  )

  const detailPrimaryBtnClass =
    'btn btn-primary btn-sm inline-flex flex-1 justify-center gap-1.5 sm:flex-none md:flex-none'

  const primaryAction = (() => {
    const hwRows = detail.angebot_handwerker ?? []
    if (statusEinfach === 'entwurf') {
      if (!darfAngebotAnKundeSenden(hwRows, detail.status)) {
        return (
          <Link
            href="#angebot-versand-handwerker"
            className={detailPrimaryBtnClass}
          >
            Handwerker einholen
            <Send className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </Link>
        )
      }
      return (
        <button
          type="button"
          className={detailPrimaryBtnClass}
          disabled={pending}
          onClick={() => run(() => sendAngebotEinfach(detail.id), 'Angebot gesendet')}
        >
          An Kunden senden
          <Send className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </button>
      )
    }
    if (statusEinfach === 'gesendet' || statusEinfach === 'abgelaufen') {
      return (
        <button
          type="button"
          className={detailPrimaryBtnClass}
          disabled={pending}
          onClick={openAcceptModal}
        >
          <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Angebot annehmen
        </button>
      )
    }
    if (statusEinfach === 'angenommen' && auftragId) {
      return (
        <Link href={`/auftraege/${auftragId}`} className={detailPrimaryBtnClass}>
          Zum Auftrag
          <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </Link>
      )
    }
    return null
  })()

  const nachfassText = (() => {
    if (statusEinfach === 'entwurf') return '— (noch nicht gesendet)'
    if (detail.nachgefasst_am) {
      return `Nachfass gesendet: ${formatDatumZeit(detail.nachgefasst_am)}`
    }
    const ref = erinnerungReferenzAm(detail)
    const geplant = erinnerungGeplantAm(ref)
    if (geplant) {
      return `Nachfass geplant: ${formatDatum(geplant.slice(0, 10))} (7 Tage nach Versand, falls keine Rückmeldung)`
    }
    return '—'
  })()

  const kundeCard = (
    <KundenStammdatenCard
      kunde={kunde}
      fallback={
        lead
          ? {
              plz: lead.plz,
              kontakt_name: lead.kontakt_name,
              kontakt_email: lead.kontakt_email,
              kontakt_telefon: lead.kontakt_telefon,
              funnel_daten: lead.funnel_daten,
            }
          : null
      }
      action={
        kunde ? (
          <button
            type="button"
            onClick={() => setStammdatenModalOpen(true)}
            className="btn btn-ghost btn-sm"
            aria-label="Stammdaten bearbeiten"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        ) : null
      }
    />
  )

  const formatEur = (n: number) =>
    n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

  const angebotsdatenCard = (
    <MockCard title="Angebotsdaten" icon="file-invoice">
      <div className="props">
        <MockProp label="Angebotsnr.">
          {detail.angebotsnr?.trim() || `AN-${detail.id.slice(0, 8).toUpperCase()}`}
        </MockProp>
        <MockProp label="Erstellt">{formatDatumZeit(detail.created_at)}</MockProp>
        <MockProp label="Gültig bis">
          <span className={gueltigBisClass(gueltigTone)}>
            {detail.gueltig_bis ? formatDatum(detail.gueltig_bis) : '—'}
          </span>
          {tageRest != null && tageRest >= 0 && tageRest < 14 ? (
            <span
              className={cn(
                'ml-2 inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium',
                gueltigTone === 'danger' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'
              )}
            >
              Läuft in {tageRest} Tag{tageRest === 1 ? '' : 'en'} ab
            </span>
          ) : null}
          {tageRest != null && tageRest < 0 ? (
            <span className="ml-2 inline-flex rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-800">
              Abgelaufen
            </span>
          ) : null}
        </MockProp>
        <MockProp label="Zahlung">{zahlungLabel}</MockProp>
        {detail.kunden_objekte ? (
          <MockProp label="Objekt (Ausführungsort)">
            {kundenObjektKurzlabel(detail.kunden_objekte)}
          </MockProp>
        ) : null}
        <MockProp label="Gesendet am">{gesendetAm ? formatDatumZeit(gesendetAm) : '—'}</MockProp>
        <MockProp label="An">{kunde?.email?.trim() || '—'}</MockProp>
        <MockProp label="Nachfass">{nachfassText}</MockProp>
        <MockProp label="Netto">
          <span className="tabular-nums">{formatEur(summen.netto)}</span>
        </MockProp>
        <MockProp label={`MwSt ${summen.mwstSatz}%`}>
          <span className="tabular-nums">{formatEur(summen.mwst)}</span>
        </MockProp>
        <MockProp label="Brutto">
          <span className="font-semibold tabular-nums text-bw-primary">{formatEur(summen.brutto)}</span>
        </MockProp>
        {detail.lead_id ? (
          <MockProp label="Zur Anfrage" link>
            <Link href={`/anfragen/${detail.lead_id}`}>Anfrage öffnen</Link>
          </MockProp>
        ) : null}
        {auftragId ? (
          <MockProp label="Zum Auftrag" link>
            <Link href={`/auftraege/${auftragId}`}>Auftrag öffnen</Link>
          </MockProp>
        ) : null}
      </div>
    </MockCard>
  )

  const positionenTab = (
    <PosBoard
      title="Leistungen"
      positionen={angebotPositionenToPosBoardLines(detail.positionen ?? [])}
    />
  )

  const detailsInhalt = (
    <div className="space-y-3">
      <MockProjektUebersichtCard
        projekt={
          detail.projektbeschreibung?.trim() ||
          detail.leistungsumfang?.trim() ||
          (typeof lead?.funnel_daten === 'object' &&
          lead.funnel_daten !== null &&
          'projekt' in lead.funnel_daten &&
          typeof (lead.funnel_daten as Record<string, unknown>).projekt === 'string'
            ? String((lead.funnel_daten as Record<string, unknown>).projekt)
            : kundeName)
        }
        region={lead?.plz ?? kunde?.plz}
        preisMin={lead?.preis_min}
        preisMax={lead?.preis_max}
        quelle={lead?.kanal}
      />
      {positionenTab}
    </div>
  )

  const stammdatenInhalt = (
    <div className="space-y-3">
      {kundeCard}
      {angebotsdatenCard}
      <AngebotVersandSection
        mode="kunde"
        detail={detail}
        bruttoMin={summenMail.bruttoMin}
        bruttoMax={summenMail.bruttoMax}
        positionen={detail.positionen ?? []}
        gueltigBis={gueltigBisYmd}
        kundeModalOpen={kundeVersandOpen}
        onKundeModalOpenChange={setKundeVersandOpen}
        onKundeSent={() => refresh()}
      />
      <AngebotVersandSection
        mode="handwerker"
        detail={detail}
        bruttoMin={summenMail.bruttoMin}
        bruttoMax={summenMail.bruttoMax}
        positionen={detail.positionen ?? []}
        gueltigBis={gueltigBisYmd}
        auftragId={auftragId}
      />
    </div>
  )

  const verlaufInhalt = (
    <LeadTimelineList
      events={timelineInitial}
      fallbackCreatedAt={detail.created_at}
      fallbackCreatedLabel={`Erstellt am ${formatDatumZeit(detail.created_at)}`}
    />
  )

  const dokumenteInhalt = <AngebotAnhaengeTab detail={detail} />

  const angebotDetailGroups = [
    {
      id: 'stammdaten',
      label: ENTITY_DETAIL_TAB_LABELS.stammdaten,
      icon: 'clipboard-list',
      render: () => stammdatenInhalt,
    },
    {
      id: 'details',
      label: ENTITY_DETAIL_TAB_LABELS.details,
      icon: 'list-numbers',
      count: positionenAnzeigeCount || undefined,
      render: () => detailsInhalt,
    },
    {
      id: 'verlauf',
      label: ENTITY_DETAIL_TAB_LABELS.verlauf,
      icon: 'history',
      count: timelineCount || undefined,
      render: () => <MockVerlaufCard>{verlaufInhalt}</MockVerlaufCard>,
    },
    {
      id: 'dokumente',
      label: ENTITY_DETAIL_TAB_LABELS.dokumente,
      icon: 'files',
      count: anhaengeCount || undefined,
      render: () => <MockDokumenteCard>{dokumenteInhalt}</MockDokumenteCard>,
    },
  ]

  return (
    <EntityDetailLayout
      resolvedVorgang={resolvedVorgang}
      phase="angebot"
      breadcrumbTitle={kundeName}
      head={{
        backHref,
        backLabel,
        title: kundeName,
        badges: <StatusBadge variant={angebotStatus.variant} label={angebotStatus.label} />,
        meta: headMeta,
        actions: (
          <div className="flex w-full flex-wrap items-center gap-2">
            {primaryAction}
            <MockEntityRowMenu items={detailHeadMenuItems} title="Angebot" />
          </div>
        ),
      }}
    >

      {statusEinfach === 'abgelehnt' ? (
        <p className="rounded-lg border border-bw-border px-3 py-2 text-sm text-bw-text-muted">
          Abgelehnt
          {detail.updated_at ? ` am ${formatDatum(detail.updated_at)}` : ''}
          {detail.ablehnung_grund ? ` — ${detail.ablehnung_grund}` : ''}
        </p>
      ) : null}

      <MockDetailShell defaultGroup="stammdaten" groups={angebotDetailGroups} />

      {wizardOpen && lead ? (
        <AngebotWizard
          key={wizardSessionKey}
          lead={lead}
          gewerke={gewerke}
          preislisten={wizardPreislisten}
          firm={wizardFirm}
          bootstrap={wizardBootstrap}
          onClose={closeWizard}
          onDone={() => {
            closeWizard()
            refresh()
          }}
        />
      ) : null}

      {detail.lead_id ? (
        <AngebotBearbeitenWahlModal
          open={bearbeitenWahlOpen}
          onClose={() => setBearbeitenWahlOpen(false)}
          angebotId={detail.id}
          leadId={detail.lead_id}
          onBearbeiten={openWizardMitBootstrap}
        />
      ) : null}

      <Modal open={verlaengernOpen} onClose={() => setVerlaengernOpen(false)} title="Gültigkeit verlängern">
        <div className="space-y-4">
          <p className="text-sm text-bw-text-muted">
            Wähle das neue Gültigkeitsdatum. In 7 Tagen erhält der Kunde automatisch eine Erinnerungs-Mail,
            dass das Angebot bis zu diesem Datum gültig ist.
          </p>
          <Input
            label="Gültig bis"
            type="date"
            min={addDaysYmd(heuteYmd(), 1)}
            value={verlaengernDatum}
            onChange={(e) => setVerlaengernDatum(e.target.value)}
            required
          />
          <div className="rounded-lg border border-bw-border bg-bw-hover/30 px-3 py-2 text-xs text-bw-text-muted">
            Erinnerung geplant:{' '}
            {formatDatum(addDaysYmd(heuteYmd(), 7))} · Auslauf: {formatDatum(verlaengernDatum)}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setVerlaengernOpen(false)}>
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={pending}
              onClick={() =>
                run(async () => {
                  const res = await extendAngebotGueltigkeit({
                    angebotId: detail.id,
                    gueltigBis: verlaengernDatum,
                  })
                  if (!res.ok) return res
                  setVerlaengernOpen(false)
                  return res
                }, 'Gültigkeit verlängert — Erinnerung in 7 Tagen geplant')
              }
            >
              Speichern
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={acceptOpen} onClose={() => setAcceptOpen(false)} title="Angebot annehmen" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-bw-text-muted">
            Angebot als angenommen markieren, Auftrag anlegen und optional die Auftragsbestätigung an den
            Kunden senden.
          </p>
          <Input
            label="Start-Datum"
            type="date"
            required
            value={aufStart}
            onChange={(e) => {
              const v = e.target.value
              setAufStart(v)
              setAufEnde(addDaysYmd(v, 14))
            }}
          />
          <Input
            label="Geschätztes End-Datum"
            type="date"
            value={aufEnde}
            onChange={(e) => setAufEnde(e.target.value)}
          />

          <div className="border-t border-bw-border pt-4">
            <p className="mb-3 text-sm font-semibold text-bw-text">Auftragsbestätigung an Kund:in</p>
            {!kunde?.email?.trim() ? (
              <p className="text-sm text-amber-700">Keine E-Mail-Adresse — Auftrag wird ohne Mail erstellt.</p>
            ) : (
              <>
                <Input
                  label="Betreff"
                  value={aufBetreff}
                  onChange={(e) => setAufBetreff(e.target.value)}
                  className="mb-3"
                />
                <EmailPillsField
                  label="An"
                  required
                  emails={aufTo}
                  onChange={setAufTo}
                  placeholder="kunde@beispiel.de"
                  hint="Empfänger wie im Angebotsversand — kann ergänzt oder reduziert werden."
                />
                <EmailPillsField
                  label="CC"
                  emails={aufCc}
                  onChange={setAufCc}
                  placeholder="weitere@beispiel.de"
                  hint={KUNDE_MAIL_BCC_HINT}
                />
                <p className="mb-1 mt-4 inline-flex items-center gap-1 text-xs font-medium text-bw-text-muted">
                  <Mail className="h-3.5 w-3.5" aria-hidden />
                  Vorschau
                </p>
                {aufPreviewLoading ? (
                  <p className="text-sm text-bw-text-muted">Vorschau wird geladen …</p>
                ) : (
                  <iframe
                    title="Auftragsbestätigung Vorschau"
                    sandbox="allow-same-origin"
                    className="h-[320px] w-full rounded-lg border border-bw-border bg-white"
                    srcDoc={aufPreviewHtml}
                  />
                )}
              </>
            )}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setAcceptOpen(false)}>
            Abbrechen
          </Button>
          <Button
            type="button"
            variant="secondary"
            loading={pending}
            onClick={() => {
              if (!aufStart.trim()) {
                toast.error('Bitte Start-Datum angeben.')
                return
              }
              startTransition(async () => {
                const res = await acceptAngebotAndCreateAuftrag(detail.id, {
                  start_datum: aufStart,
                  end_datum: aufEnde || null,
                  send_kunden_email: false,
                })
                if (!res.ok) {
                  toast.error(res.message)
                  return
                }
                setAcceptOpen(false)
                toast.success('Auftrag erstellt')
                router.push(`/auftraege/${res.auftragId}`)
                refresh()
              })
            }}
          >
            Nur Auftrag erstellen
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={pending}
            disabled={!kunde?.email?.trim() || !aufTo.length}
            onClick={() => {
              if (!aufStart.trim()) {
                toast.error('Bitte Start-Datum angeben.')
                return
              }
              if (!aufTo.length) {
                toast.error('Bitte mindestens einen Empfänger angeben.')
                return
              }
              startTransition(async () => {
                const res = await acceptAngebotAndCreateAuftrag(detail.id, {
                  start_datum: aufStart,
                  end_datum: aufEnde || null,
                  send_kunden_email: true,
                  betreff: aufBetreff.trim(),
                  to: aufTo,
                  cc: aufCc,
                })
                if (!res.ok) {
                  toast.error(res.message)
                  return
                }
                setAcceptOpen(false)
                toast.success('Auftrag erstellt — Bestätigung gesendet')
                router.push(`/auftraege/${res.auftragId}`)
                refresh()
              })
            }}
          >
            Erstellen & Bestätigung senden
          </Button>
        </div>
      </Modal>

      <Modal open={ablehnOpen} onClose={() => setAblehnOpen(false)} title="Angebot abgelehnt">
        <div className="space-y-3">
          <Select
            label="Grund"
            value={abGrund}
            onChange={(e) => setAbGrund(e.target.value)}
            options={KUNDE_ABLEHNUNG_GRUND_OPTIONS.map((v) => ({
              value: v,
              label: KUNDE_ABLEHNUNG_GRUND_LABELS[v],
            }))}
          />
          <Textarea
            label="Notiz (optional)"
            value={abNotiz}
            onChange={(e) => setAbNotiz(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAblehnOpen(false)}>
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={pending}
              onClick={() =>
                run(
                  () => markAngebotAbgelehntEinfach({ angebotId: detail.id, grund: abGrund, notiz: abNotiz }),
                  'Als abgelehnt markiert'
                )
              }
            >
              Speichern
            </Button>
          </div>
        </div>
      </Modal>

      {kunde ? (
        <KundeModal
          open={stammdatenModalOpen}
          onClose={() => setStammdatenModalOpen(false)}
          editKunde={kunde}
          leadFunnelDaten={lead?.funnel_daten}
          stayOnPage
          revalidateAnfrageId={lead?.id}
          onSaved={() => {
            toast.success('Stammdaten gespeichert')
            setStammdatenModalOpen(false)
            refresh()
          }}
        />
      ) : null}

      {mailCompose.modal}
    </EntityDetailLayout>
  )
}
