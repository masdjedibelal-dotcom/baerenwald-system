'use client'
import { actionBusy, useTransition } from '@/components/ui/action-busy'

import { StatusBadge } from '@/components/ui/StatusBadge'
import { primaryCta } from '@/lib/vorgang/primary-cta'
import { gesendetDetailSubline, rechnungStatusDisplay } from '@/lib/status/status-display'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockCard } from '@/components/mock-ui/MockCard'
import { EntityDetailLayout } from '@/components/layout/EntityDetailLayout'
import { DetailActionsBar, type DetailActionDef } from '@/components/layout/DetailActionsBar'
import { PortalLoginIconButton } from '@/components/portal/PortalLoginIconButton'
import { DetailShell, type DetailShellGroup } from '@/components/mock-ui/DetailShell'
import { VorgangAkteTab } from '@/components/vorgang/VorgangAkteTab'
import { VorgangPhasenVerlauf } from '@/components/vorgang/VorgangPhasenVerlauf'
import { isLegacyDetailTabAlias } from '@/lib/vorgang/detail-tab-helpers'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { useDetailQuickActions } from '@/components/vorgang/DetailQuickActions'
import { ClientOnly } from '@/components/ui/ClientOnly'
import { RechnungWizard } from '@/components/rechnungen/RechnungWizard'
import {
  createGutschriftFromRechnung,
  nehmeRechnungStornoZurueck,
  sendRechnung,
  sendZahlungsbestaetigung,
  storniereRechnungOhneErsatz,
  updateRechnungStatus,
} from '@/app/(dashboard)/rechnungen/actions'
import { ZahlungserinnerungMailModal } from '@/components/rechnungen/ZahlungserinnerungMailModal'
import {
  loadRechnungWizardBootstrap,
  loadRechnungWizardBootstrapStandalone,
} from '@/app/(dashboard)/rechnungen/wizard-actions'
import { RechnungStammdatenCard } from '@/components/rechnungen/RechnungStammdatenCard'
import {
  buildRechnungPhaseSheetProps,
} from '@/components/rechnungen/RechnungDetailsTab'
import { LeistungenTab, leistungenFromAngebotPositionen } from '@/components/leistungen'
import { RechnungZahlplanTab } from '@/components/rechnungen/RechnungAuftragZahlplanTabs'
import { RechnungDokumenteTab } from '@/components/rechnungen/RechnungDokumenteTab'
import { AnfrageNotizenTab } from '@/components/anfragen/AnfrageNotizenTab'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { VerlaufPanel } from '@/components/crm/VerlaufPanel'
import {
  buildLeadVerlaufItems,
  buildRechnungMahnVerlaufItems,
  type RechnungMahnMailZeile,
} from '@/lib/crm/verlauf'
import { istGewerkBeschreibungPosition } from '@/lib/dokument-zeilen'
import { formatDatum } from '@/lib/utils'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { summenAusPositionen } from '@/lib/angebot-positionen'
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
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { toast } from '@/components/ui/app-toast'
import { HandwerkerBewertungModal } from '@/components/auftraege/HandwerkerBewertungModal'
import { loadHandwerkerBewertungZiele } from '@/app/(dashboard)/auftraege/handwerker-bewertung-actions'
import type { HandwerkerBewertungZiel } from '@/lib/handwerker/handwerker-aus-auftrag'
import { entityDetailTabLabel } from '@/lib/entity-detail/entity-detail-tabs'
import { angebotTitelOderSituationBereich } from '@/lib/vorgang/vorgang-anzeige-titel'
import { formatEurKurz } from '@/lib/vorgang/projekt-kontext-labels'
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

type RechnungDetailTab = 'uebersicht' | 'leistungen' | 'zahlung' | 'akte' | 'aktivitaet'

const RECHNUNG_DETAIL_TAB_IDS = new Set<RechnungDetailTab>([
  'uebersicht',
  'leistungen',
  'zahlung',
  'akte',
  'aktivitaet',
])
const RECHNUNG_DETAIL_DEFAULT_TAB: RechnungDetailTab = 'uebersicht'

