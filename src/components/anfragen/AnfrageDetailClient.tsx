'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Sparkles } from 'lucide-react'
import { MockIcon, mockMenuIcon } from '@/components/mock-ui/MockIcon'
import { DetailHead } from '@/components/layout/DetailHead'
import { ProjektKette } from '@/components/crm/ProjektKette'
import { DetailShell, type DetailShellGroup } from '@/components/mock-ui/DetailShell'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { LeadNaechsteSchritteCard, buildLeadNaechsteSchritte } from '@/components/anfragen/LeadNaechsteSchritteCard'
import {
  dedupeKalenderTermineAnzeige,
  normalizeKalenderTermineList,
} from '@/lib/anfragen/normalize-kalender-termine'
import { istLeadTerminAnzeige } from '@/lib/kalender-internes-todo'
import { leadAngebotFunnelFromListe } from '@/lib/lead-angebot-funnel'
import {
  isEchterFreitext,
  leadKontaktAnzeigeName,
  resolveLeadKunde,
} from '@/lib/lead-display-helpers'
import { istKundeGewerbeTyp } from '@/lib/kunde-stammdaten'
import { Timeline } from '@/components/ui/timeline'
import { EmailLogPreviewModal } from '@/components/email/EmailLogPreviewModal'
import { sortTimelineByCreatedAtAsc } from '@/lib/timeline-sort'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { anfrageStatusDisplay } from '@/lib/status/status-display'
import { StatusModal, type StatusModalKind } from '@/components/anfragen/StatusModal'
import { ActionsMenu, type ActionsMenuItem } from '@/components/ui/actions-menu'
import { KommunikationCard } from '@/components/kommunikation/KommunikationCard'
import { useKundenMailCompose } from '@/components/kommunikation/useKundenMailCompose'
import { mailComposeContextFromLead } from '@/app/(dashboard)/kommunikation/actions'
import { LeadFunnelProjektAnzeige } from '@/components/anfragen/LeadFunnelProjektAnzeige'
import { LeadOrgKontextBlock } from '@/components/anfragen/LeadOrgKontextBlock'
import { LeadGptStudioBlock, leadHatKiVertriebsDaten } from '@/components/anfragen/LeadGptStudioBlock'
import { LeadNotizenListeTab } from '@/components/anfragen/AnfrageLeadTabsShared'
import { LeadTermineCard } from '@/components/anfragen/LeadTermineCard'
import { AnfrageDokumenteTab } from '@/components/anfragen/AnfrageDokumenteTab'
import { AngebotAuswahlModal } from '@/components/angebote/AngebotAuswahlModal'
import type { AngebotWizardBootstrap } from '@/lib/angebote/angebot-wizard-types'
import { AnfrageNeuSheet } from '@/components/anfragen/AnfrageNeuSheet'
import { KundenStammdatenCard } from '@/components/kunden/KundenStammdatenCard'
import { resolveAngebotKundeTyp } from '@/lib/angebote/angebot-wizard-types'
import { KundenObjekteCard } from '@/components/kunden/KundenObjekteCard'
import { fetchKundenObjekte, setLeadKundeObjekt } from '@/app/actions/kunden-objekte'
import { leadSituationDisplay } from '@/lib/lead-funnel-daten'
import { bereicheFuerAnzeige } from '@/lib/lead-gewerbe-storage'

const AngebotWizard = dynamic(
  () =>
    import('@/components/angebote/AngebotWizard').then((mod) => ({
      default: mod.AngebotWizard,
    })),
  { ssr: false }
)

