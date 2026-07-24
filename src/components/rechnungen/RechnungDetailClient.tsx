'use client'

import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { hubSpotStatusToMockBadgeKind } from '@/lib/status/mock-badge-kind'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { MockIcon, mockMenuIcon } from '@/components/mock-ui/MockIcon'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockVerlaufCard } from '@/components/mock-ui/MockDetailCards'
import { EntityDetailLayout } from '@/components/layout/EntityDetailLayout'
import { DetailShell, type DetailShellGroup } from '@/components/mock-ui/DetailShell'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { ActionsMenu } from '@/components/ui/actions-menu'
import { Timeline } from '@/components/ui/timeline'
import { useKundenMailCompose } from '@/components/kommunikation/useKundenMailCompose'
import { mailComposeContextFromRechnung } from '@/app/(dashboard)/kommunikation/actions'
import { Button } from '@/components/ui/Button'
import { ClientOnly } from '@/components/ui/ClientOnly'
import { RechnungWizard } from '@/components/rechnungen/RechnungWizard'
import {
  createGutschriftFromRechnung,
  sendRechnung,
  updateRechnungStatus,
} from '@/app/(dashboard)/rechnungen/actions'
import { ZahlungserinnerungMailModal } from '@/components/rechnungen/ZahlungserinnerungMailModal'
import {
  RechnungMahnverlaufCard,
  type RechnungMahnMailZeile,
} from '@/components/rechnungen/RechnungMahnverlaufCard'
import { EmailLogPreviewModal } from '@/components/email/EmailLogPreviewModal'
import {
  loadRechnungWizardBootstrap,
  loadRechnungWizardBootstrapStandalone,
  deleteRechnungEntwurf,
} from '@/app/(dashboard)/rechnungen/wizard-actions'
import { RechnungStammdatenCard } from '@/components/rechnungen/RechnungStammdatenCard'
import { RechnungDetailsTab } from '@/components/rechnungen/RechnungDetailsTab'
import { resolveCumulativeDetailTabAlias } from '@/lib/entity-detail/cumulative-detail-tabs'
import { RechnungDokumenteTab } from '@/components/rechnungen/RechnungDokumenteTab'
import { AnfrageNotizenTab } from '@/components/anfragen/AnfrageNotizenTab'
import { openPortalAsKunde } from '@/app/(dashboard)/impersonation/actions'
import { useIsCrmAdmin } from '@/hooks/useIsCrmAdmin'
import { buildEntityMenu, entityMenuToActionItems } from '@/lib/entity-menu'
import { runDuplicateRechnung } from '@/lib/list-actions'
import { ergaenzeTimelineMitProjektKontext } from '@/lib/crm/build-projekt-timeline'
import { sortTimelineByCreatedAtAsc } from '@/lib/timeline-sort'
import { istGewerkBeschreibungPosition } from '@/lib/dokument-zeilen'
import { formatDatum, formatTimelineStamp } from '@/lib/utils'
import { RECHNUNG_BELEG_TYP_LABELS } from '@/lib/rechnung-config'
import {
  defaultZahlungszielTage,
  rechnungDarfImWizardBearbeitetWerden,
  type RechnungWizardBootstrap,
} from '@/lib/rechnungen/rechnung-wizard-types'
import {
  mahnstufeListenLabel,
  rechnungHatMahnverlauf,
} from '@/lib/rechnungen/mahnverlauf'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { toast } from '@/components/ui/app-toast'
import { KundenportalLinkVersendenModal } from '@/components/crm/KundenportalLinkVersendenModal'
import { ACTIVITY_SECTIONS } from '@/lib/crm-labels'
import { VorgangFotosTab } from '@/components/crm/VorgangFotosTab'
import { collectVorgangFotos } from '@/lib/vorgang/vorgang-fotos'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { PipelineKontextLead } from '@/lib/leads/pipeline-kontext'
import type {
  AngebotDetail,
  AuftragDetail,
  Gewerk,
  LeadDetail,
  LeadNotizRow,
  LeadTimelineRow,
  Preisliste,
  Rechnung,
  RechnungBelegTyp,
  RechnungStatus,
} from '@/lib/types'