function resolveRechnungDetailTabFromQuery(raw: string | null): RechnungDetailTab | null {
  const tab = (raw ?? '').trim().toLowerCase()
  if (!tab) return RECHNUNG_DETAIL_DEFAULT_TAB
  if (tab === 'zahlung' || tab === 'zahlplan' || tab === 'finanzen') return 'zahlung'
  if (tab === 'leistungen' || tab === 'leistung' || tab === 'positionen') return 'leistungen'
  if (
    tab === 'akte' ||
    tab === 'dokumente' ||
    tab === 'notizen'
  ) {
    return 'akte'
  }
  if (
    tab === 'uebersicht' ||
    tab === 'stammdaten' ||
    tab === 'auftragdetails' ||
    tab === 'auftrag' ||
    tab === 'auftrag-details' ||
    tab === 'details' ||
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
  return RECHNUNG_DETAIL_DEFAULT_TAB
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
  const [detail, setDetail] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardBootstrap, setWizardBootstrap] = useState<RechnungWizardBootstrap | null>(null)
  const [wizardKey, setWizardKey] = useState(0)
  const [mainTab, setMainTab] = useState<RechnungDetailTab>(RECHNUNG_DETAIL_DEFAULT_TAB)
  const [erinnerungModalOpen, setErinnerungModalOpen] = useState(false)
  const [bewertungOpen, setBewertungOpen] = useState(false)
  const [bewertungZiele, setBewertungZiele] = useState<HandwerkerBewertungZiel[]>([])
  const [rechnungConfirm, setRechnungConfirm] = useState<'gutschrift' | null>(null)

  useEffect(() => {
    setDetail(initial)
  }, [initial])

  useEffect(() => {
    const raw = searchParams.get('tab')
    if (isLegacyDetailTabAlias(raw) || raw === 'auftragdetails' || raw === 'zahlplan') {
      const resolved = resolveRechnungDetailTabFromQuery(raw) ?? RECHNUNG_DETAIL_DEFAULT_TAB
      const q = new URLSearchParams(searchParams.toString())
      q.set('tab', resolved)
      q.delete('segment')
      router.replace(`/rechnungen/${detail.id}?${q.toString()}`, { scroll: false })
      return
    }
    const tab = resolveRechnungDetailTabFromQuery(raw)
    if (tab) setMainTab(tab)
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

  const zahlungszielFallback = Math.max(
    1,
    parseInt(firm?.zahlungsziel_tage ?? '', 10) || defaultZahlungszielTage(detail.kunden?.typ)
  )

  const pdfHref = detail.pdf_url?.trim() || `/api/rechnungen/${detail.id}/pdf`

  const positionenCount = useMemo(
    () => pos.filter((p) => !istGewerkBeschreibungPosition(p)).length,
    [pos]
  )

  const leadId = lead?.id ?? projektKontext?.lead?.id ?? null
  const notizenRows: LeadNotizRow[] = lead?.lead_notizen ?? []
  const dokumenteRows = lead?.lead_dokumente ?? []
  const kundeTel =
    detail.kunden?.telefon?.trim() || lead?.kontakt_telefon?.trim() || ''
  const { quickBar, sheets: quickActionSheets } = useDetailQuickActions({
    telefon: kundeTel,
    email: kundeEmail,
    notiz: leadId ? { kind: 'lead', leadId } : null,
    dokument: leadId ? { kind: 'lead', leadId } : null,
    onSaved: () => refresh(),
  })

  const timelineItems = useMemo(() => {
    const base = buildLeadVerlaufItems(timelineInitial ?? [], {
      fallbackCreatedAt: detail.created_at,
      fallbackCreatedLabel: `Rechnung angelegt${detail.rechnungsnummer?.trim() ? ` — ${detail.rechnungsnummer.trim()}` : ''}`,
    })

    const mapped = base.map((item) => {
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

    const mahn =
      belegTyp === 'rechnung'
        ? buildRechnungMahnVerlaufItems(detail, mahnMails)
        : []

    return [...mapped, ...mahn].sort((a, b) => a.ts - b.ts)
  }, [timelineInitial, detail, belegTyp, mahnMails])

  async function setStatus(s: RechnungStatus, opts?: { notifyKunde?: boolean }) {
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
    openWizard()
  }

  function handleSenden() {
    void actionBusy.run('Wird gesendet…', async () => {
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

  const primaryAction = useMemo((): DetailActionDef | null => {
    const cta = primaryCta('rechnung', detail.status, { ueberfaellig })
    if (cta?.id === 'rechnung_versenden') {
      return { label: cta.label, icon: cta.icon, onClick: handleSenden, disabled: pending }
    }
    if (cta?.id === 'als_bezahlt' && belegTyp === 'rechnung') {
      return {
        label: cta.label,
        icon: cta.icon,
        onClick: () => {
          void actionBusy.run('Wird als bezahlt markiert…', async () => {
            await setStatus('bezahlt', { notifyKunde: Boolean(kundeEmail) })
          })
        },
        disabled: pending,
      }
    }
    if (cta?.id === 'bewertung_einholen') {
      return {
        label: cta.label,
        icon: cta.icon,
        onClick: () => {
          const auftragId = detail.auftrag_id?.trim()
          if (!auftragId) {
            toast.error('Keine Auftragsverknüpfung für Bewertung.')
            return
          }
          startTransition(async () => {
            const r = await loadHandwerkerBewertungZiele(auftragId)
            if (!r.ok) {
              toast.error(r.message)
              return
            }
            setBewertungZiele(r.ziele)
            setBewertungOpen(true)
          })
        },
      }
    }
    return null
  }, [
    detail.status,
    detail.auftrag_id,
    ueberfaellig,
    pending,
    handleSenden,
    belegTyp,
    kundeEmail,
  ])

  const secondaryAction = useMemo((): DetailActionDef | null => {
    if (rechnungKorrekturModus(detail.status) === 'gesperrt') return null
    return {
      label: 'Rechnung bearbeiten',
      icon: 'pencil',
      onClick: handleKorrigieren,
      disabled: pending,
    }
  }, [detail.status, pending])

  const projektTitelAnzeige = rechnungTitelMeta(detail, belegTyp, lead)
  const rechnungStatus = rechnungStatusDisplay(detail.status, { ueberfaellig })
  const headMeta = useMemo(() => {
    const parts: string[] = []
    if (projektTitelAnzeige && projektTitelAnzeige !== '—') parts.push(projektTitelAnzeige)
    if (detail.brutto != null) parts.push(formatEurBetrag(detail.brutto))
    if (detail.faellig_am) parts.push(`fällig ${formatDatum(detail.faellig_am)}`)
    return parts.join(' · ')
  }, [projektTitelAnzeige, detail.brutto, detail.faellig_am])
  const headSub =
    detail.status === 'gesendet'
      ? gesendetDetailSubline(detail.gesendet_at, detail.updated_at)
      : undefined

  const stammdatenInhalt = (
    <RechnungStammdatenCard detail={detail} lead={lead} onSaved={() => refresh()} />
  )

  const artKurz = (() => {
    const art = String(
      (detail as { rechnung_art?: string | null }).rechnung_art ?? ''
    ).toLowerCase()
    if (belegTyp === 'gutschrift') return RECHNUNG_BELEG_TYP_LABELS.gutschrift
    if (art === 'schluss') return 'Schlussrechnung'
    if (art === 'abschlag') return 'Abschlag'
    const blob = `${detail.rechnungsnummer ?? ''} ${detail.auftraege?.titel ?? ''}`.toLowerCase()
    if (/schluss/.test(blob)) return 'Schlussrechnung'
    if (/abschlag|anzahlung|teilrechnung/.test(blob)) return 'Abschlag'
    return RECHNUNG_BELEG_TYP_LABELS.rechnung
  })()

  const phasenExtras = useMemo(() => {
    const faelligTxt = detail.faellig_am ? `fällig ${formatDatum(detail.faellig_am)}` : null
    const kopf = faelligTxt ? `${artKurz} - ${faelligTxt}` : artKurz
    const sub = detail.bezahlt_at
      ? `bezahlt am ${formatDatum(detail.bezahlt_at.slice(0, 10))}`
      : ueberfaellig
        ? 'überfällig'
        : detail.status === 'gesendet'
          ? 'gestellt'
          : undefined
    return {
      rechnung: {
        kopf,
        sub,
        betrag: detail.brutto != null ? formatEurKurz(detail.brutto) : null,
        sheetCrumb: detail.rechnungsnummer?.trim()
          ? `${detail.rechnungsnummer.trim()} >`
          : null,
        sheetTitle: 'Rechnung',
        props: buildRechnungPhaseSheetProps(detail, {
          zahlungszielFallback,
          statusLabel: rechnungStatus.label,
        }),
      },
    }
  }, [
    detail,
    artKurz,
    ueberfaellig,
    zahlungszielFallback,
    rechnungStatus.label,
  ])

  const uebersichtInhalt = (
    <div className="space-y-6">
      {stammdatenInhalt}
      <VorgangPhasenVerlauf
        kontext={projektKontext}
        fromRef={{ kind: 'rechnung', id: detail.id }}
        lead={lead}
        extras={phasenExtras}
        onSaved={() => refresh()}
      />
    </div>
  )

  const leistungenInhalt = (() => {
    const pos = normalizeAngebotPositionen(detail.positionen ?? []).filter(
      (p) => !istGewerkBeschreibungPosition(p)
    )
    const mwstSatz =
      detail.mwst_satz != null && Number.isFinite(Number(detail.mwst_satz))
        ? Number(detail.mwst_satz)
        : 19
    const summen = summenAusPositionen(pos, mwstSatz)
    const netto =
      detail.netto != null && Number.isFinite(Number(detail.netto))
        ? Number(detail.netto)
        : summen.nettoMin
    const mwstBetrag =
      detail.mwst_betrag != null && Number.isFinite(Number(detail.mwst_betrag))
        ? Number(detail.mwst_betrag)
        : summen.mwstBetragMin
    const brutto =
      detail.brutto != null && Number.isFinite(Number(detail.brutto))
        ? Number(detail.brutto)
        : netto + mwstBetrag
    return (
      <LeistungenTab
        phase="rechnung"
        rows={leistungenFromAngebotPositionen(
          pos,
          {
            status:
              detail.status === 'bezahlt'
                ? 'bezahlt'
                : detail.status === 'gesendet'
                  ? 'gestellt'
                  : 'entwurf',
            statusLabel:
              detail.status === 'bezahlt'
                ? 'Bezahlt'
                : detail.status === 'gesendet'
                  ? 'Gestellt'
                  : 'Entwurf',
          },
          { eigenleistungSubline: true }
        )}
        groupByGewerk
        footerNettoMwst={{ netto, mwstSatz, mwstBetrag, brutto }}
        emptyHint="Noch keine Positionen — über „Rechnung bearbeiten“ anlegen."
      />
    )
  })()

  const verlaufInhalt = <VerlaufPanel items={timelineItems} />

  const dokumenteInhalt = (
    <RechnungDokumenteTab
      detail={detail}
      leadId={leadId}
      dokumente={dokumenteRows}
      rechnungen={auftragRechnungen}
      onReload={() => refresh()}
    />
  )

  const notizenInhalt = leadId ? (
    <AnfrageNotizenTab leadId={leadId} notizen={notizenRows} onReload={() => refresh()} />
  ) : (
    <MockCard title="Notizen" icon="messages">
      <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-4)', padding: '4px 0' }}>
        Noch keine Notizen — verknüpfe eine Anfrage oder lege später welche an.
      </div>
    </MockCard>
  )

  const detailShellGroups: DetailShellGroup[] = [
    {
      id: 'uebersicht',
      label: entityDetailTabLabel('uebersicht'),
      icon: 'list-details',
      render: () => uebersichtInhalt,
    },
    {
      id: 'leistungen',
      label: entityDetailTabLabel('leistungen'),
      icon: 'tool',
      count: positionenCount || undefined,
      render: () => <div className="space-y-6">{leistungenInhalt}</div>,
    },
    {
      id: 'zahlung',
      label: entityDetailTabLabel('zahlung'),
      icon: 'receipt',
      render: () => (
        <RechnungZahlplanTab
          detail={detail}
          auftragDetail={auftragDetail}
          rechnungen={auftragRechnungen}
          fallbackTitel={projektTitelAnzeige}
          onEditInvoice={(rechnungId) => {
            startTransition(async () => {
              const res = detail.auftrag_id
                ? await loadRechnungWizardBootstrap(rechnungId, detail.auftrag_id)
                : await loadRechnungWizardBootstrapStandalone(rechnungId)
              if (!res.ok) {
                toast.error(res.message)
                return
              }
              setWizardBootstrap(res.bootstrap)
              setWizardKey((k) => k + 1)
              setWizardOpen(true)
            })
          }}
          onOpenWizard={(bootstrap) => {
            setWizardBootstrap(bootstrap)
            setWizardKey((k) => k + 1)
            setWizardOpen(true)
          }}
          onRefresh={() => refresh()}
        />
      ),
    },
    {
      id: 'akte',
      label: entityDetailTabLabel('akte'),
      icon: 'files',
      render: () => (
        <VorgangAkteTab
          dateien={dokumenteInhalt}
          notizen={notizenInhalt}
        />
      ),
    },
    {
      id: 'aktivitaet',
      label: entityDetailTabLabel('aktivitaet'),
      icon: 'history',
      count: timelineItems.length || undefined,
      render: () => verlaufInhalt,
    },
  ]

  const crumbTitle = projektTitelAnzeige

  return (
    <EntityDetailLayout
      phase="rechnung"
      projektKontext={projektKontext}
      crumbBackHref="/vorgaenge?tab=rechnung&lifecycle=offen"
      crumbBackLabel="Zurück zu den Suchergebnissen"
      crumbSectionLabel="Rechnungen"
      breadcrumbTitle={crumbTitle}
      className="space-y-4 pb-0"
      wiedervorlageDatum={detail.wiedervorlage_datum}
      wiedervorlageNotiz={detail.wiedervorlage_notiz}
      wiedervorlageEntity="rechnung"
      wiedervorlageEntityId={detail.id}
      onWiedervorlageSaved={() => refresh()}
      quickBar={quickBar}
      head={{
        title: kundeName,
        sub: headSub,
        badges: (
          <StatusBadge
            status={ueberfaellig ? 'ueberfaellig' : detail.status}
            label={rechnungStatus.label}
          />
        ),
        meta: headMeta,
        titleTrailing: (
          <PortalLoginIconButton kundeId={detail.kunde_id} label="Kundenportal öffnen" />
        ),
        actions: (
          <DetailActionsBar
            sheetTitle="Rechnung"
            primary={primaryAction}
            secondary={secondaryAction}
            menuItems={[]}
          />
        ),
      }}
    >
      <DetailShell
        groups={detailShellGroups}
        value={mainTab}
        onChange={(id) => setMainTab(id as RechnungDetailTab)}
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

      {detail.auftrag_id ? (
        <HandwerkerBewertungModal
          open={bewertungOpen}
          onClose={() => setBewertungOpen(false)}
          auftragId={detail.auftrag_id}
          ziele={bewertungZiele}
          onSaved={() => refresh()}
        />
      ) : null}

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

      {quickActionSheets}

      <Modal
        open={rechnungConfirm === 'gutschrift'}
        onClose={() => setRechnungConfirm(null)}
        title="Gutschrift anlegen?"
        size="sm"
        footer={
          <div className="kunde-create-footer">
            <Button type="button" variant="secondary" onClick={() => setRechnungConfirm(null)}>
              Abbrechen
            </Button>
            <Button type="button" variant="primary" onClick={ausfuehrenGutschrift} disabled={pending}>
              Gutschrift erstellen
            </Button>
          </div>
        }
      >
        <p className="text-[length:var(--fs-text)] text-bw-text-muted">
          Es entsteht ein Gutschrift-Beleg (negative Beträge). Die Originalrechnung wird als
          storniert markiert.
        </p>
      </Modal>
    </EntityDetailLayout>
  )
}
