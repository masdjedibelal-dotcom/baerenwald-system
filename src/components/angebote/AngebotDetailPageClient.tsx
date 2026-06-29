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
import { ProjektKette } from '@/components/crm/ProjektKette'
import { ProjektUebersichtCard } from '@/components/crm/ProjektUebersichtCard'
import { DetailResponsiveTabs } from '@/components/layout/app'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { DetailTabBar } from '@/components/ui/detail-tab-bar'
import { DetailProp } from '@/components/ui/detail-prop'
import { NaechsteSchritteCard } from '@/components/crm/NaechsteSchritteCard'
import { Card } from '@/components/ui/Card'
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
import { ActionsMenu, type ActionsMenuItem } from '@/components/ui/actions-menu'
import { KommunikationCard } from '@/components/kommunikation/KommunikationCard'
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
import { AngebotOrgFreigabeBanner } from '@/components/angebote/AngebotOrgFreigabeBanner'
import { AngebotVersandSection } from '@/components/angebote/AngebotVersandSection'
import { AngebotVisualisierungenTab } from '@/components/angebote/AngebotVisualisierungenTab'
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
import { angebotWizardZahlungLabel, angebotDarfImWizardBearbeitetWerden, parseZahlungsbedingungenKey, type AngebotWizardBootstrap } from '@/lib/angebote/angebot-wizard-types'
import { AngebotPositionenV3Tab } from '@/components/angebote/positionen-v3/AngebotPositionenV3Tab'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { KundenStammdatenCard } from '@/components/kunden/KundenStammdatenCard'
import type { AngebotDetail, Gewerk, LeadDetail, LeadTimelineRow, Preisliste } from '@/lib/types'
import type { KiVisualisierung } from '@/lib/visualize/types'
import { cn, formatDatum, formatDatumZeit } from '@/lib/utils'
import {
  KUNDE_ABLEHNUNG_GRUND_LABELS,
  KUNDE_ABLEHNUNG_GRUND_OPTIONS,
} from '@/lib/angebote/ablehnung-labels'
import { buildAngebotNaechsteSchritte } from '@/lib/naechste-schritte'
import {
  darfAngebotAnKundeSenden,
  handwerkerSendenBlockierHinweis,
} from '@/lib/angebote/angebot-handwerker-flow'
import { summenAusPositionen } from '@/lib/angebot-positionen'
import { ACTIVITY_SECTIONS } from '@/lib/crm-labels'

type Tab = 'stammdaten' | 'leistung' | 'schritte' | 'positionen' | 'aktivitaet' | 'dokumente' | 'visualisierungen'

const DESKTOP_ANGEBOT_TABS: Tab[] = ['schritte', 'positionen', 'visualisierungen', 'aktivitaet', 'dokumente']
const MOBILE_ANGEBOT_TABS: Tab[] = ['stammdaten', 'leistung', 'schritte', 'visualisierungen', 'aktivitaet', 'dokumente']