const KundeModal = dynamic(
  () =>
    import('@/components/kunden/KundeModal').then((mod) => ({
      default: mod.KundeModal,
    })),
  { ssr: false }
)
import { toast } from '@/components/ui/app-toast'
import { deleteAnfrage, weiterfuehrenAlsProjekt } from '@/app/(dashboard)/anfragen/actions'
import { useIsCrmAdmin } from '@/hooks/useIsCrmAdmin'
import { openMieterStatusPreview } from '@/app/(dashboard)/impersonation/actions'
import { ACTIVITY_SECTIONS, CTA } from '@/lib/crm-labels'
import { loadAngebotWizardBootstrap, loadAngebotWizardBootstrapKopie } from '@/app/(dashboard)/angebote/wizard-actions'
import { findeNeuestenEntwurf, hatNurEntwuerfe } from '@/lib/angebote/angebot-lebenszyklus'
import { ergaenzeTimelineMitProjektKontext } from '@/lib/crm/build-projekt-timeline'
import type { ProjektKontext } from '@/lib/crm/projekt-kontext-types'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type {
  Gewerk,
  Handwerker,
  KalenderTermin,
  KundenObjekt,
  LeadDetail,
  LeadNotizRow,
  Preisliste,
} from '@/lib/types'
import {
  BEREICH_LABELS,
  STATUS_LABELS,
  formatDatum,
  formatDatumZeit,
  formatRelativeDate,
} from '@/lib/utils'

type AnfrageDetailTab = 'stammdaten' | 'details' | 'verlauf' | 'dokumente' | 'notizen'

const ANFRAGE_DETAIL_TAB_IDS = new Set<AnfrageDetailTab>([
  'stammdaten',
  'details',
  'verlauf',
  'dokumente',
  'notizen',
])

