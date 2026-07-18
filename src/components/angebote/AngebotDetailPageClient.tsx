'use client'

import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { variantToMockBadgeKind } from '@/lib/status/mock-badge-kind'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { MockIcon, mockMenuIcon } from '@/components/mock-ui/MockIcon'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockVerlaufCard } from '@/components/mock-ui/MockDetailCards'
import { EntityDetailLayout } from '@/components/layout/EntityDetailLayout'
import { DetailShell, type DetailShellGroup } from '@/components/mock-ui/DetailShell'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { istGewerkBeschreibungPosition } from '@/lib/dokument-zeilen'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { EmailPillsField } from '@/components/ui/EmailPillsField'
import { AnfrageNotizenTab } from '@/components/anfragen/AnfrageNotizenTab'
import { Timeline } from '@/components/ui/timeline'
import { ActionsMenu } from '@/components/ui/actions-menu'
import { ergaenzeTimelineMitProjektKontext } from '@/lib/crm/build-projekt-timeline'
import { sortTimelineByCreatedAtAsc } from '@/lib/timeline-sort'
import { buildEntityMenu, entityMenuToActionItems } from '@/lib/entity-menu'
import { runDuplicateAngebot } from '@/lib/list-actions'
import { useKundenMailCompose } from '@/components/kommunikation/useKundenMailCompose'
import { mailComposeContextFromAngebot } from '@/app/(dashboard)/kommunikation/actions'
import { toast } from '@/components/ui/app-toast'
import {
  acceptAngebotAndCreateAuftrag,
  resendAngebotEinfach,
  sendAngebotEinfach,
} from '@/app/(dashboard)/angebote/angebot-flow-actions'
import { loadAngebotWizardBootstrap } from '@/app/(dashboard)/angebote/wizard-actions'
import { AngebotBearbeitenWahlModal } from '@/components/angebote/AngebotBearbeitenWahlModal'
import { previewAuftragsbestaetigungMail, deleteAngebot } from '@/app/(dashboard)/angebote/actions'
import { openMieterStatusPreview, openPortalAsKunde } from '@/app/(dashboard)/impersonation/actions'
import { useIsCrmAdmin } from '@/hooks/useIsCrmAdmin'
import { KUNDE_MAIL_BCC_HINT } from '@/lib/mail-constants'
import { AngebotAnhaengeTab, anzahlAngebotAnhaenge } from '@/components/angebote/AngebotAnhaengeTab'
import { AngebotStammdatenCard } from '@/components/angebote/AngebotStammdatenCard'
import { AngebotDetailsTab } from '@/components/angebote/AngebotDetailsTab'
import { resolveCumulativeDetailTabAlias } from '@/lib/entity-detail/cumulative-detail-tabs'
import { AngebotVersandSection } from '@/components/angebote/AngebotVersandSection'
import { AngebotHandwerkerPartnerSection } from '@/components/angebote/AngebotHandwerkerPartnerSection'
import { AngebotWizard } from '@/components/angebote/AngebotWizard'
import { KundenportalLinkVersendenModal } from '@/components/crm/KundenportalLinkVersendenModal'
import {
  addDaysYmd,
  heuteYmd,
  kundeNameAusAngebot,
  resolveStatusEinfach,
} from '@/lib/angebot-einfach'
import { angebotTitelOderSituationBereich } from '@/lib/vorgang/vorgang-anzeige-titel'
import { angebotStatusDisplay } from '@/lib/status/status-display'
import { angebotDarfImWizardBearbeitetWerden, type AngebotWizardBootstrap } from '@/lib/angebote/angebot-wizard-types'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type {
  AngebotDetail,
  Gewerk,
  Handwerker,
  LeadDetail,
  LeadDokumentRow,
  LeadNotizRow,
  LeadTimelineRow,
  Preisliste,
} from '@/lib/types'
import { formatDatum, formatTimelineStamp } from '@/lib/utils'
import {
  darfAngebotAnKundeSenden,
  hatAngebotHandwerker,
  handwerkerAnfrageErledigt,
  handwerkerSendenBlockierHinweis,
} from '@/lib/angebote/angebot-handwerker-flow'
import { summenAusPositionen } from '@/lib/angebot-positionen'
import { ACTIVITY_SECTIONS } from '@/lib/crm-labels'