type RechnungDetailTab =
  | 'stammdaten'
  | 'details'
  | 'fotos'
  | 'verlauf'
  | 'dokumente'
  | 'notizen'

const RECHNUNG_DETAIL_TAB_IDS = new Set<RechnungDetailTab>([
  'stammdaten',
  'details',
  'fotos',
  'verlauf',
  'dokumente',
  'notizen',
])

function resolveRechnungDetailTabFromQuery(raw: string | null): RechnungDetailTab | null {
  const tab = (raw ?? '').trim().toLowerCase()
  if (!tab) return null
  if (tab === 'uebersicht' || tab === 'stammdaten') return 'stammdaten'
  if (
    tab === 'positionen' ||
    tab === 'leistung' ||
    tab === 'rechnung-details' ||
    tab === 'anfrage' ||
    tab === 'anfrage-details' ||
    tab === 'angebot' ||
    tab === 'angebot-details' ||
    tab === 'auftrag' ||
    tab === 'auftrag-details'
  ) {
    return 'details'
  }
  if (tab === 'mahnung' || tab === 'mahnungen' || tab === 'mahnverlauf') return 'verlauf'
  if (tab === 'aktivitaet' || tab === 'verlauf') return 'verlauf'
  if (tab === 'kommunikation' || tab === 'notizen') return 'notizen'
  if (tab === 'dokumente') return 'dokumente'
  if (tab === 'bilder' || tab === 'photos' || tab === 'fotos') return 'fotos'
  const cumulative = resolveCumulativeDetailTabAlias(tab)
  if (
    cumulative === 'anfrage-details' ||
    cumulative === 'angebot-details' ||
    cumulative === 'auftrag-details' ||
    cumulative === 'rechnung-details'
  ) {
    return 'details'
  }
  if (RECHNUNG_DETAIL_TAB_IDS.has(tab as RechnungDetailTab)) return tab as RechnungDetailTab
  return null
}

function tageSeitFaelligkeit(faelligAm: string | null): number {
  if (!faelligAm) return 0
  const parts = faelligAm.split('-').map((x) => parseInt(x, 10))
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return 0
  const [y, m, d] = parts
  const due = new Date(y!, m! - 1, d!)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - due.getTime()) / 86400000)
}

function rechnungStatusBadge(status: RechnungStatus, ueberfaellig: boolean) {
  if (ueberfaellig) return <MockBadge kind={hubSpotStatusToMockBadgeKind('cancel')}>Überfällig</MockBadge>
  if (status === 'bezahlt') return <MockBadge kind={hubSpotStatusToMockBadgeKind('order')}>Bezahlt</MockBadge>
  if (status === 'gesendet') return <MockBadge kind={hubSpotStatusToMockBadgeKind('offer')}>Gesendet</MockBadge>
  if (status === 'storniert') return <MockBadge kind={hubSpotStatusToMockBadgeKind('cancel')}>Storniert</MockBadge>
  return <MockBadge kind={hubSpotStatusToMockBadgeKind('done')}>Entwurf</MockBadge>
}

import { angebotTitelOderSituationBereich } from '@/lib/vorgang/vorgang-anzeige-titel'

function rechnungTitelMeta(
  detail: Rechnung,
  belegTyp: RechnungBelegTyp,
  lead?: LeadDetail | null
): string {
  const angRaw = detail.angebote
  const ang = Array.isArray(angRaw) ? angRaw[0] : angRaw
  return angebotTitelOderSituationBereich({
    angebot: ang,
    situation: lead?.situation,
    bereiche: lead?.bereiche,
    fallback:
      detail.auftraege?.titel?.trim() ||
      (detail.rechnungsnummer?.trim()
        ? `${RECHNUNG_BELEG_TYP_LABELS[belegTyp]} ${detail.rechnungsnummer.trim()}`
        : RECHNUNG_BELEG_TYP_LABELS[belegTyp]),
  })
}

