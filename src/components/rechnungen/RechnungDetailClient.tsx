'use client'

import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { variantToMockBadgeKind } from '@/lib/status/mock-badge-kind'
import { gesendetDetailSubline, rechnungStatusDisplay } from '@/lib/status/status-display'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { MockIcon, mockMenuIcon } from '@/components/mock-ui/MockIcon'
import { MockCard } from '@/components/mock-ui/MockCard'
import { EntityDetailLayout } from '@/components/layout/EntityDetailLayout'
import { DetailActionsBar, type DetailActionDef } from '@/components/layout/DetailActionsBar'
import { DetailShell, type DetailShellGroup } from '@/components/mock-ui/DetailShell'
import { ZugehoerigListe } from '@/components/vorgang/ZugehoerigListe'
import { PhaseCardsBlock } from '@/components/vorgang/PhaseCard'
import { DetailSection } from '@/components/vorgang/DetailSection'
import { VorgangAkteTab, type AkteSegment } from '@/components/vorgang/VorgangAkteTab'
import { parseAkteSegment, isLegacyDetailTabAlias } from '@/lib/vorgang/detail-tab-helpers'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { useKundenMailCompose } from '@/components/kommunikation/useKundenMailCompose'
import { mailComposeContextFromRechnung } from '@/app/(dashboard)/kommunikation/actions'
import { ClientOnly } from '@/components/ui/ClientOnly'
import { RechnungWizard } from '@/components/rechnungen/RechnungWizard'
import {
  createGutschriftFromRechnung,
  korrigiereRechnung,
  nehmeRechnungStornoZurueck,
  sendRechnung,
  sendZahlungsbestaetigung,
  storniereRechnungOhneErsatz,
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
import {
  RechnungAuftragdetailsTab,
  RechnungZahlplanTab,
} from '@/components/rechnungen/RechnungAuftragZahlplanTabs'
import { RechnungDokumenteTab } from '@/components/rechnungen/RechnungDokumenteTab'
import { AnfrageNotizenTab } from '@/components/anfragen/AnfrageNotizenTab'
import { openPortalAsKunde } from '@/app/(dashboard)/impersonation/actions'
import { useIsCrmAdmin } from '@/hooks/useIsCrmAdmin'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { buildEntityMenu, entityMenuToActionItems } from '@/lib/entity-menu'
import { runDuplicateRechnung } from '@/lib/list-actions'
import { VerlaufPanel } from '@/components/crm/VerlaufPanel'
import { ProjektHistorieTab } from '@/components/crm/ProjektHistorieTab'
import { buildLeadVerlaufItems } from '@/lib/crm/verlauf'
import { istGewerkBeschreibungPosition } from '@/lib/dokument-zeilen'
import { formatDatum } from '@/lib/utils'
import { RECHNUNG_BELEG_TYP_LABELS } from '@/lib/rechnung-config'
import {
  defaultZahlungszielTage,
  type RechnungAuswahlZeile,
  type RechnungWizardBootstrap,
} from '@/lib/rechnungen/rechnung-wizard-types'
import {
  rechnungDarfHardGeloeschtWerden,
  rechnungDarfOhneErsatzStorniertWerden,
  rechnungKorrekturModus,
} from '@/lib/rechnungen/rechnung-korrektur'
import {
  mahnstufeListenLabel,
  rechnungHatMahnverlauf,
} from '@/lib/rechnungen/mahnverlauf'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { toast } from '@/components/ui/app-toast'
import { KundenportalLinkVersendenModal } from '@/components/crm/KundenportalLinkVersendenModal'
import { ACTIVITY_SECTIONS } from '@/lib/crm-labels'
import { entityDetailTabLabel } from '@/lib/entity-detail/entity-detail-tabs'
import { VorgangFotosTab } from '@/components/crm/VorgangFotosTab'
import { collectVorgangFotos } from '@/lib/vorgang/vorgang-fotos'
import { angebotTitelOderSituationBereich } from '@/lib/vorgang/vorgang-anzeige-titel'
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

type RechnungDetailTab = 'uebersicht' | 'akte' | 'aktivitaet'

const RECHNUNG_DETAIL_TAB_IDS = new Set<RechnungDetailTab>(['uebersicht', 'akte', 'aktivitaet'])

function resolveRechnungDetailTabFromQuery(raw: string | null): RechnungDetailTab | null {
  const tab = (raw ?? '').trim().toLowerCase()
  if (!tab) return null
  if (
    tab === 'akte' ||
    tab === 'stammdaten' ||
    tab === 'zahlplan' ||
    tab === 'zahlung' ||
    tab === 'finanzen' ||
    tab === 'dokumente' ||
    tab === 'notizen' ||
    tab === 'auftragdetails' ||
    tab === 'auftrag' ||
    tab === 'auftrag-details'
  ) {
    return 'akte'
  }
  if (
    tab === 'uebersicht' ||
    tab === 'details' ||
    tab === 'positionen' ||
    tab === 'leistung' ||
    tab === 'rechnung-details' ||
    tab === 'anfrage' ||
    tab === 'anfrage-details' ||
    tab === 'angebot' ||
    tab === 'angebot-details' ||
    tab === 'fotos' ||
    tab === 'bilder' ||
    tab === 'photos'
  ) {
    return 'uebersicht'
  }
  if (
    tab === 'aktivitaet' ||
    tab === 'verlauf' ||
    tab === 'historie' ||
    tab === 'projekt-historie' ||
    tab === 'phasen'
  ) {
    return 'aktivitaet'
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
  auftragRechnungen = [],
  nachfolgerRechnungId = null,
  darfStornoZuruecknehmen = false,
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
  /** Weitere Rechnungen desselben Auftrags (für Zahlplan-Tab) */
  auftragRechnungen?: RechnungAuswahlZeile[]
  /** Nachfolger-RE nach Korrektur (Original ist storniert) */
  nachfolgerRechnungId?: string | null
  /** Soft-Storno ohne Gutschrift → zurücknehmbar */
  darfStornoZuruecknehmen?: boolean
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
  const [mainTab, setMainTab] = useState<RechnungDetailTab>('uebersicht')
  const [akteSegment, setAkteSegment] = useState<AkteSegment>('zahlung')
  const [erinnerungModalOpen, setErinnerungModalOpen] = useState(false)
  const [emailPreviewId, setEmailPreviewId] = useState<string | null>(null)
  const [portalLinkModalOpen, setPortalLinkModalOpen] = useState(false)
  const [impersonating, setImpersonating] = useState(false)
  const [rechnungConfirm, setRechnungConfirm] = useState<'gutschrift' | 'korrigieren' | null>(
    null
  )

  useEffect(() => {
    setDetail(initial)
  }, [initial])

  useEffect(() => {
    const raw = searchParams.get('tab')
    if (isLegacyDetailTabAlias(raw) || raw === 'auftragdetails' || raw === 'zahlplan') {
      const resolved = resolveRechnungDetailTabFromQuery(raw) ?? 'uebersicht'
      const seg = parseAkteSegment(raw, searchParams.get('segment'))
      const q = new URLSearchParams(searchParams.toString())
      q.set('tab', resolved)
      if (resolved === 'akte') q.set('segment', seg)
      else q.delete('segment')
      router.replace(`/rechnungen/${detail.id}?${q.toString()}`, { scroll: false })
      return
    }
    const tab = resolveRechnungDetailTabFromQuery(raw)
    if (tab) setMainTab(tab)
    setAkteSegment(parseAkteSegment(raw, searchParams.get('segment')))
  }, [searchParams, detail.id, router])

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

  const timelineItems = useMemo(() => {
    const base = buildLeadVerlaufItems(timelineInitial ?? [], {
      fallbackCreatedAt: detail.created_at,
      fallbackCreatedLabel: `Rechnung angelegt${detail.rechnungsnummer?.trim() ? ` — ${detail.rechnungsnummer.trim()}` : ''}`,
    })

    return base.map((item) => {
      if (item.inspect?.kind === 'rechnung' || item.source === 'fallback') {
        return {
          ...item,
          inspect: {
            kind: 'rechnung' as const,
            title: item.inspect?.title ?? item.text,
            description: item.inspect?.description,
            createdAt: item.inspect?.createdAt ?? detail.created_at,
            typ: item.inspect?.typ,
            rechnungId: detail.id,
            href: `/rechnungen/${detail.id}`,
            hrefLabel: 'Zur Rechnung',
          },
        }
      }
      return item
    })
  }, [timelineInitial, detail.created_at, detail.rechnungsnummer, detail.id])

  async function setStatus(s: RechnungStatus, opts?: { notifyKunde?: boolean }) {
    startTransition(async () => {
      const r = await updateRechnungStatus(detail.id, s, opts)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      if (s === 'bezahlt') {
        toast.success(
          r.zahlungsbestaetigungGesendet
            ? 'Bezahlt — Zahlungsbestätigung per E-Mail gesendet'
            : 'Als bezahlt markiert (ohne Kunden-Mail)'
        )
      }
      setDetail((d) => ({
        ...d,
        status: s,
        ...(s === 'bezahlt' ? { bezahlt_at: new Date().toISOString() } : {}),
      }))
      refresh()
    })
  }

  function handleGutschrift() {
    setRechnungConfirm('gutschrift')
  }

  function ausfuehrenGutschrift() {
    setRechnungConfirm(null)
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

  function handleKorrigieren() {
    const modus = rechnungKorrekturModus(detail.status)
    if (modus === 'gesperrt') {
      toast.error('Diese Rechnung kann nicht korrigiert werden.')
      return
    }
    if (modus === 'direkt') {
      openWizard()
      return
    }
    setRechnungConfirm('korrigieren')
  }

  function ausfuehrenKorrigieren() {
    setRechnungConfirm(null)
    startTransition(async () => {
      const r = await korrigiereRechnung(detail.id)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      if (r.mode === 'direkt') {
        openWizard()
        return
      }
      toast.success('Storno angelegt — neue Rechnung als Entwurf')
      router.push(`/rechnungen/${r.neuId}`)
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
    if (belegTyp === 'rechnung' && detail.status !== 'storniert') {
      extras.push({
        icon: 'file-off',
        label: 'Gutschrift (Teil/Kulanz)',
        onClick: handleGutschrift,
      })
    }
    if (rechnungDarfOhneErsatzStorniertWerden(detail.status) && belegTyp === 'rechnung') {
      extras.push({
        icon: 'ban',
        label: 'Ohne Ersatz stornieren',
        hint: 'Nur bei Fehlversand — sonst „Rechnung korrigieren“',
        danger: true,
        onClick: () => {
          if (
            !window.confirm(
              'Rechnung endgültig stornieren, ohne Ersatzbeleg?\n\nFür Betrags- oder Positionsänderungen bitte „Rechnung korrigieren“ nutzen.'
            )
          ) {
            return
          }
          startTransition(async () => {
            const r = await storniereRechnungOhneErsatz(detail.id)
            if (!r.ok) {
              toast.error(r.message)
              return
            }
            toast.success('Rechnung storniert')
            setDetail((d) => ({ ...d, status: 'storniert' }))
            refresh()
          })
        },
      })
    }
    if (detail.status === 'gesendet' && belegTyp === 'rechnung') {
      extras.push({
        icon: 'alert-triangle',
        label: 'Zahlungserinnerung senden',
        onClick: () => setErinnerungModalOpen(true),
      })
      extras.push({
        icon: 'mail',
        label: 'Bezahlt + Bestätigung senden',
        onClick: () => void setStatus('bezahlt', { notifyKunde: true }),
      })
    }
    if (detail.status === 'bezahlt' && belegTyp === 'rechnung') {
      extras.push({
        icon: 'mail',
        label: 'Zahlungsbestätigung senden',
        onClick: () => {
          startTransition(async () => {
            const r = await sendZahlungsbestaetigung(detail.id)
            if (!r.ok) {
              toast.error(r.message)
              return
            }
            toast.success(
              r.skipped
                ? 'Keine Kunden-E-Mail — Bestätigung übersprungen'
                : 'Zahlungsbestätigung gesendet'
            )
            refresh()
          })
        },
      })
    }
    if (detail.status === 'storniert' && nachfolgerRechnungId) {
      extras.push({
        icon: 'arrow-right',
        label: 'Zur Nachfolger-Rechnung',
        onClick: () => router.push(`/rechnungen/${nachfolgerRechnungId}`),
      })
    }
    if (darfStornoZuruecknehmen && belegTyp === 'rechnung') {
      extras.push({
        icon: 'history',
        label: 'Storno zurücknehmen',
        onClick: () => {
          if (!window.confirm('Soft-Storno zurücknehmen und Status wieder auf „Gesendet“ setzen?')) {
            return
          }
          startTransition(async () => {
            const r = await nehmeRechnungStornoZurueck(detail.id)
            if (!r.ok) {
              toast.error(r.message)
              return
            }
            toast.success('Storno zurückgenommen')
            setDetail((d) => ({ ...d, status: 'gesendet' }))
            refresh()
          })
        },
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
          onEdit2:
            rechnungKorrekturModus(detail.status) !== 'gesperrt' ? handleKorrigieren : undefined,
          onMarkPaid:
            detail.status === 'gesendet' || ueberfaellig
              ? () => void setStatus('bezahlt')
              : undefined,
          onPdf: () => window.open(pdfHref, '_blank', 'noopener,noreferrer'),
          onSend:
            detail.status === 'storniert' || detail.status === 'bezahlt'
              ? undefined
              : handleSenden,
          mail: kundeEmail || null,
          onMail: () => mailCompose.openCompose(() => mailComposeContextFromRechnung(detail.id)),
          onDelete: rechnungDarfHardGeloeschtWerden(detail.status)
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
            : undefined,
          deleteMenuLabel: 'Löschen',
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
    nachfolgerRechnungId,
    darfStornoZuruecknehmen,
  ])

  const primaryAction = useMemo((): DetailActionDef | null => {
    if (detail.status === 'entwurf') {
      return {
        label: 'Versenden',
        icon: 'send',
        onClick: handleSenden,
        disabled: pending,
      }
    }
    if (detail.status === 'gesendet' || ueberfaellig) {
      return {
        label: 'Bezahlt',
        icon: 'check',
        onClick: () => void setStatus('bezahlt'),
        disabled: pending,
      }
    }
    return null
  }, [detail.status, ueberfaellig, pending, handleSenden, setStatus])

  const secondaryAction = useMemo((): DetailActionDef | null => {
    if ((detail.status === 'gesendet' || ueberfaellig) && ueberfaellig && belegTyp === 'rechnung') {
      return {
        label: 'Erinnerung',
        icon: 'alert-triangle',
        onClick: () => setErinnerungModalOpen(true),
      }
    }
    if (detail.auftrag_id) {
      return {
        label: 'Zum Auftrag',
        icon: 'briefcase',
        onClick: () =>
          router.replace(`/auftraege/${detail.auftrag_id}?from=rechnung:${detail.id}`),
        href: `/auftraege/${detail.auftrag_id}?from=rechnung:${detail.id}`,
      }
    }
    return null
  }, [detail.status, detail.auftrag_id, detail.id, ueberfaellig, belegTyp, router])

  const projektTitelAnzeige = rechnungTitelMeta(detail, belegTyp, lead)
  const rechnungStatus = rechnungStatusDisplay(detail.status, { ueberfaellig })
  const headMeta = kundeName
  const headSub =
    detail.status === 'gesendet'
      ? gesendetDetailSubline(detail.gesendet_at, detail.updated_at)
      : undefined

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
      <VerlaufPanel items={timelineItems} />
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
    <MockCard title="Notizen" icon="messages">
      <div style={{ fontSize: 12.5, color: 'var(--text-4)', padding: '4px 0' }}>
        Noch keine Notizen — verknüpfe eine Anfrage oder lege später welche an.
      </div>
    </MockCard>
  )

  const detailShellGroups: DetailShellGroup[] = [
    {
      id: 'uebersicht',
      label: entityDetailTabLabel('uebersicht'),
      icon: 'list-details',
      count: positionenCount || undefined,
      render: () => (
        <div className="space-y-6">
          <PhaseCardsBlock
            kontext={projektKontext}
            fromRef={{ kind: 'rechnung', id: detail.id }}
          />
          <ZugehoerigListe
            kontext={projektKontext}
            fromRef={{ kind: 'rechnung', id: detail.id }}
          />
          {detailsInhalt}
          {vorgangFotos.length > 0 ? (
            <DetailSection title="Fotos">
              <VorgangFotosTab fotos={vorgangFotos} />
            </DetailSection>
          ) : null}
        </div>
      ),
    },
    {
      id: 'akte',
      label: entityDetailTabLabel('akte'),
      icon: 'files',
      render: () => (
        <VorgangAkteTab
          initialSegment={akteSegment}
          onSegmentChange={(s) => {
            setAkteSegment(s)
            const q = new URLSearchParams(searchParams.toString())
            q.set('tab', 'akte')
            q.set('segment', s)
            router.replace(`/rechnungen/${detail.id}?${q.toString()}`, { scroll: false })
          }}
          zahlung={
            <RechnungZahlplanTab
              auftragDetail={auftragDetail}
              rechnungen={auftragRechnungen}
              aktuelleRechnungId={detail.id}
            />
          }
          dateien={
            <div className="space-y-4">
              {dokumenteInhalt}
              {notizenInhalt}
            </div>
          }
          kunde={
            <div className="space-y-4">
              {stammdatenInhalt}
              <RechnungAuftragdetailsTab auftragDetail={auftragDetail} lead={lead} />
            </div>
          }
        />
      ),
    },
    {
      id: 'aktivitaet',
      label: entityDetailTabLabel('aktivitaet'),
      icon: 'history',
      count: timelineItems.length || undefined,
      render: () => (
        <div className="space-y-6">
          {verlaufInhalt}
          <ProjektHistorieTab kontext={projektKontext} />
        </div>
      ),
    },
  ]

  const crumbTitle = projektTitelAnzeige

  return (
    <EntityDetailLayout
      phase="rechnung"
      projektKontext={projektKontext}
      crumbBackHref="/vorgaenge?tab=rechnung"
      crumbBackLabel="Zurück zu Vorgängen"
      className="space-y-4 pb-0"
      head={{
        title: crumbTitle && crumbTitle !== '—' ? crumbTitle : kundeName,
        sub: headSub,
        badges: (
          <MockBadge kind={variantToMockBadgeKind(rechnungStatus.variant)}>
            {rechnungStatus.label}
          </MockBadge>
        ),
        meta: headMeta,
        actions: (
          <DetailActionsBar
            sheetTitle="Rechnung"
            primary={primaryAction}
            secondary={secondaryAction}
            menuItems={detailHeadMenuItems}
          />
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

      <Modal
        open={rechnungConfirm === 'gutschrift'}
        onClose={() => setRechnungConfirm(null)}
        title="Gutschrift anlegen?"
        size="sm"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setRechnungConfirm(null)}>
              Abbrechen
            </Button>
            <Button type="button" variant="primary" onClick={ausfuehrenGutschrift} disabled={pending}>
              Gutschrift erstellen
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-bw-text-muted">
          Es entsteht ein Gutschrift-Beleg (negative Beträge). Die Originalrechnung wird als
          storniert markiert.
        </p>
      </Modal>

      <Modal
        open={rechnungConfirm === 'korrigieren'}
        onClose={() => setRechnungConfirm(null)}
        title="Rechnung korrigieren?"
        size="sm"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setRechnungConfirm(null)}>
              Abbrechen
            </Button>
            <Button type="button" variant="primary" onClick={ausfuehrenKorrigieren} disabled={pending}>
              Fortfahren
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-bw-text-muted">
          Es wird eine Storno-Gutschrift erstellt und eine neue Rechnung mit neuer Nummer als
          Entwurf angelegt.
        </p>
      </Modal>
    </EntityDetailLayout>
  )
}