export function AngebotDetailPageClient({
  detail,
  timeline: timelineInitial,
  auftragId,
  gewerke,
  wizardPreislisten,
  wizardFirm,
  lead,
  kiVisualisierungen = [],
  projektKontext,
}: {
  detail: AngebotDetail
  timeline: LeadTimelineRow[]
  auftragId: string | null
  gewerke: Gewerk[]
  wizardPreislisten: Preisliste[]
  wizardFirm: FirmenEinstellungen
  lead: LeadDetail | null
  kiVisualisierungen?: KiVisualisierung[]
  projektKontext?: import('@/lib/crm/projekt-kontext-types').ProjektKontext
}) {
  const router = useRouter()
  const { refresh, generation } = useCrmRefresh()
  const [pending, startTransition] = useTransition()
  const [tab, setTab] = useState<Tab>('schritte')
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

  const detailHeadMenuItems = useMemo((): ActionsMenuItem[] => {
    const items: ActionsMenuItem[] = []

    if (kannBearbeiten) {
      items.push({
        label: 'Bearbeiten',
        icon: <Pencil className="h-[15px] w-[15px]" aria-hidden />,
        onClick: openWizardBearbeiten,
      })
    }

    items.push({
      label: 'E-Mail schreiben',
      icon: <Mail className="h-[15px] w-[15px]" aria-hidden />,
      hint: kundeEmail ? undefined : 'E-Mail im Modal eintragen',
      onClick: () => mailCompose.openCompose(() => mailComposeContextFromAngebot(detail.id)),
    })

    const workflow: ActionsMenuItem[] = []
    if (kannVerlaengern) {
      workflow.push({
        label: 'Verlängern',
        icon: <CalendarClock className="h-[15px] w-[15px]" aria-hidden />,
        onClick: openVerlaengernModal,
      })
    }
    if (statusEinfach === 'gesendet' || statusEinfach === 'abgelaufen') {
      if (!detail.nachgefasst_am && statusEinfach === 'gesendet') {
        workflow.push({
          label: 'Nachfassen',
          icon: <Mail className="h-[15px] w-[15px]" aria-hidden />,
          hint: 'Erinnerungs-Mail an Kunden',
          onClick: () =>
            run(() => sendAngebotNachfassManuellAction(detail.id), 'Nachfass-Mail gesendet'),
        })
      }
      workflow.push({
        label: 'Erneut senden',
        icon: <Send className="h-[15px] w-[15px]" aria-hidden />,
        onClick: () => run(() => resendAngebotEinfach(detail.id), 'Angebot erneut gesendet'),
      })
      workflow.push({
        label: 'Abgelehnt',
        icon: <CircleX className="h-[15px] w-[15px]" aria-hidden />,
        onClick: () => setAblehnOpen(true),
      })
    }

    if (statusEinfach === 'entwurf' && !auftragId) {
      workflow.push({
        label: 'Angebot annehmen',
        icon: <Check className="h-[15px] w-[15px]" aria-hidden />,
        hint: 'Auch ohne vorherigen Versand',
        onClick: openAcceptModal,
      })
    }

    if (workflow.length > 0) {
      items.push('sep', ...workflow)
    }

    items.push('sep', {
      label: 'PDF herunterladen',
      icon: <Download className="h-[15px] w-[15px]" aria-hidden />,
      onClick: () => window.open(`/api/angebote/${detail.id}/pdf`, '_blank'),
    })

    if (!auftragId) {
      items.push('sep', {
        label: 'Löschen',
        icon: <Trash2 className="h-[15px] w-[15px]" aria-hidden />,
        danger: true,
        onClick: () => {
          if (!window.confirm('Angebot wirklich löschen?')) return
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
        },
      })
    }

    return items
  }, [
    kannBearbeiten,
    kundeEmail,
    detail.id,
    detail.lead_id,
    detail.nachgefasst_am,
    kannVerlaengern,
    statusEinfach,
    mailCompose,
    auftragId,
    router,
    openAcceptModal,
  ])

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

  const naechsteSchritte = useMemo(
    () =>
      buildAngebotNaechsteSchritte({
        status: statusEinfach,
        angebotId: detail.id,
        auftragId,
        nachgefasst: Boolean(detail.nachgefasst_am),
        onNachfassen:
          (statusEinfach === 'gesendet' || statusEinfach === 'abgelaufen') && !detail.nachgefasst_am
            ? () => run(() => sendAngebotNachfassManuellAction(detail.id), 'Nachfass-Mail gesendet')
            : undefined,
        onAuftragAnlegen:
          statusEinfach === 'gesendet' || statusEinfach === 'abgelaufen'
            ? () => {
                setAufBetreff('')
                setAufTo([])
                setAufCc([])
                setAufPreviewHtml('')
                setAcceptOpen(true)
              }
            : undefined,
      }),
    [
      statusEinfach,
      detail.id,
      detail.nachgefasst_am,
      auftragId,
    ]
  )

  const offeneSchritteCount = useMemo(
    () => naechsteSchritte.filter((s) => !s.done).length,
    [naechsteSchritte]
  )

  const desktopDetailTabs = useMemo(
    () => [
      {
        id: 'schritte',
        label: 'Nächste Schritte',
        icon: ListChecks,
        count: offeneSchritteCount || undefined,
      },
      {
        id: 'positionen',
        label: 'Positionen',
        icon: List,
        count: positionenAnzeigeCount || undefined,
      },
      {
        id: 'aktivitaet',
        label: ACTIVITY_SECTIONS.verlauf,
        icon: History,
        count: timelineCount || undefined,
      },
      {
        id: 'visualisierungen',
        label: 'Visualisierungen',
        icon: Sparkles,
        count: kiVisualisierungen.length || undefined,
      },
      {
        id: 'dokumente',
        label: ACTIVITY_SECTIONS.dokumente,
        icon: Paperclip,
        count: anhaengeCount || undefined,
      },
    ],
    [offeneSchritteCount, positionenAnzeigeCount, timelineCount, anhaengeCount, kiVisualisierungen.length]
  )

  const mobileDetailTabs = useMemo(
    () => [
      { id: 'stammdaten', label: 'Stammdaten', icon: LayoutGrid },
      {
        id: 'leistung',
        label: 'Leistungsübersicht',
        icon: List,
        count: positionenAnzeigeCount || undefined,
      },
      {
        id: 'schritte',
        label: 'Nächste Schritte',
        icon: ListChecks,
        count: offeneSchritteCount || undefined,
      },
      {
        id: 'aktivitaet',
        label: ACTIVITY_SECTIONS.verlauf,
        icon: History,
        count: timelineCount || undefined,
      },
      {
        id: 'visualisierungen',
        label: 'Visualisierungen',
        icon: Sparkles,
        count: kiVisualisierungen.length || undefined,
      },
      {
        id: 'dokumente',
        label: ACTIVITY_SECTIONS.dokumente,
        icon: Paperclip,
        count: anhaengeCount || undefined,
      },
    ],
    [offeneSchritteCount, positionenAnzeigeCount, timelineCount, anhaengeCount, kiVisualisierungen.length]
  )

  const formatEur = (n: number) =>
    n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

  const angebotsdatenCard = (
    <Card collapsible title="Angebotsdaten">
      <div className="props">
        <DetailProp label="Angebotsnr.">
          {detail.angebotsnr?.trim() || `AN-${detail.id.slice(0, 8).toUpperCase()}`}
        </DetailProp>
        <DetailProp label="Erstellt">{formatDatumZeit(detail.created_at)}</DetailProp>
        <DetailProp label="Gültig bis">
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
        </DetailProp>
        <DetailProp label="Zahlung">{zahlungLabel}</DetailProp>
        {detail.kunden_objekte ? (
          <DetailProp label="Objekt (Ausführungsort)">
            {kundenObjektKurzlabel(detail.kunden_objekte)}
          </DetailProp>
        ) : null}
        <DetailProp label="Gesendet am">{gesendetAm ? formatDatumZeit(gesendetAm) : '—'}</DetailProp>
        <DetailProp label="An">{kunde?.email?.trim() || '—'}</DetailProp>
        <DetailProp label="Nachfass">{nachfassText}</DetailProp>
        <DetailProp label="Netto">
          <span className="tabular-nums">{formatEur(summen.netto)}</span>
        </DetailProp>
        <DetailProp label={`MwSt ${summen.mwstSatz}%`}>
          <span className="tabular-nums">{formatEur(summen.mwst)}</span>
        </DetailProp>
        <DetailProp label="Brutto">
          <span className="font-semibold tabular-nums text-bw-primary">{formatEur(summen.brutto)}</span>
        </DetailProp>
        {detail.lead_id ? (
          <DetailProp label="Zur Anfrage">
            <Link href={`/anfragen/${detail.lead_id}`} className="text-bw-link hover:underline">
              Anfrage öffnen
            </Link>
          </DetailProp>
        ) : null}
        {auftragId ? (
          <DetailProp label="Zum Auftrag">
            <Link href={`/auftraege/${auftragId}`} className="text-bw-link hover:underline">
              Auftrag öffnen
            </Link>
          </DetailProp>
        ) : null}
      </div>
    </Card>
  )

  const positionenTab = (
    <AngebotPositionenV3Tab
      angebotId={detail.id}
      positionen={detail.positionen ?? []}
      gewerke={gewerke}
      editable={positionenBearbeitbar}
      onChanged={() => refresh()}
    />
  )

  const stammdatenInhalt = (
    <div className="space-y-3">
      {kundeCard}
      {angebotsdatenCard}
      <KommunikationCard
        filter={{
          angebotId: detail.id,
          leadId: detail.lead_id ?? undefined,
          kundeId: detail.kunde_id ?? undefined,
        }}
        reloadKey={mailCompose.reloadKey + generation}
        toolbar={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={() => mailCompose.openCompose(() => mailComposeContextFromAngebot(detail.id))}
            >
              <Mail className="h-3.5 w-3.5" aria-hidden />
              E-Mail schreiben
            </Button>
            {statusEinfach === 'entwurf' || detail.status === 'handwerker_akzeptiert' ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="gap-1.5"
                onClick={openAngebotVersandModal}
              >
                <Send className="h-3.5 w-3.5" aria-hidden />
                Angebot versenden
              </Button>
            ) : null}
          </div>
        }
      />
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

  const fixedOverview = (
    <div className="space-y-3">
      {auftragId ? (
        <div className="rounded-lg border border-bw-primary/25 bg-bw-primary/5 px-3 py-2.5 text-sm">
          <p className="font-medium text-bw-text">Verkauf abgeschlossen</p>
          <p className="mt-0.5 text-bw-text-muted">
            Dieses Angebot wurde angenommen. Weiter im{' '}
            <Link href={`/auftraege/${auftragId}`} className="font-medium text-bw-link hover:underline">
              Auftrag
            </Link>
            {projektKontext?.rechnungen?.length
              ? ` (${projektKontext.rechnungen.length} Rechnung${projektKontext.rechnungen.length === 1 ? '' : 'en'})`
              : ''}
            .
          </p>
        </div>
      ) : statusEinfach === 'angenommen' ? (
        <div className="rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2.5 text-sm">
          <p className="font-medium text-bw-text">Angenommen — Auftrag fehlt noch</p>
          <p className="mt-0.5 text-bw-text-muted">
            Legen Sie den Auftrag an, um mit der Ausführung und Abrechnung zu starten.
          </p>
        </div>
      ) : null}
      {projektKontext ? <ProjektUebersichtCard kontext={projektKontext} /> : null}
      <AngebotOrgFreigabeBanner
        orgFreigabeStatus={orgFreigabeStatus}
        orgFreigabeLog={lead?.org_freigabe_log}
      />
      {stammdatenInhalt}
    </div>
  )

  const schritteInhalt = <NaechsteSchritteCard steps={naechsteSchritte} />

  const aktivitaetInhalt = (
    <LeadTimelineList
      events={timelineInitial}
      fallbackCreatedAt={detail.created_at}
      fallbackCreatedLabel={`Erstellt am ${formatDatumZeit(detail.created_at)}`}
    />
  )

  const dokumenteInhalt = <AngebotAnhaengeTab detail={detail} />
  const visualisierungenInhalt = (
    <AngebotVisualisierungenTab angebotId={detail.id} sessions={kiVisualisierungen} />
  )

  const desktopTabContent =
    tab === 'schritte' ? (
      schritteInhalt
    ) : tab === 'positionen' ? (
      positionenTab
    ) : tab === 'visualisierungen' ? (
      visualisierungenInhalt
    ) : tab === 'aktivitaet' ? (
      aktivitaetInhalt
    ) : tab === 'dokumente' ? (
      dokumenteInhalt
    ) : null

  const mobileTabContent =
    tab === 'stammdaten' ? (
      stammdatenInhalt
    ) : tab === 'leistung' ? (
      positionenTab
    ) : tab === 'schritte' ? (
      schritteInhalt
    ) : tab === 'visualisierungen' ? (
      visualisierungenInhalt
    ) : tab === 'aktivitaet' ? (
      aktivitaetInhalt
    ) : tab === 'dokumente' ? (
      dokumenteInhalt
    ) : null

  return (
    <div className="space-y-4 pb-6">
      <DetailHead
        backHref="/angebote"
        backLabel="Zurück zu Angebote"
        title={kundeName}
        badges={
          <StatusBadge variant={angebotStatus.variant} label={angebotStatus.label} />
        }
        meta={headMeta}
        actions={
          <div className="flex w-full flex-wrap items-center gap-2">
            {primaryAction}
            <ActionsMenu
              trigger={
                <button
                  type="button"
                  className="btn btn-secondary btn-sm inline-flex shrink-0 gap-1.5 px-2.5 max-md:btn-ghost max-md:px-2"
                  aria-label="Weitere Aktionen"
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden />
                  <span className="sr-only sm:not-sr-only">Mehr</span>
                </button>
              }
              items={detailHeadMenuItems}
              sheetTitle="Angebot"
            />
          </div>
        }
      />

      {projektKontext ? <ProjektKette kontext={projektKontext} /> : null}

      {statusEinfach === 'abgelehnt' ? (
        <p className="rounded-lg border border-bw-border px-3 py-2 text-sm text-bw-text-muted">
          Abgelehnt
          {detail.updated_at ? ` am ${formatDatum(detail.updated_at)}` : ''}
          {detail.ablehnung_grund ? ` — ${detail.ablehnung_grund}` : ''}
        </p>
      ) : null}

      <DetailResponsiveTabs
        tab={tab}
        onTabChange={setTab}
        desktopOverview={fixedOverview}
        desktopTabs={
          <DetailTabBar tabs={desktopDetailTabs} value={tab} onChange={(id) => setTab(id as Tab)} />
        }
        mobileTabs={
          <DetailTabBar tabs={mobileDetailTabs} value={tab} onChange={(id) => setTab(id as Tab)} />
        }
        desktopTabContent={desktopTabContent}
        mobileTabContent={mobileTabContent}
        mobileDefaultTab="stammdaten"
        desktopDefaultTab="schritte"
        mobileTabIds={MOBILE_ANGEBOT_TABS}
        desktopTabIds={DESKTOP_ANGEBOT_TABS}
      />

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
    </div>
  )
}