export function RechnungDetailClient({
  detail: initial,
  kleinunternehmerFirma,
  gewerke = [],
  preislisten = [],
  firm,
  mahnMails = [],
  projektKontext,
  pipelineLead = null,
  lead = null,
  angebotDetail = null,
  auftragDetail = null,
  timeline: timelineInitial = [],
}: {
  detail: Rechnung
  kleinunternehmerFirma: boolean
  gewerke?: Gewerk[]
  preislisten?: Preisliste[]
  firm?: FirmenEinstellungen
  mahnMails?: RechnungMahnMailZeile[]
  projektKontext?: import('@/lib/crm/projekt-kontext-types').ProjektKontext
  pipelineLead?: PipelineKontextLead | null
  lead?: LeadDetail | null
  angebotDetail?: AngebotDetail | null
  auftragDetail?: AuftragDetail | null
  timeline?: LeadTimelineRow[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refresh } = useCrmRefresh()
  const mailCompose = useKundenMailCompose()
  const isCrmAdmin = useIsCrmAdmin()
  const [detail, setDetail] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardBootstrap, setWizardBootstrap] = useState<RechnungWizardBootstrap | null>(null)
  const [wizardKey, setWizardKey] = useState(0)
  const [mainTab, setMainTab] = useState<RechnungDetailTab>('stammdaten')
  const [erinnerungModalOpen, setErinnerungModalOpen] = useState(false)
  const [emailPreviewId, setEmailPreviewId] = useState<string | null>(null)
  const [portalLinkModalOpen, setPortalLinkModalOpen] = useState(false)
  const [impersonating, setImpersonating] = useState(false)

  useEffect(() => {
    setDetail(initial)
  }, [initial])

  useEffect(() => {
    const tab = resolveRechnungDetailTabFromQuery(searchParams.get('tab'))
    if (tab) setMainTab(tab)
  }, [searchParams])

  const pos = normalizeAngebotPositionen(detail.positionen ?? [])

  const belegTyp: RechnungBelegTyp =
    detail.beleg_typ === 'gutschrift' ? 'gutschrift' : 'rechnung'
  const kundeName = detail.kunden?.name?.trim() || 'Rechnung'
  const kundeEmail = detail.kunden?.email?.trim() || lead?.kontakt_email?.trim() || ''
  const kundeId = detail.kunden?.id ?? detail.kunde_id

  const tageUeberfaellig = detail.faellig_am ? tageSeitFaelligkeit(detail.faellig_am) : 0
  const ueberfaellig =
    tageUeberfaellig > 0 &&
    detail.status !== 'bezahlt' &&
    detail.status !== 'storniert' &&
    belegTyp === 'rechnung'

  const zeigtMahnverlauf =
    belegTyp === 'rechnung' &&
    (detail.status === 'gesendet' ||
      detail.status === 'bezahlt' ||
      rechnungHatMahnverlauf(detail))

  const zahlungszielFallback = Math.max(
    1,
    parseInt(firm?.zahlungsziel_tage ?? '', 10) || defaultZahlungszielTage(detail.kunden?.typ)
  )

  const pdfHref = detail.pdf_url?.trim() || `/api/rechnungen/${detail.id}/pdf`

  const positionenCount = useMemo(
    () => pos.filter((p) => !istGewerkBeschreibungPosition(p)).length,
    [pos]
  )

  const vorgangFotos = useMemo(
    () =>
      collectVorgangFotos({
        funnelDaten: lead?.funnel_daten,
        angebotFotosRaw: angebotDetail?.fotos_urls,
      }),
    [lead?.funnel_daten, angebotDetail?.fotos_urls]
  )

  const leadId = lead?.id ?? projektKontext?.lead?.id ?? null
  const notizenRows: LeadNotizRow[] = lead?.lead_notizen ?? []
  const dokumenteRows = lead?.lead_dokumente ?? []

  const timelineSorted = useMemo(
    () => sortTimelineByCreatedAtAsc(timelineInitial ?? []),
    [timelineInitial]
  )

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
          id: `rechnung-created-${detail.id}`,
          text: `Rechnung angelegt${detail.rechnungsnummer?.trim() ? ` — ${detail.rechnungsnummer.trim()}` : ''}`,
          time: formatTimelineStamp(detail.created_at),
          state: 'done',
          ts: new Date(detail.created_at).getTime(),
        },
      ]
    }

    if (!projektKontext) return basis

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

    return enriched.map((item) => ({
      id: item.id,
      text: item.text,
      time: item.time,
      state: item.state,
      ts: item.ts,
    }))
  }, [timelineSorted, detail.created_at, detail.id, detail.rechnungsnummer, projektKontext])

  async function setStatus(s: RechnungStatus) {
    startTransition(async () => {
      const r = await updateRechnungStatus(detail.id, s)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      if (s === 'bezahlt') {
        toast.success(
          r.zahlungsbestaetigungGesendet
            ? 'Bezahlt — Zahlungsbestätigung per E-Mail gesendet'
            : 'Als bezahlt markiert'
        )
      }
      setDetail((d) => ({ ...d, status: s }))
      refresh()
    })
  }

  function handleGutschrift() {
    if (!window.confirm('Gutschrift anlegen und Originalrechnung als storniert markieren?')) return
    startTransition(async () => {
      const r = await createGutschriftFromRechnung(detail.id)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Gutschrift erstellt')
      router.push(`/rechnungen/${r.id}`)
      refresh()
    })
  }

  function handleSenden() {
    startTransition(async () => {
      const r = await sendRechnung(detail.id)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Rechnung gesendet')
      setDetail((d) => ({ ...d, status: 'gesendet' }))
      refresh()
    })
  }

  function openWizard() {
    startTransition(async () => {
      const res = detail.auftrag_id
        ? await loadRechnungWizardBootstrap(detail.id, detail.auftrag_id)
        : await loadRechnungWizardBootstrapStandalone(detail.id)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      setWizardBootstrap(res.bootstrap)
      setWizardKey((k) => k + 1)
      setWizardOpen(true)
    })
  }

  const menuStatusKey = ueberfaellig
    ? 'ueberfaellig'
    : detail.status === 'gesendet'
      ? 'gesendet'
      : detail.status

  const detailHeadMenuItems = useMemo(() => {
    const extras = []
    if (belegTyp === 'rechnung' && detail.status !== 'storniert' && detail.status !== 'bezahlt') {
      extras.push({
        icon: 'file-off',
        label: 'Gutschrift erstellen',
        onClick: handleGutschrift,
      })
    }
    if (detail.status === 'gesendet' && belegTyp === 'rechnung') {
      extras.push({
        icon: 'alert-triangle',
        label: 'Zahlungserinnerung senden',
        onClick: () => setErinnerungModalOpen(true),
      })
    }

    return entityMenuToActionItems(
      buildEntityMenu(
        'rechnung',
        {
          name: kundeName,
          status: detail.status,
          statusKey: menuStatusKey,
          customer: {
            name: kundeName,
            mail: kundeEmail || undefined,
          },
        },
        {
          onCopy: () => runDuplicateRechnung(detail.id, router),
          onPortal: () => {
            if (!isCrmAdmin || !kundeId) {
              toast.error('Admin Login nur für CRM-Admins mit Kundenkonto')
              return
            }
            if (impersonating) return
            setImpersonating(true)
            void openPortalAsKunde(kundeId).then((r) => {
              setImpersonating(false)
              if (!r.ok) {
                toast.error(r.message)
                return
              }
              window.open(r.url, '_blank', 'noopener,noreferrer')
            })
          },
          onPortalLink: () => {
            if (!kundeId) {
              toast.error('Kein Kunde verknüpft — Portal-Link nicht möglich.')
              return
            }
            setPortalLinkModalOpen(true)
          },
          onEdit2: rechnungDarfImWizardBearbeitetWerden(detail.status) ? openWizard : undefined,
          onMarkPaid:
            detail.status === 'gesendet' || ueberfaellig
              ? () => void setStatus('bezahlt')
              : undefined,
          onPdf: () => window.open(pdfHref, '_blank', 'noopener,noreferrer'),
          onSend:
            detail.status === 'storniert' || detail.status === 'bezahlt'
              ? undefined
              : handleSenden,
          onToAuftrag: detail.auftrag_id
            ? () => router.push(`/auftraege/${detail.auftrag_id}`)
            : undefined,
          mail: kundeEmail || null,
          onMail: () => mailCompose.openCompose(() => mailComposeContextFromRechnung(detail.id)),
          onDelete:
            detail.status === 'entwurf'
              ? () => {
                  startTransition(async () => {
                    const r = await deleteRechnungEntwurf(detail.id)
                    if (!r.ok) {
                      toast.error(r.message)
                      return
                    }
                    toast.success('Entwurf gelöscht')
                    router.push('/vorgaenge?tab=rechnung')
                  })
                }
              : detail.status !== 'bezahlt'
                ? () => void setStatus('storniert')
                : undefined,
          deleteMenuLabel: detail.status === 'entwurf' ? 'Löschen' : 'Stornieren',
          deleteLabel: kundeName,
          extra: extras,
        }
      ),
      (n, size) => mockMenuIcon(n as Parameters<typeof mockMenuIcon>[0], size)
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    belegTyp,
    detail.status,
    detail.id,
    detail.auftrag_id,
    kundeName,
    kundeEmail,
    kundeId,
    menuStatusKey,
    pdfHref,
    ueberfaellig,
    mailCompose,
    router,
    isCrmAdmin,
    impersonating,
  ])

  const projektTitelAnzeige = rechnungTitelMeta(detail, belegTyp, lead)

  const headMeta = kundeName

  const primaryAction = (() => {
    if (detail.status === 'entwurf') {
      return (
        <Button type="button" variant="primary" size="sm" loading={pending} onClick={handleSenden}>
          <MockIcon ctx="btn" n="send" size={14} />
          Versenden
        </Button>
      )
    }
    if (detail.status === 'gesendet' || ueberfaellig) {
      return (
        <div className="flex flex-wrap items-center gap-2">
          {ueberfaellig && belegTyp === 'rechnung' ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => setErinnerungModalOpen(true)}>
              <MockIcon ctx="btn" n="alert-triangle" size={14} />
              Erinnerung
            </Button>
          ) : null}
          <Button
            type="button"
            variant="primary"
            size="sm"
            loading={pending}
            onClick={() => void setStatus('bezahlt')}
          >
            Bezahlt
          </Button>
        </div>
      )
    }
    return null
  })()

  const mahnLabel = mahnstufeListenLabel(detail)

  const stammdatenInhalt = (
    <RechnungStammdatenCard detail={detail} lead={lead} onSaved={() => refresh()} />
  )

  const detailsInhalt = (
    <>
      <RechnungDetailsTab detail={detail} lead={lead} zahlungszielFallback={zahlungszielFallback} />
      {ueberfaellig && !zeigtMahnverlauf ? (
        <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--danger, #c0392b)' }}>
          Seit {tageUeberfaellig} Tag{tageUeberfaellig === 1 ? '' : 'en'} überfällig
          {mahnLabel ? ` · ${mahnLabel}` : ''}.
        </p>
      ) : null}
    </>
  )

  const verlaufInhalt = (
    <>
      <MockVerlaufCard empty={timelineItems.length === 0}>
        <Timeline items={timelineItems} />
      </MockVerlaufCard>
      {belegTyp === 'rechnung' ? (
        <RechnungMahnverlaufCard
          rechnung={detail}
          mahnMails={mahnMails}
          empty={detail.status === 'entwurf' && !rechnungHatMahnverlauf(detail)}
          onSendErinnerung={
            detail.status === 'gesendet' || ueberfaellig || zeigtMahnverlauf
              ? () => setErinnerungModalOpen(true)
              : undefined
          }
          onMailAnsehen={(id) => setEmailPreviewId(id)}
        />
      ) : null}
    </>
  )

  const dokumenteInhalt = (
    <RechnungDokumenteTab
      detail={detail}
      leadId={leadId}
      dokumente={dokumenteRows}
      onReload={() => refresh()}
    />
  )

  const notizenInhalt = leadId ? (
    <AnfrageNotizenTab leadId={leadId} notizen={notizenRows} onReload={() => refresh()} />
  ) : (
    <MockCard title="Notizen · 0" icon="messages">
      <div style={{ fontSize: 12.5, color: 'var(--text-4)', padding: '4px 0' }}>
        Noch keine Notizen — diese Rechnung ist keiner Anfrage zugeordnet.
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
      count: positionenCount || undefined,
      render: () => detailsInhalt,
    },
    {
      id: 'fotos',
      label: ACTIVITY_SECTIONS.fotos,
      icon: 'photo',
      count: vorgangFotos.length || undefined,
      render: () => <VorgangFotosTab fotos={vorgangFotos} />,
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
      count: (dokumenteRows.length || 0) + 1 || undefined,
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

  const crumbTitle = projektTitelAnzeige

  return (
    <EntityDetailLayout
      phase="rechnung"
      projektKontext={projektKontext}
      crumbBackHref="/vorgaenge?tab=rechnung"
      crumbBackLabel="Zurück zu den Suchergebnissen"
      className="space-y-4 pb-0"
      head={{
        title: crumbTitle && crumbTitle !== '—' ? crumbTitle : kundeName,
        badges: rechnungStatusBadge(detail.status, ueberfaellig),
        meta: headMeta,
        actions: (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {primaryAction}
            <ActionsMenu
              align="right"
              sheetTitle="Aktionen"
              trigger={
                <button type="button" className="btn ghost sm icon" aria-label="Aktionen">
                  <MockIcon ctx="btn" n="dots" size={16} />
                </button>
              }
              items={detailHeadMenuItems}
            />
          </div>
        ),
      }}
    >
      <DetailShell
        groups={detailShellGroups}
        value={mainTab}
        onChange={(id) => setMainTab(id as RechnungDetailTab)}
      />

      <EmailLogPreviewModal
        emailLogId={emailPreviewId}
        open={Boolean(emailPreviewId)}
        onClose={() => setEmailPreviewId(null)}
      />

      <ZahlungserinnerungMailModal
        open={erinnerungModalOpen}
        onClose={() => setErinnerungModalOpen(false)}
        rechnungId={detail.id}
        rechnungsnummer={detail.rechnungsnummer?.trim() || detail.id.slice(0, 8)}
        erinnerung7SentAt={detail.erinnerung_7_sent_at}
        erinnerung21SentAt={detail.erinnerung_21_sent_at}
        onSent={() => {
          setErinnerungModalOpen(false)
          refresh()
        }}
      />

      {wizardOpen && wizardBootstrap && firm ? (
        <ClientOnly>
          <RechnungWizard
            key={wizardKey}
            bootstrap={wizardBootstrap}
            gewerke={gewerke}
            preislisten={preislisten}
            firm={firm}
            zahlungszielTage={zahlungszielFallback}
            onClose={() => {
              setWizardOpen(false)
              setWizardBootstrap(null)
            }}
            onDone={() => {
              setWizardOpen(false)
              setWizardBootstrap(null)
              refresh()
            }}
          />
        </ClientOnly>
      ) : null}

      {mailCompose.modal}

      <KundenportalLinkVersendenModal
        open={portalLinkModalOpen}
        onClose={() => setPortalLinkModalOpen(false)}
        kundeId={kundeId}
        fallbackEmail={kundeEmail}
      />
    </EntityDetailLayout>
  )
}
