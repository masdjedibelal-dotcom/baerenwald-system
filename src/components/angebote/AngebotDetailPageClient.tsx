'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { MockIcon, mockMenuIcon } from '@/components/mock-ui/MockIcon'
import { DetailHead } from '@/components/layout/DetailHead'
import { ProjektKette } from '@/components/crm/ProjektKette'
import { DetailShell, type DetailShellGroup } from '@/components/mock-ui/DetailShell'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { DetailProp } from '@/components/ui/detail-prop'
import { NaechsteSchritteCard } from '@/components/crm/NaechsteSchritteCard'
import { Card } from '@/components/ui/Card'
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
  leistungAnzeige,
  resolveStatusEinfach,
} from '@/lib/angebot-einfach'
import { angebotStatusDisplay } from '@/lib/status/status-display'
import { angebotWizardZahlungLabel, angebotDarfImWizardBearbeitetWerden, parseZahlungsbedingungenKey, type AngebotWizardBootstrap } from '@/lib/angebote/angebot-wizard-types'
import { AngebotPositionenV3Tab } from '@/components/angebote/positionen-v3/AngebotPositionenV3Tab'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { KundenStammdatenCard } from '@/components/kunden/KundenStammdatenCard'
import type { AngebotDetail, Gewerk, LeadDetail, LeadTimelineRow, Preisliste } from '@/lib/types'
import type { KiVisualisierung } from '@/lib/visualize/types'
import { cn, formatAnfragePreisAnzeige, formatDatum, formatDatumZeit, KANAL_LABELS, SITUATION_LABELS } from '@/lib/utils'
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

type AngebotDetailTab =
  | 'stammdaten'
  | 'details'
  | 'verlauf'
  | 'dokumente'
  | 'visualisierungen'
  | 'notizen'

const ANGEBOT_DETAIL_TAB_IDS = new Set<AngebotDetailTab>([
  'stammdaten',
  'details',
  'verlauf',
  'dokumente',
  'visualisierungen',
  'notizen',
])