type AngebotDetailTab =
  | 'stammdaten'
  | 'details'
  | 'verlauf'
  | 'dokumente'
  | 'notizen'

const ANGEBOT_DETAIL_TAB_IDS = new Set<AngebotDetailTab>([
  'stammdaten',
  'details',
  'verlauf',
  'dokumente',
  'notizen',
])

/** Query-/Deep-Link-Aliase auf stabile interne IDs. */
function resolveAngebotDetailTabFromQuery(raw: string | null): AngebotDetailTab | null {
  const tab = (raw ?? '').trim().toLowerCase()
  if (!tab) return null
  if (tab === 'schritte' || tab === 'naechste-schritte' || tab === 'naechste_schritte') {
    return 'stammdaten'
  }
  if (
    tab === 'positionen' ||
    tab === 'leistung' ||
    tab === 'angebot-details' ||
    tab === 'anfrage' ||
    tab === 'anfrage-details'
  ) {
    return 'details'
  }
  if (tab === 'aktivitaet') return 'verlauf'
  if (tab === 'kommunikation') return 'notizen'
  const cumulative = resolveCumulativeDetailTabAlias(tab)
  if (cumulative === 'anfrage-details' || cumulative === 'angebot-details') return 'details'
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
  wizardHandwerker = [],
  lead,
  kiVisualisierungen: _kiVisualisierungen = [],
  projektKontext,
}: {
  detail: AngebotDetail
  timeline: LeadTimelineRow[]
  auftragId: string | null
  gewerke: Gewerk[]
  wizardPreislisten: Preisliste[]
  wizardFirm: FirmenEinstellungen
  wizardHandwerker?: Handwerker[]
  lead: LeadDetail | null
  kiVisualisierungen?: import('@/lib/visualize/types').KiVisualisierung[]
  projektKontext?: import('@/lib/crm/projekt-kontext-types').ProjektKontext
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refresh } = useCrmRefresh()
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
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardBootstrap, setWizardBootstrap] = useState<AngebotWizardBootstrap | null>(null)
  const [wizardSessionKey, setWizardSessionKey] = useState(0)
  const [bearbeitenWahlOpen, setBearbeitenWahlOpen] = useState(false)
  const [kundeVersandOpen, setKundeVersandOpen] = useState(false)
  const [impersonating, setImpersonating] = useState(false)
  const [portalLinkModalOpen, setPortalLinkModalOpen] = useState(false)
  const isCrmAdmin = useIsCrmAdmin()

  useEffect(() => {
    const raw = searchParams.get('tab')
    if ((raw ?? '').trim().toLowerCase() === 'visualisierungen') {
      router.push(`/angebote/${detail.id}/visualisierung`)
      return
    }
    const tab = resolveAngebotDetailTabFromQuery(raw)
    if (tab) setMainTab(tab)
  }, [searchParams, detail.id, router])

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : ''
    if (hash !== 'angebot-versand-handwerker' && hash !== 'handwerker-partner') return
    const t = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)
    return () => window.clearTimeout(t)
  }, [detail.id, detail.angebot_handwerker])

  const orgFreigabeStatus = lead?.org_freigabe_status ?? null

  const statusEinfach = resolveStatusEinfach(detail)
  const angebotStatus = useMemo(() => angebotStatusDisplay(detail), [detail])

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
  const summenMail = useMemo(
    () => summenAusPositionen(detail.positionen ?? [], 19),
    [detail.positionen]
  )
  const gueltigBisYmd = detail.gueltig_bis?.slice(0, 10) ?? addDaysYmd(heuteYmd(), 30)
  const kannAngebotVersenden =
    (statusEinfach === 'entwurf' || detail.status === 'handwerker_akzeptiert') &&
    darfAngebotAnKundeSenden(detail.angebot_handwerker ?? [], detail.status) &&
    Boolean(kunde?.email?.trim())

  const timelineSorted = useMemo(
    () => sortTimelineByCreatedAtAsc(timelineInitial ?? []),
    [timelineInitial]
  )

  const notizenRows = useMemo(() => {
    const raw = lead?.lead_notizen
    if (!Array.isArray(raw)) return [] as LeadNotizRow[]
    return [...raw].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [lead?.lead_notizen])

  const dokumenteRows = useMemo(() => {
    const raw = lead?.lead_dokumente
    if (!Array.isArray(raw)) return [] as LeadDokumentRow[]
    return [...raw].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [lead?.lead_dokumente])

  const timelineItems = useMemo(() => {
    type Row = {
      id: string
      text: string
      time: string
      state: 'done' | 'open' | 'active'
      ts: number
    }

    const fromEvents: Row[] = timelineSorted.map((ev) => ({
      id: ev.id,
      text: ev.beschreibung ? `${ev.titel} — ${ev.beschreibung}` : ev.titel,
      time: formatTimelineStamp(ev.created_at),
      state: 'done' as const,
      ts: new Date(ev.created_at).getTime(),
    }))

    let basis: Row[] = fromEvents
    if (basis.length === 0 && detail.created_at) {
      basis = [
        {
          id: 'angebot-erstellt',
          text: `Angebot erstellt${detail.angebotsnr?.trim() ? ` — ${detail.angebotsnr.trim()}` : ''}`,
          time: formatTimelineStamp(detail.created_at),
          state: 'done',
          ts: new Date(detail.created_at).getTime(),
        },
      ]
    }

    let merged: Row[] = basis
    if (projektKontext) {
      const enriched = ergaenzeTimelineMitProjektKontext(
        basis.map((b) => ({
          id: b.id,
          ts: b.ts,
          text: b.text,
          time: b.time,
          state: b.state === 'active' ? 'active' : 'done',
        })),
        projektKontext
      )
      merged = enriched.map((item) => ({
        id: item.id,
        text: item.text,
        time: item.time,
        state: item.state,
        ts: item.ts,
      }))
    }

    const openSteps: Row[] = []
    if (!auftragId && statusEinfach !== 'angenommen') {
      if (statusEinfach === 'entwurf') {
        openSteps.push({
          id: 'open-versand',
          text: 'Angebot an Kunden senden',
          time: 'offen',
          state: 'open',
          ts: Number.MAX_SAFE_INTEGER - 1,
        })
      }
      openSteps.push({
        id: 'open-auftrag',
        text: 'Auftragsbestätigung',
        time: 'offen',
        state: 'open',
        ts: Number.MAX_SAFE_INTEGER,
      })
    }

    return [...merged, ...openSteps].map(({ ts: _ts, ...rest }) => rest)
  }, [
    timelineSorted,
    projektKontext,
    detail.created_at,
    detail.angebotsnr,
    auftragId,
    statusEinfach,
  ])

  const anhaengeCount = useMemo(() => {
    const hasLead = Boolean(detail.lead_id ?? lead?.id)
    return anzahlAngebotAnhaenge(detail, dokumenteRows, {
      includeFotos: !hasLead,
    })
  }, [detail, dokumenteRows, lead?.id])

  const projektTitel = useMemo(
    () =>
      angebotTitelOderSituationBereich({
        angebot: detail,
        situation: lead?.situation,
        bereiche: lead?.bereiche ?? detail.leads?.bereiche,
        fallback: detail.angebotsnr?.trim() || `AN-${detail.id.slice(0, 8).toUpperCase()}`,
      }),
    [detail, lead?.situation, lead?.bereiche]
  )
  const headMeta = kundeName

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

  function openHandwerkerAnfragen() {
    const rows = detail.angebot_handwerker ?? []
    if (!hatAngebotHandwerker(rows)) {
      if (kannBearbeiten && detail.lead_id && lead) {
        toast.info('Bitte zuerst Handwerker im Angebots-Wizard zuweisen.')
        openWizardBearbeiten()
        return
      }
      toast.error('Keine Handwerker zugewiesen — Angebot im Wizard bearbeiten.')
      return
    }
    const el =
      document.getElementById('angebot-versand-handwerker') ??
      document.getElementById('handwerker-partner')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

  const kannVersenden =
    statusEinfach === 'entwurf' || detail.status === 'handwerker_akzeptiert'
  const kannErneutSenden = statusEinfach === 'gesendet' || statusEinfach === 'abgelaufen'

  const detailHeadMenuItems = useMemo(() => {
    const erledigt =
      statusEinfach === 'angenommen' ||
      statusEinfach === 'abgelehnt' ||
      Boolean(auftragId)
    const versendet = statusEinfach === 'gesendet' || statusEinfach === 'abgelaufen'

    const baseItems = entityMenuToActionItems(
      buildEntityMenu(
        'angebot',
        {
          name: kundeName,
          status: statusEinfach,
          statusKey: statusEinfach,
        },
        {
          onEdit: kannBearbeiten ? openWizardBearbeiten : undefined,
          onCopy: () => runDuplicateAngebot(detail.id, router),
          onPortal: () => {
            if (!isCrmAdmin) {
              toast.error('Admin Login nur für CRM-Admins')
              return
            }
            if (impersonating) return
            setImpersonating(true)
            const run = detail.lead_id
              ? openMieterStatusPreview(detail.lead_id)
              : detail.kunde_id
                ? openPortalAsKunde(detail.kunde_id)
                : Promise.resolve({ ok: false as const, message: 'Kein Portal-Zugang verknüpft' })
            void run.then((r) => {
              setImpersonating(false)
              if (!r.ok) {
                toast.error(r.message)
                return
              }
              window.open(r.url, '_blank', 'noopener,noreferrer')
            })
          },
          onPortalLink: () => {
            if (!detail.kunde_id) {
              toast.error('Kein Kunde verknüpft — Portal-Link nicht möglich.')
              return
            }
            setPortalLinkModalOpen(true)
          },
          onAccept: versendet && !auftragId ? openAcceptModal : undefined,
          onPdf: () => window.open(`/api/angebote/${detail.id}/pdf`, '_blank'),
          onSend: !erledigt
            ? kannErneutSenden
              ? () => run(() => resendAngebotEinfach(detail.id), 'Angebot erneut gesendet')
              : kannVersenden
                ? openAngebotVersandModal
                : undefined
            : undefined,
          tel: kundeTelefon || null,
          mail: kundeEmail || null,
          onCall: kundeTelefon
            ? () => {
                window.location.href = `tel:${kundeTelefon.replace(/\s/g, '')}`
              }
            : undefined,
          onMail: () => mailCompose.openCompose(() => mailComposeContextFromAngebot(detail.id)),
          onDelete: () => {
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
          deleteLabel: kundeName,
        }
      ),
      (n, size) => mockMenuIcon(n as Parameters<typeof mockMenuIcon>[0], size)
    )

    if (erledigt || statusEinfach !== 'entwurf') return baseItems

    const out: typeof baseItems = []
    for (const item of baseItems) {
      out.push(item)
      if (item !== 'sep' && item.label === 'Bearbeiten') {
        out.push({
          label: 'Handwerker anfragen',
          icon: mockMenuIcon('send', 15),
          onClick: openHandwerkerAnfragen,
        })
      }
    }
    return out
  }, [
    kannBearbeiten,
    kannVersenden,
    kannErneutSenden,
    kundeEmail,
    kundeTelefon,
    kundeName,
    detail.id,
    detail.lead_id,
    detail.kunde_id,
    statusEinfach,
    mailCompose,
    auftragId,
    router,
    isCrmAdmin,
    impersonating,
    startTransition,
  ])

  const detailPrimaryBtnClass =
    'btn primary sm inline-flex shrink-0 justify-center gap-1.5'

  const primaryAction = (() => {
    const hwRows = detail.angebot_handwerker ?? []
    if (statusEinfach === 'entwurf') {
      if (hatAngebotHandwerker(hwRows) && !darfAngebotAnKundeSenden(hwRows, detail.status)) {
        const label = handwerkerAnfrageErledigt(hwRows)
          ? 'Partner-Einreichung prüfen'
          : 'Handwerker anfragen'
        return (
          <button
            type="button"
            className={detailPrimaryBtnClass}
            disabled={pending}
            onClick={openHandwerkerAnfragen}
          >
            {label}
            <MockIcon ctx="btn" n="send" size={14} />
          </button>
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
          <MockIcon ctx="btn" n="send" size={14} />
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
          <MockIcon ctx="btn" n="check" size={14} />
          Angebot annehmen
        </button>
      )
    }
    if (statusEinfach === 'angenommen' && auftragId) {
      return (
        <Link href={`/auftraege/${auftragId}`} className={detailPrimaryBtnClass}>
          <MockIcon ctx="btn" n="briefcase" size={14} />
          Zum Auftrag
        </Link>
      )
    }
    return null
  })()

  const stammdatenInhalt = (
    <AngebotStammdatenCard detail={detail} lead={lead} onSaved={() => refresh()} />
  )

  const detailsInhalt = (
    <AngebotDetailsTab
      detail={detail}
      lead={lead}
      gewerke={gewerke}
      editable={positionenBearbeitbar}
      onSaved={() => refresh()}
    />
  )

  const verlaufInhalt = (
    <>
      <MockVerlaufCard empty={timelineItems.length === 0}>
        <Timeline items={timelineItems} />
      </MockVerlaufCard>
      <KundenportalLinkVersendenModal
        open={portalLinkModalOpen}
        onClose={() => setPortalLinkModalOpen(false)}
        kundeId={detail.kunde_id}
        fallbackEmail={kundeEmail}
      />
    </>
  )

  const dokumenteInhalt = (
    <AngebotAnhaengeTab
      detail={detail}
      leadId={detail.lead_id ?? lead?.id ?? null}
      dokumente={dokumenteRows}
      onReload={() => refresh()}
    />
  )

  const notizenInhalt =
    detail.lead_id || lead?.id ? (
      <AnfrageNotizenTab
        leadId={(detail.lead_id ?? lead?.id)!}
        notizen={notizenRows}
        onReload={() => refresh()}
      />
    ) : (
      <MockCard title="Notizen · 0" icon="messages">
        <div style={{ fontSize: 12.5, color: 'var(--text-4)', padding: '4px 0' }}>
          Noch keine Notizen — dieses Angebot ist keiner Anfrage zugeordnet.
        </div>
      </MockCard>
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
      icon: 'list-details',
      count: positionenAnzeigeCount || undefined,
      render: () => detailsInhalt,
    },
    {
      id: 'verlauf',
      label: ACTIVITY_SECTIONS.verlauf,
      icon: 'history',
      count: timelineItems.length || undefined,
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
      id: 'notizen',
      label: ACTIVITY_SECTIONS.notizen,
      icon: 'messages',
      count: notizenRows.length || undefined,
      render: () => notizenInhalt,
    },
  ]

  return (
    <EntityDetailLayout
      phase="angebot"
      projektKontext={projektKontext}
      crumbBackHref="/vorgaenge?tab=angebot"
      crumbBackLabel="Zurück zu den Suchergebnissen"
      className="space-y-4 pb-0"
      head={{
        title: projektTitel && projektTitel !== '—' ? projektTitel : kundeName,
        badges: (
          <MockBadge kind={variantToMockBadgeKind(angebotStatus.variant)}>{angebotStatus.label}</MockBadge>
        ),
        meta: headMeta,
        actions: (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {primaryAction}
            <ActionsMenu
              trigger={
                <button type="button" className="qa-btn" aria-label="Weitere Aktionen" title="Aktionen">
                  <MockIcon ctx="btn" n="dots" size={18} />
                </button>
              }
              items={detailHeadMenuItems}
              sheetTitle="Angebot"
            />
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

      <DetailShell
        groups={detailShellGroups}
        value={mainTab}
        onChange={(id) => setMainTab(id as AngebotDetailTab)}
      />

      {/* Kunden-Versand nur als Modal (Primary-CTA / Menü) — kein Stammdaten-Block */}
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

      <AngebotHandwerkerPartnerSection
        detail={detail}
        auftragId={auftragId}
        bruttoMin={summenMail.bruttoMin}
        bruttoMax={summenMail.bruttoMax}
        positionen={detail.positionen ?? []}
        gueltigBis={gueltigBisYmd}
      />

      {wizardOpen && lead ? (
        <AngebotWizard
          key={wizardSessionKey}
          lead={lead}
          gewerke={gewerke}
          preislisten={wizardPreislisten}
          handwerker={wizardHandwerker}
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
                  <MockIcon ctx="btn" n="mail" size={14} />
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

      {mailCompose.modal}
    </EntityDetailLayout>
  )
}