/** Query-/Hash-/Deep-Link-Aliase auf stabile interne IDs. */
function resolveAnfrageDetailTabFromQuery(raw: string | null): AnfrageDetailTab | null {
  const tab = (raw ?? '').trim().toLowerCase().replace(/^#/, '')
  if (!tab) return null
  if (tab === 'schritte' || tab === 'naechste-schritte' || tab === 'naechste_schritte') {
    return 'stammdaten'
  }
  if (tab === 'projekt') return 'details'
  if (tab === 'timeline') return 'verlauf'
  if (ANFRAGE_DETAIL_TAB_IDS.has(tab as AnfrageDetailTab)) return tab as AnfrageDetailTab
  return null
}

function kundenName(lead: LeadDetail) {
  return leadKontaktAnzeigeName(lead)
}

function leadProjektMetaLabel(lead: LeadDetail): string {
  const bereiche = bereicheFuerAnzeige(lead.bereiche, lead.situation)
  if (bereiche.length) {
    return bereiche.map((b) => BEREICH_LABELS[b] ?? b).join(', ')
  }
  const sit = leadSituationDisplay(lead.situation)
  if (sit) return sit
  return 'Anfrage'
}

type AngebotKurz = {
  id: string
  status: string
  status_einfach?: string | null
  gesamt_fix?: number | null
  gesamt_min: number | null
  gesamt_max: number | null
  created_at: string
  angebotsnr?: string | null
  pdf_url?: string | null
}

type AnfrageAngebotFlowSnapshot = {
  angebotId: string
  angebotHref: string
  handwerkerErledigt: boolean
  angebotAnKundeGesendet: boolean
}

export function AnfrageDetailClient({
  lead: initial,
  angeboteListe = [],
  wizardGewerke = [],
  wizardPreislisten = [],
  wizardFirm,
  wizardHandwerker = [],
  kundenObjekte = [],
  angebotKopieVonQuelleId,
  angebotFlowSnapshot = null,
  angeboteAuswahlInitial = false,
  angebotWizardInitial = false,
  projektKontext,
  dbAuftragId = null,
}: {
  lead: LeadDetail
  angeboteListe?: AngebotKurz[]
  wizardGewerke?: Gewerk[]
  wizardPreislisten?: Preisliste[]
  wizardFirm?: FirmenEinstellungen
  wizardHandwerker?: Handwerker[]
  kundenObjekte?: KundenObjekt[]
  /** Server: beim Aufruf mit ?angebot_kopie_von= wird der Wizard als 1:1-Kopie geöffnet. */
  angebotKopieVonQuelleId?: string
  angebotFlowSnapshot?: AnfrageAngebotFlowSnapshot | null
  /** z. B. Redirect von /anfragen/[id]/angebote — Modal sofort öffnen */
  angeboteAuswahlInitial?: boolean
  /** z. B. nach Kunden-Aktion oder ?ziel=angebot — Wizard sofort öffnen */
  angebotWizardInitial?: boolean
  projektKontext?: ProjektKontext
  dbAuftragId?: string | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refresh, generation } = useCrmRefresh()
  const [lead, setLead] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [statusModalKind, setStatusModalKind] = useState<StatusModalKind | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [angebotWizardOpen, setAngebotWizardOpen] = useState(false)
  const [angebotWizardBootstrap, setAngebotWizardBootstrap] =
    useState<AngebotWizardBootstrap | null>(null)
  const [wizardSessionKey, setWizardSessionKey] = useState(0)
  const kopieQueryHandledRef = useRef(false)
  const [bearbeitenOpen, setBearbeitenOpen] = useState(false)
  const [angebotAuswahlOpen, setAngebotAuswahlOpen] = useState(angeboteAuswahlInitial)

  const [tab, setTab] = useState<AnfrageDetailTab>('stammdaten')
  const [stammdatenModalOpen, setStammdatenModalOpen] = useState(false)
  const [objekteListe, setObjekteListe] = useState<KundenObjekt[]>(kundenObjekte)
  const isCrmAdmin = useIsCrmAdmin()
  const [impersonating, setImpersonating] = useState(false)

  useEffect(() => {
    const fromQuery = resolveAnfrageDetailTabFromQuery(searchParams.get('tab'))
    if (fromQuery) {
      setTab(fromQuery)
      return
    }
    if (typeof window !== 'undefined') {
      const fromHash = resolveAnfrageDetailTabFromQuery(window.location.hash)
      if (fromHash) setTab(fromHash)
    }
  }, [searchParams])

  const kunde = useMemo(() => resolveLeadKunde(lead.kunden), [lead.kunden])
  const kundeTypFuerObjekte = resolveAngebotKundeTyp(kunde?.typ, lead.kundentyp)
  const kundeIdFuerObjekte = kunde?.id ?? lead.kunde_id ?? ''
  const zeigeObjekteCard =
    Boolean(kundeIdFuerObjekte) && istKundeGewerbeTyp(kundeTypFuerObjekte)

  useEffect(() => {
    setLead(initial)
  }, [initial.id])

  useEffect(() => {
    if (!zeigeObjekteCard || !kundeIdFuerObjekte) {
      setObjekteListe([])
      return
    }
    let cancelled = false
    void fetchKundenObjekte(kundeIdFuerObjekte).then((rows) => {
      if (!cancelled) setObjekteListe(rows)
    })
    return () => {
      cancelled = true
    }
  }, [zeigeObjekteCard, kundeIdFuerObjekte])

  function waehleLeadObjekt(objektId: string | null) {
    setLead((l) => ({ ...l, kunde_objekt_id: objektId }))
    startTransition(async () => {
      const r = await setLeadKundeObjekt(lead.id, objektId)
      if (!r.ok) toast.error(r.message)
    })
  }

  const [emailPreviewId, setEmailPreviewId] = useState<string | null>(null)

  const history = sortTimelineByCreatedAtAsc(lead.leads_status_history ?? [])

  const leadStatusData = useMemo(() => {
    const fd = lead.funnel_daten
    const rec = typeof fd === 'object' && fd !== null ? (fd as Record<string, unknown>) : {}
    const funnelAngebotId = typeof rec.angebot_id === 'string' ? rec.angebot_id : undefined
    const funnelAuftragId = typeof rec.auftrag_id === 'string' ? rec.auftrag_id : undefined
    const auftragId = dbAuftragId ?? funnelAuftragId
    const angeboteQuelle =
      angeboteListe.length > 0
        ? angeboteListe
        : Array.isArray(lead.angebote)
          ? lead.angebote
          : []
    const funnel = leadAngebotFunnelFromListe(angeboteQuelle, funnelAngebotId)
    return {
      ...funnel,
      auftrag_href: auftragId ? `/auftraege/${auftragId}` : undefined,
      auftrag_id: auftragId,
      abgeschlossen_datum: lead.status === 'abgeschlossen' ? formatDatum(lead.updated_at) : undefined,
    }
  }, [lead.funnel_daten, lead.status, lead.updated_at, lead.angebote, angeboteListe, dbAuftragId])

  const timelineSorted = useMemo(
    () => sortTimelineByCreatedAtAsc(lead.lead_timeline ?? []),
    [lead.lead_timeline]
  )

  const notizenRows = useMemo(() => {
    const raw = lead.lead_notizen
    if (!Array.isArray(raw)) return [] as LeadNotizRow[]
    return [...raw].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [lead.lead_notizen])

  const timelineItems = useMemo(() => {
    const fromEvents = timelineSorted.map((ev) => ({
      id: ev.id,
      text: ev.beschreibung ? `${ev.titel} — ${ev.beschreibung}` : ev.titel,
      time: formatRelativeDate(ev.created_at),
      state: 'done' as const,
      ts: new Date(ev.created_at).getTime(),
      linkLabel: ev.email_log_id ? 'E-Mail ansehen' : undefined,
      onLinkClick: ev.email_log_id ? () => setEmailPreviewId(ev.email_log_id!) : undefined,
    }))
    const fromHistory = history.map((h) => ({
      id: h.id,
      text:
        h.status_alt != null
          ? `Status: ${STATUS_LABELS[h.status_alt]} → ${STATUS_LABELS[h.status_neu]}`
          : `Status: ${STATUS_LABELS[h.status_neu]}`,
      time: formatDatumZeit(h.created_at),
      state: 'active' as const,
      ts: new Date(h.created_at).getTime(),
    }))
    const basis = [...fromEvents, ...fromHistory]
      .sort((a, b) => a.ts - b.ts)
      .map((item) => ({
        text: item.text,
        time: item.time,
        state: item.state,
        id: item.id,
        ts: item.ts,
        linkLabel: 'linkLabel' in item ? item.linkLabel : undefined,
        onLinkClick: 'onLinkClick' in item ? item.onLinkClick : undefined,
      }))
    if (!projektKontext) {
      return basis.map(({ ts: _ts, ...rest }) => rest)
    }
    const merged = ergaenzeTimelineMitProjektKontext(
      basis.map((b) => ({
        id: b.id,
        ts: b.ts,
        text: b.text,
        time: b.time,
        state: b.state,
        linkLabel: b.linkLabel,
      })),
      projektKontext
    )
    return merged.map((item) => ({
      text: item.text,
      time: item.time,
      state: item.state,
      id: item.id,
      linkLabel: item.linkLabel,
      onLinkClick: item.href ? () => router.push(item.href!) : undefined,
    }))
  }, [timelineSorted, history, projektKontext, router])

  const dokumenteRows = useMemo(() => {
    const raw = lead.lead_dokumente
    if (!Array.isArray(raw)) return []
    return [...raw].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [lead.lead_dokumente])

  const dokumenteCount = useMemo(
    () => dokumenteRows.length + angeboteListe.length,
    [dokumenteRows.length, angeboteListe.length]
  )

  const stammdatenCard = (
    <KundenStammdatenCard
      kunde={kunde}
      collapsible={false}
      fallback={{
        plz: lead.plz,
        kontakt_name: lead.kontakt_name,
        kontakt_email: lead.kontakt_email,
        kontakt_telefon: lead.kontakt_telefon,
        funnel_daten: lead.funnel_daten,
      }}
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
  const leadEmail = lead.kunden?.email ?? lead.kontakt_email ?? null
  const leadTelefon = (lead.kunden?.telefon ?? lead.kontakt_telefon ?? '').trim()
  const auftragId = leadStatusData.auftrag_id as string | undefined
  const mailCompose = useKundenMailCompose({ onSent: () => refresh() })

  const openAngebotWizard = useCallback((bootstrap: AngebotWizardBootstrap | null) => {
    setAngebotWizardBootstrap(bootstrap)
    setWizardSessionKey((k) => k + 1)
    setAngebotWizardOpen(true)
  }, [])

  useEffect(() => {
    const kopieId = angebotKopieVonQuelleId?.trim()
    if (!kopieId) {
      kopieQueryHandledRef.current = false
      return
    }
    if (kopieQueryHandledRef.current) return
    kopieQueryHandledRef.current = true
    const lid = lead.id
    let cancelled = false
    void (async () => {
      const res = await loadAngebotWizardBootstrapKopie(kopieId, lid)
      if (cancelled) return
      if (!res.ok) {
        toast.error(res.message)
        router.replace(`/anfragen/${lid}`, { scroll: false })
        return
      }
      openAngebotWizard(res.bootstrap)
      router.replace(`/anfragen/${lid}`, { scroll: false })
      refresh()
    })()
    return () => {
      cancelled = true
    }
  }, [angebotKopieVonQuelleId, lead.id, openAngebotWizard, router])

  const angebotWizardQueryHandledRef = useRef(false)
  useEffect(() => {
    if (!angebotWizardInitial) {
      angebotWizardQueryHandledRef.current = false
      return
    }
    if (angebotWizardQueryHandledRef.current) return
    angebotWizardQueryHandledRef.current = true
    openAngebotWizard(null)
    router.replace(`/anfragen/${lead.id}`, { scroll: false })
  }, [angebotWizardInitial, lead.id, openAngebotWizard, router])

  const hasAngebote = angeboteListe.length > 0

  const openAngebotAuswahl = useCallback(() => {
    if (angeboteListe.length === 0) {
      openAngebotWizard(null)
      return
    }
    const entwurf = findeNeuestenEntwurf(angeboteListe)
    if (entwurf && hatNurEntwuerfe(angeboteListe)) {
      startTransition(async () => {
        const res = await loadAngebotWizardBootstrap(entwurf.id, lead.id)
        if (res.ok) {
          openAngebotWizard(res.bootstrap)
          return
        }
        toast.error(res.message)
        setAngebotAuswahlOpen(true)
      })
      return
    }
    setAngebotAuswahlOpen(true)
  }, [angeboteListe, lead.id, openAngebotWizard, startTransition])

  const openAngebotErstellen = openAngebotAuswahl

  const openHandwerkerEinholen = useCallback(() => {
    const href = angebotFlowSnapshot?.angebotHref ?? (angeboteListe[0] ? `/angebote/${angeboteListe[0].id}` : null)
    if (href) router.push(`${href}#angebot-versand-handwerker`)
    else openAngebotWizard(null)
  }, [angebotFlowSnapshot?.angebotHref, angeboteListe, openAngebotWizard, router])

  const openAngebotAnKunde = useCallback(() => {
    const href = angebotFlowSnapshot?.angebotHref ?? (angeboteListe[0] ? `/angebote/${angeboteListe[0].id}` : null)
    if (href) router.push(`${href}#angebot-versand-kunde`)
  }, [angebotFlowSnapshot?.angebotHref, angeboteListe, router])

  const primaryCtaLabel = useMemo(() => {
    if (!hasAngebote) return CTA.angebotErstellen
    if (!angebotFlowSnapshot?.handwerkerErledigt) return 'Handwerker einholen'
    if (!angebotFlowSnapshot?.angebotAnKundeGesendet) return 'An Kunden senden'
    return CTA.angeboteOeffnen
  }, [hasAngebote, angebotFlowSnapshot])

  const primaryCtaAction = useCallback(() => {
    if (!hasAngebote) {
      openAngebotErstellen()
      return
    }
    if (!angebotFlowSnapshot?.handwerkerErledigt) {
      openHandwerkerEinholen()
      return
    }
    if (!angebotFlowSnapshot?.angebotAnKundeGesendet) {
      openAngebotAnKunde()
      return
    }
    openAngebotErstellen()
  }, [
    hasAngebote,
    angebotFlowSnapshot,
    openAngebotErstellen,
    openHandwerkerEinholen,
    openAngebotAnKunde,
  ])

  const closeAngebotWizard = useCallback(() => {
    setAngebotWizardOpen(false)
    setAngebotWizardBootstrap(null)
  }, [])

  const hatTermin = useMemo(() => {
    const unique = dedupeKalenderTermineAnzeige(
      normalizeKalenderTermineList(lead.kalender_termine as KalenderTermin[] | null | undefined)
    ).filter(istLeadTerminAnzeige)
    return unique.length > 0
  }, [lead.kalender_termine])

  const naechsteSchritte = useMemo(
    () =>
      buildLeadNaechsteSchritte({
        hatTermin,
        handwerkerErledigt: angebotFlowSnapshot?.handwerkerErledigt ?? false,
        angebotAnKundeGesendet: angebotFlowSnapshot?.angebotAnKundeGesendet ?? false,
        angebotHref:
          angebotFlowSnapshot?.angebotHref ??
          (angeboteListe[0] ? `/angebote/${angeboteListe[0].id}` : undefined),
        onTerminClick: () => setStatusModalKind('termin'),
        onHandwerkerEinholen: openHandwerkerEinholen,
        onAngebotAnKunde: openAngebotAnKunde,
      }),
    [
      angeboteListe,
      hatTermin,
      angebotFlowSnapshot,
      openHandwerkerEinholen,
      openAngebotAnKunde,
    ]
  )

  const detailHeadMenuItems = useMemo((): ActionsMenuItem[] => {
    const items: ActionsMenuItem[] = [
      {
        label: 'Bearbeiten',
        icon: mockMenuIcon('pencil'),
        onClick: () => setBearbeitenOpen(true),
      },
      'sep',
      {
        label: 'Termin vereinbart',
        icon: mockMenuIcon('calendar-event'),
        onClick: () => setStatusModalKind('termin'),
      },
      {
        label: 'Rückfrage',
        icon: mockMenuIcon('help'),
        onClick: () => setStatusModalKind('rueckfrage'),
      },
      {
        label: 'Als verloren markieren',
        icon: mockMenuIcon('circle-x'),
        danger: true,
        onClick: () => setStatusModalKind('verloren'),
      },
    ]

    if (lead.anlass === 'meldung') {
      items.push({
        label: 'Als Projekt weiterführen',
        icon: mockMenuIcon('briefcase'),
        onClick: () => {
          startTransition(async () => {
            const r = await weiterfuehrenAlsProjekt(lead.id)
            if (!r.ok) {
              toast.error(r.message)
              return
            }
            toast.success('Projekt-Anfrage angelegt')
            router.push(`/anfragen/${r.id}`)
          })
        },
      })
    }

    items.push({
      label: 'Angebot erstellen',
      icon: mockMenuIcon('file-invoice'),
      onClick: () => openAngebotErstellen(),
    })

    items.push('sep', {
      label: 'Mail schreiben',
      icon: mockMenuIcon('mail'),
      hint: leadEmail?.trim() ? undefined : 'E-Mail im Modal eintragen',
      onClick: () => mailCompose.openCompose(() => mailComposeContextFromLead(lead.id)),
    })

    if (leadTelefon) {
      items.push({
        label: 'Anrufen',
        icon: mockMenuIcon('phone'),
        onClick: () => {
          window.location.href = `tel:${leadTelefon.replace(/\s/g, '')}`
        },
      })
    }

    items.push(
      'sep',
      {
        label: 'Anfrage löschen',
        icon: mockMenuIcon('trash'),
        danger: true,
        onClick: () => setDeleteConfirmOpen(true),
      }
    )

    if (isCrmAdmin) {
      items.push('sep', {
        label: 'Mieter-Ansicht öffnen',
        icon: mockMenuIcon('external-link'),
        hint: impersonating ? 'Öffne…' : undefined,
        onClick: () => {
          if (impersonating) return
          setImpersonating(true)
          void openMieterStatusPreview(lead.id).then((r) => {
            setImpersonating(false)
            if (!r.ok) {
              toast.error(r.message)
              return
            }
            window.open(r.url, '_blank', 'noopener,noreferrer')
          })
        },
      })
    }

    return items
  }, [
    lead.id,
    lead.anlass,
    leadEmail,
    leadTelefon,
    mailCompose,
    openAngebotErstellen,
    router,
    startTransition,
    isCrmAdmin,
    impersonating,
  ])

  function fuehreAnfrageLoeschen() {
    startTransition(async () => {
      const r = await deleteAnfrage(lead.id)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Anfrage gelöscht')
      setDeleteConfirmOpen(false)
      router.push('/anfragen')
      refresh()
    })
  }

  const projektMetaLabel = useMemo(() => leadProjektMetaLabel(lead), [lead])

  const headMeta = (
    <>
      <span>{projektMetaLabel}</span>
      {lead.created_at ? (
        <>
          <span className="sep" aria-hidden>
            ·
          </span>
          <span>Eingang {formatDatum(lead.created_at)}</span>
        </>
      ) : null}
    </>
  )

  const objekteCard =
    zeigeObjekteCard && kundeIdFuerObjekte ? (
      <KundenObjekteCard
        key={kundeIdFuerObjekte}
        kundeId={kundeIdFuerObjekte}
        objekte={objekteListe}
        selectedId={lead.kunde_objekt_id}
        onSelect={waehleLeadObjekt}
        onChanged={() => refresh()}
      />
    ) : null

  const timelineTab = (
    <>
      <Timeline items={timelineItems} />
      <EmailLogPreviewModal
        emailLogId={emailPreviewId}
        open={Boolean(emailPreviewId)}
        onClose={() => setEmailPreviewId(null)}
      />
    </>
  )

  const hatKiVertrieb = leadHatKiVertriebsDaten(lead)

  const stammdatenInhalt = (
    <>
      {stammdatenCard}
      <LeadTermineCard
        leadId={lead.id}
        termine={lead.kalender_termine as KalenderTermin[] | null | undefined}
        notizen={notizenRows}
        onReload={() => refresh()}
      />
      <LeadNaechsteSchritteCard steps={naechsteSchritte} />
    </>
  )

  const detailsInhalt = (
    <>
      <LeadFunnelProjektAnzeige
        lead={lead}
        gewerke={wizardGewerke}
        preislisten={wizardPreislisten}
        onSaved={() => refresh()}
      />
      {hatKiVertrieb ? <LeadGptStudioBlock lead={lead} /> : null}
      <LeadOrgKontextBlock lead={lead} />
      {objekteCard}
      {isEchterFreitext(lead.kontakt_nachricht) ? (
        <Card title="Nachricht vom Kunden">
          <p className="text-[13px] leading-relaxed text-bw-text-muted">{lead.kontakt_nachricht}</p>
        </Card>
      ) : null}
    </>
  )

  const notizenInhalt = (
    <>
      <LeadNotizenListeTab leadId={lead.id} notizen={notizenRows} onReload={() => refresh()} />
      <KommunikationCard filter={{ leadId: lead.id }} reloadKey={mailCompose.reloadKey + generation} />
    </>
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
      render: () => detailsInhalt,
    },
    {
      id: 'verlauf',
      label: ACTIVITY_SECTIONS.verlauf,
      icon: 'history',
      count: timelineItems.length || undefined,
      render: () => timelineTab,
    },
    {
      id: 'dokumente',
      label: ACTIVITY_SECTIONS.dokumente,
      icon: 'files',
      count: dokumenteCount || undefined,
      render: () => (
        <AnfrageDokumenteTab
          leadId={lead.id}
          dokumente={dokumenteRows}
          angebote={angeboteListe}
          onReload={() => refresh()}
        />
      ),
    },
    {
      id: 'notizen',
      label: ACTIVITY_SECTIONS.notizen,
      icon: 'messages',
      count: notizenRows.length || undefined,
      render: () => notizenInhalt,
    },
  ]

  const kiAnalyseCard =
    !hatKiVertrieb && lead.ki_zusammenfassung?.trim() ? (
      <details className="group rounded-lg border border-[#2E7D52] bg-[#EAF3DE]">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-[#2E7D52] marker:content-none [&::-webkit-details-marker]:hidden">
          <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
          KI Vertriebs-Analyse
        </summary>
        <p className="whitespace-pre-wrap border-t border-[#2E7D52]/25 px-4 pb-3.5 pt-2 text-[13px] leading-relaxed text-[#1A3D2B]">
          {lead.ki_zusammenfassung.trim()}
        </p>
      </details>
    ) : null


  return (
    <div className="space-y-4 pb-6">
      <DetailHead
        backHref="/anfragen"
        backLabel="Zurück zu Anfragen"
        title={kundenName(lead)}
        badges={(() => {
          const s = anfrageStatusDisplay(lead.status)
          if (lead.status === 'angebot') {
            return <StatusBadge status="offer" label={s.label} />
          }
          return <StatusBadge label={s.label} variant={s.variant} />
        })()}
        meta={headMeta}
        actions={
          <div className="flex w-full flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm inline-flex flex-1 gap-1.5 sm:flex-none"
              onClick={primaryCtaAction}
            >
              {primaryCtaLabel}
              <MockIcon n="arrow-right" size={15} />
            </button>
            {auftragId ? (
              <Link
                href={`/auftraege/${auftragId}`}
                className="btn btn-secondary btn-sm inline-flex shrink-0 gap-1.5"
              >
                <MockIcon n="briefcase" size={15} />
                <span className="hidden sm:inline">Auftrag</span>
              </Link>
            ) : null}
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
              sheetTitle="Anfrage"
            />
          </div>
        }
      />

      {projektKontext ? <ProjektKette kontext={projektKontext} /> : null}

      {kiAnalyseCard}

      <DetailShell
        groups={detailShellGroups}
        value={tab}
        onChange={(id) => setTab(id as AnfrageDetailTab)}
      />

      {angebotWizardOpen ? (
        <AngebotWizard
          key={wizardSessionKey}
          lead={lead}
          gewerke={wizardGewerke}
          preislisten={wizardPreislisten}
          handwerker={wizardHandwerker}
          firm={wizardFirm}
          kundenObjekte={objekteListe}
          bootstrap={angebotWizardBootstrap}
          onClose={closeAngebotWizard}
          onSaved={() => refresh()}
          onDone={() => {
            closeAngebotWizard()
            refresh()
          }}
        />
      ) : null}

      <AngebotAuswahlModal
        open={angebotAuswahlOpen}
        onClose={() => setAngebotAuswahlOpen(false)}
        leadId={lead.id}
        angebote={angeboteListe}
        onNeuesAngebot={() => {
          setAngebotAuswahlOpen(false)
          openAngebotWizard(null)
        }}
        onWeiterbearbeiten={(bootstrap) => {
          setAngebotAuswahlOpen(false)
          openAngebotWizard(bootstrap)
        }}
        onKopie={(bootstrap) => {
          setAngebotAuswahlOpen(false)
          openAngebotWizard(bootstrap)
        }}
      />

      <AnfrageNeuSheet
        open={bearbeitenOpen}
        onClose={() => setBearbeitenOpen(false)}
        bearbeitenLead={lead}
        onSuccess={() => {
          setBearbeitenOpen(false)
          refresh()
        }}
      />

      <StatusModal
        kind={statusModalKind}
        open={statusModalKind != null}
        lead={lead}
        onClose={() => setStatusModalKind(null)}
        onSaved={() => {
          setStatusModalKind(null)
          refresh()
        }}
      />

      <Modal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Anfrage löschen">
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-bw-text-muted">
            Die Anfrage wird dauerhaft gelöscht. Das kann nicht rückgängig gemacht werden — zugehörige Einträge zu
            diesem Lead (z.&nbsp;B. Notizen, Termine) werden mit entfernt, soweit in der Datenbank vorgesehen.
          </p>
          <div className="flex justify-end gap-2 border-t border-bw-border pt-4">
            <Button type="button" variant="secondary" onClick={() => setDeleteConfirmOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" variant="danger" loading={pending} onClick={fuehreAnfrageLoeschen}>
              Endgültig löschen
            </Button>
          </div>
        </div>
      </Modal>

      {kunde ? (
        <KundeModal
          open={stammdatenModalOpen}
          onClose={() => setStammdatenModalOpen(false)}
          editKunde={kunde}
          leadFunnelDaten={lead.funnel_daten}
          stayOnPage
          revalidateAnfrageId={lead.id}
          onSaved={() => {
            toast.success('Stammdaten gespeichert')
            refresh()
          }}
        />
      ) : null}

      {mailCompose.modal}
    </div>
  )
}