/** Query-/Deep-Link-Aliase auf stabile interne IDs. */
function resolveAngebotDetailTabFromQuery(raw: string | null): AngebotDetailTab | null {
  const tab = (raw ?? '').trim().toLowerCase()
  if (!tab) return null
  if (tab === 'schritte' || tab === 'naechste-schritte' || tab === 'naechste_schritte') {
    return 'stammdaten'
  }
  if (tab === 'positionen' || tab === 'leistung') return 'details'
  if (tab === 'aktivitaet') return 'verlauf'
  if (tab === 'kommunikation') return 'notizen'
  if (ANGEBOT_DETAIL_TAB_IDS.has(tab as AngebotDetailTab)) return tab as AngebotDetailTab
  return null
}

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
  const searchParams = useSearchParams()
  const { refresh, generation } = useCrmRefresh()
  const [pending, startTransition] = useTransition()
  const [mainTab, setMainTab] = useState<AngebotDetailTab>('stammdaten')
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

  useEffect(() => {
    const tab = resolveAngebotDetailTabFromQuery(searchParams.get('tab'))
    if (tab) setMainTab(tab)
  }, [searchParams])

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
  const projektTitel = useMemo(() => {
    const leistung = leistungAnzeige(detail)
    if (leistung && leistung !== '—') return leistung
    const sit = lead?.situation?.trim()
    if (sit) return SITUATION_LABELS[sit] ?? sit
    return detail.angebotsnr?.trim() || `AN-${detail.id.slice(0, 8).toUpperCase()}`
  }, [detail, lead?.situation])
  const headMeta = (
    <span className="text-sm text-bw-text-muted">
      {[
        projektTitel,
        betragLabel || null,
        detail.gueltig_bis ? `gültig bis ${formatDatum(detail.gueltig_bis)}` : null,
      ]
        .filter(Boolean)
        .join(' · ')}
    </span>
  )

  function openVerlaengernModal() {
    const raw = detail.gueltig_bis?.slice(0, 10)
    setVerlaengernDatum(raw && raw > heuteYmd() ? raw : addDaysYmd(heuteYmd(), 30))
    setVerlaengernOpen(true)
  }

  const mailCompose = useKundenMailCompose({ onSent: () => refresh() })
  const kundeEmail = kunde?.email?.trim() ?? ''
  const kundeTelefon =
    kunde?.telefon?.trim() || lead?.kontakt_telefon?.trim() || ''

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

  const kannAnnehmen =
    ((statusEinfach === 'gesendet' || statusEinfach === 'abgelaufen') && !auftragId) ||
    (statusEinfach === 'entwurf' && !auftragId)

  const kannVersenden =
    statusEinfach === 'entwurf' || detail.status === 'handwerker_akzeptiert'
  const kannErneutSenden = statusEinfach === 'gesendet' || statusEinfach === 'abgelaufen'

  const detailHeadMenuItems = useMemo((): ActionsMenuItem[] => {
    const items: ActionsMenuItem[] = []

    if (kannBearbeiten) {
      items.push({
        label: 'Bearbeiten',
        icon: mockMenuIcon('pencil'),
        onClick: openWizardBearbeiten,
      })
      items.push('sep')
    }

    if (kannAnnehmen) {
      items.push({
        label: 'Angebot annehmen',
        icon: mockMenuIcon('check'),
        hint: statusEinfach === 'entwurf' ? 'Auch ohne vorherigen Versand' : undefined,
        onClick: openAcceptModal,
      })
    }

    items.push({
      label: 'PDF herunterladen',
      icon: mockMenuIcon('download'),
      onClick: () => window.open(`/api/angebote/${detail.id}/pdf`, '_blank'),
    })

    if (kannVersenden) {
      items.push({
        label: 'Versenden',
        icon: mockMenuIcon('send'),
        onClick: openAngebotVersandModal,
      })
    } else if (kannErneutSenden) {
      items.push({
        label: 'Erneut senden',
        icon: mockMenuIcon('send'),
        onClick: () => run(() => resendAngebotEinfach(detail.id), 'Angebot erneut gesendet'),
      })
    }

    if (kannVerlaengern) {
      items.push({
        label: 'Verlängern',
        icon: mockMenuIcon('calendar-event'),
        onClick: openVerlaengernModal,
      })
    }
    if (statusEinfach === 'gesendet' && !detail.nachgefasst_am) {
      items.push({
        label: 'Nachfassen',
        icon: mockMenuIcon('mail-forward'),
        hint: 'Erinnerungs-Mail an Kunden',
        onClick: () =>
          run(() => sendAngebotNachfassManuellAction(detail.id), 'Nachfass-Mail gesendet'),
      })
    }
    if (statusEinfach === 'gesendet' || statusEinfach === 'abgelaufen') {
      items.push({
        label: 'Abgelehnt',
        icon: mockMenuIcon('circle-x'),
        onClick: () => setAblehnOpen(true),
      })
    }

    items.push('sep')
    items.push({
      label: 'Mail schreiben',
      icon: mockMenuIcon('mail'),
      hint: kundeEmail ? undefined : 'E-Mail im Modal eintragen',
      onClick: () => mailCompose.openCompose(() => mailComposeContextFromAngebot(detail.id)),
    })

    if (kundeTelefon) {
      items.push({
        label: 'Anrufen',
        icon: mockMenuIcon('phone'),
        onClick: () => {
          window.location.href = `tel:${kundeTelefon.replace(/\s/g, '')}`
        },
      })
    }

    if (!auftragId) {
      items.push('sep', {
        label: 'Löschen',
        icon: mockMenuIcon('trash'),
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
    kannAnnehmen,
    kannVersenden,
    kannErneutSenden,
    kundeEmail,
    kundeTelefon,
    detail.id,
    detail.lead_id,
    detail.nachgefasst_am,
    detail.status,
    kannVerlaengern,
    statusEinfach,
    mailCompose,
    auftragId,
    router,
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
            <MockIcon n="send" size={14} />
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
          <MockIcon n="send" size={14} />
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
          <MockIcon n="check" size={14} />
          Angebot annehmen
        </button>
      )
    }
    if (statusEinfach === 'angenommen' && auftragId) {
      return (
        <Link href={`/auftraege/${auftragId}`} className={detailPrimaryBtnClass}>
          Zum Auftrag
          <MockIcon n="external-link" size={14} />
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
      collapsible={false}
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
            <MockIcon n="pencil" size={15} />
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

  const formatEur = (n: number) =>
    n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

  const regionAnzeige = useMemo(() => {
    const plz = lead?.plz?.trim() || kunde?.plz?.trim() || ''
    const ort = kunde?.ort?.trim() || ''
    return [plz, ort].filter(Boolean).join(' ')
  }, [lead?.plz, kunde?.plz, kunde?.ort])

  const preisrahmenAnzeige = useMemo(() => {
    if (!lead) return null
    const raw = formatAnfragePreisAnzeige(
      lead.kanal,
      lead.budget_ca,
      lead.preis_min,
      lead.preis_max,
      lead.funnel_daten
    )
    return raw !== '—' ? raw : null
  }, [lead])

  const beschreibungAnzeige =
    lead?.notizen?.trim() ||
    lead?.kontakt_nachricht?.trim() ||
    detail.projektbeschreibung?.trim() ||
    ''

  const angebotNrLabel =
    detail.angebotsnr?.trim() || `AN-${detail.id.slice(0, 8).toUpperCase()}`

  const projektUebersichtCard = (
    <Card title="Projekt-Übersicht" collapsible={false}>
      <div className="props">
        <DetailProp label="Projekt">{projektTitel}</DetailProp>
        {beschreibungAnzeige ? (
          <DetailProp label="Beschreibung">{beschreibungAnzeige}</DetailProp>
        ) : null}
        {regionAnzeige ? <DetailProp label="Region">{regionAnzeige}</DetailProp> : null}
        {preisrahmenAnzeige ? (
          <DetailProp label="Preisrahmen">{preisrahmenAnzeige}</DetailProp>
        ) : null}
        {lead ? (
          <DetailProp label="Quelle">{KANAL_LABELS[lead.kanal] ?? lead.kanal}</DetailProp>
        ) : null}
        <DetailProp label="Angebot">{angebotNrLabel}</DetailProp>
        <DetailProp label="Gesamt">
          <span className="font-semibold tabular-nums text-bw-primary">
            {betragLabel || '—'}
          </span>
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
        <DetailProp label="Netto">
          <span className="tabular-nums">{formatEur(summen.netto)}</span>
        </DetailProp>
        <DetailProp label={`MwSt ${summen.mwstSatz}%`}>
          <span className="tabular-nums">{formatEur(summen.mwst)}</span>
        </DetailProp>
        <DetailProp label="Brutto">
          <span className="font-semibold tabular-nums text-bw-primary">{formatEur(summen.brutto)}</span>
        </DetailProp>
        {detail.kunden_objekte ? (
          <DetailProp label="Objekt (Ausführungsort)">
            {kundenObjektKurzlabel(detail.kunden_objekte)}
          </DetailProp>
        ) : null}
        <DetailProp label="Gesendet am">{gesendetAm ? formatDatumZeit(gesendetAm) : '—'}</DetailProp>
        <DetailProp label="An">{kunde?.email?.trim() || '—'}</DetailProp>
        <DetailProp label="Nachfass">{nachfassText}</DetailProp>
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

  const verkaufBanner = auftragId ? (
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
  ) : null

  const stammdatenInhalt = (
    <>
      {verkaufBanner}
      <AngebotOrgFreigabeBanner
        orgFreigabeStatus={orgFreigabeStatus}
        orgFreigabeLog={lead?.org_freigabe_log}
      />
      {kundeCard}
      <NaechsteSchritteCard steps={naechsteSchritte} />
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
    </>
  )

  const detailsInhalt = (
    <>
      {projektUebersichtCard}
      {positionenTab}
    </>
  )

  const verlaufInhalt = (
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

  const notizenInhalt = (
    <KommunikationCard
      filter={{
        angebotId: detail.id,
        leadId: detail.lead_id ?? undefined,
        kundeId: detail.kunde_id ?? undefined,
      }}
      reloadKey={mailCompose.reloadKey + generation}
      toolbar={
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-1.5"
          onClick={() => mailCompose.openCompose(() => mailComposeContextFromAngebot(detail.id))}
        >
          <MockIcon n="mail" size={15} />
          E-Mail schreiben
        </Button>
      }
    />
  )

  const detailShellGroups: DetailShellGroup[] = [
    {
      id: 'stammdaten',
      label: 'Stammdaten',
      icon: 'clipboard-list',
      render: () => stammdatenInhalt,
    },
    {
      id: 'details',
      label: 'Details',
      icon: 'list-numbers',
      count: positionenAnzeigeCount || undefined,
      render: () => detailsInhalt,
    },
    {
      id: 'verlauf',
      label: ACTIVITY_SECTIONS.verlauf,
      icon: 'history',
      count: timelineCount || undefined,
      render: () => verlaufInhalt,
    },
    {
      id: 'dokumente',
      label: ACTIVITY_SECTIONS.dokumente,
      icon: 'files',
      count: anhaengeCount || undefined,
      render: () => dokumenteInhalt,
    },
    {
      id: 'visualisierungen',
      label: 'Visualisierungen',
      icon: 'photo',
      count: kiVisualisierungen.length || undefined,
      render: () => visualisierungenInhalt,
    },
    {
      id: 'notizen',
      label: ACTIVITY_SECTIONS.notizen,
      icon: 'messages',
      render: () => notizenInhalt,
    },
  ]

  return (
    <div className="space-y-4 pb-0">
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
                  title="Aktionen"
                >
                  <MockIcon n="dots" size={18} />
                  <span className="sr-only">Mehr</span>
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

      <DetailShell
        groups={detailShellGroups}
        value={mainTab}
        onChange={(id) => setMainTab(id as AngebotDetailTab)}
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
                  <MockIcon n="mail" size={14} />
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
