'use client'
import { useLocalTransition } from '@/components/ui/action-busy'

import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  angebotDarfDirektAuftragOhneHvFreigabe,
  resolveAnfrageFreigabeRegeln,
} from '@/lib/anfragen/anfrage-akut-schwelle'
import { primaryCta } from '@/lib/vorgang/primary-cta'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockCard } from '@/components/mock-ui/MockCard'
import { EntityDetailLayout } from '@/components/layout/EntityDetailLayout'
import { DetailActionsBar, type DetailActionDef } from '@/components/layout/DetailActionsBar'
import { DetailShell, type DetailShellGroup } from '@/components/mock-ui/DetailShell'
import { VorgangPhasenVerlauf } from '@/components/vorgang/VorgangPhasenVerlauf'
import { VorgangAkteTab } from '@/components/vorgang/VorgangAkteTab'
import { isLegacyDetailTabAlias } from '@/lib/vorgang/detail-tab-helpers'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { formatEurBetrag, istGewerkBeschreibungPosition } from '@/lib/dokument-zeilen'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { EmailPillsField } from '@/components/ui/EmailPillsField'
import { KiAssistFieldLabel } from '@/components/assistent/KiAssistFieldLabel'
import { AnfrageNotizenTab } from '@/components/anfragen/AnfrageNotizenTab'
import { HvMeldungKontextCards } from '@/components/anfragen/HvMeldungKontextCards'
import { useDetailQuickActions } from '@/components/vorgang/DetailQuickActions'
import { toast } from '@/components/ui/app-toast'
import {
  acceptAngebotAndCreateAuftrag,
} from '@/app/(dashboard)/angebote/angebot-flow-actions'
import { loadAngebotWizardBootstrap } from '@/app/(dashboard)/angebote/wizard-actions'
import { AngebotAuswahlModal } from '@/components/angebote/AngebotAuswahlModal'
import type { AngebotAuswahlZeile } from '@/components/angebote/AngebotAuswahlPanel'
import {
  previewAuftragsbestaetigungMail,
  recordKundeAbgelehntMitDetails,
  schliesseLeadNachAngebotVerlust,
} from '@/app/(dashboard)/angebote/actions'
import { AngebotAnhaengeTab, anzahlAngebotAnhaenge } from '@/components/angebote/AngebotAnhaengeTab'
import { rechnungIstAlsAkteUnterlage } from '@/lib/auftraege/auftrag-dokumente-helpers'
import { AngebotStammdatenCard } from '@/components/angebote/AngebotStammdatenCard'
import { AngebotLeistungenTab } from '@/components/angebote/AngebotDetailsTab'
import { AngebotZahlungTab } from '@/components/angebote/AngebotZahlungTab'
import { resolveCumulativeDetailTabAlias } from '@/lib/entity-detail/cumulative-detail-tabs'
import { AngebotOrgFreigabeBanner } from '@/components/angebote/AngebotOrgFreigabeBanner'
import { AngebotVersandSection } from '@/components/angebote/AngebotVersandSection'
import { AngebotHandwerkerPartnerSection } from '@/components/angebote/AngebotHandwerkerPartnerSection'
import { AngebotWizard } from '@/components/angebote/AngebotWizard'
import {
  KUNDE_ABLEHNUNG_GRUND_LABELS,
  KUNDE_ABLEHNUNG_GRUND_OPTIONS,
  type KundeAblehnungGrund,
} from '@/lib/angebote/ablehnung-labels'
import {
  addDaysYmd,
  heuteYmd,
  kundeNameAusAngebot,
  resolveStatusEinfach,
} from '@/lib/angebot-einfach'
import { leadKontaktAnzeigeName } from '@/lib/lead-display-helpers'
import { angebotTitelOderSituationBereich } from '@/lib/vorgang/vorgang-anzeige-titel'
import { angebotStatusDisplay, gesendetDetailSubline } from '@/lib/status/status-display'
import { variantToMockBadgeKind } from '@/lib/status/mock-badge-kind'
import { gesendetAmWert } from '@/lib/angebot-einfach'
import { angebotDarfImWizardBearbeitetWerden, angebotWizardBearbeitenSperrgrund, type AngebotWizardBootstrap } from '@/lib/angebote/angebot-wizard-types'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type {
  AngebotDetail,
  Gewerk,
  Handwerker,
  LeadDetail,
  LeadDokumentRow,
  LeadNotizRow,
  Preisliste,
} from '@/lib/types'
import { formatDatum } from '@/lib/utils'
import {
  darfAngebotAnKundeSenden,
  hatAngebotHandwerker,
} from '@/lib/angebote/angebot-handwerker-flow'
import { summenAusPositionen } from '@/lib/angebot-positionen'
import { entityDetailTabLabel } from '@/lib/entity-detail/entity-detail-tabs'

type AngebotDetailTab = 'uebersicht' | 'leistungen' | 'zahlung' | 'akte'

const ANGEBOT_DETAIL_TAB_IDS = new Set<AngebotDetailTab>([
  'uebersicht',
  'leistungen',
  'zahlung',
  'akte',
])
const ANGEBOT_DETAIL_DEFAULT_TAB: AngebotDetailTab = 'uebersicht'

/** Query-/Deep-Link-Aliase auf stabile interne IDs. */
function resolveAngebotDetailTabFromQuery(raw: string | null): AngebotDetailTab | null {
  const tab = (raw ?? '').trim().toLowerCase()
  if (!tab) return ANGEBOT_DETAIL_DEFAULT_TAB
  if (tab === 'zahlung' || tab === 'zahlplan' || tab === 'finanzen') return 'zahlung'
  if (tab === 'leistungen' || tab === 'leistung' || tab === 'positionen') return 'leistungen'
  if (
    tab === 'akte' ||
    tab === 'dokumente' ||
    tab === 'notizen' ||
    tab === 'kommunikation'
  ) {
    return 'akte'
  }
  if (
    tab === 'uebersicht' ||
    tab === 'stammdaten' ||
    tab === 'schritte' ||
    tab === 'naechste-schritte' ||
    tab === 'naechste_schritte' ||
    tab === 'projekt' ||
    tab === 'projektinfo' ||
    tab === 'projektinfos' ||
    tab === 'anfrage' ||
    tab === 'anfrage-details' ||
    tab === 'angebot-details' ||
    tab === 'details' ||
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
    return 'uebersicht'
  }
  const cumulative = resolveCumulativeDetailTabAlias(tab)
  if (cumulative === 'anfrage-details' || cumulative === 'angebot-details') return 'uebersicht'
  if (ANGEBOT_DETAIL_TAB_IDS.has(tab as AngebotDetailTab)) return tab as AngebotDetailTab
  return ANGEBOT_DETAIL_DEFAULT_TAB
}

export function AngebotDetailPageClient({
  detail,
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
  const [pending, startTransition] = useLocalTransition()
  const [mainTab, setMainTab] = useState<AngebotDetailTab>(ANGEBOT_DETAIL_DEFAULT_TAB)
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
  /** Nach Kopie/Neu: gespeicherte ID, falls Close vor onDone */
  const [wizardSavedAngebotId, setWizardSavedAngebotId] = useState<string | null>(null)
  const wizardFinishLockRef = useRef(false)
  const [angebotAuswahlOpen, setAngebotAuswahlOpen] = useState(false)
  const [kundeVersandOpen, setKundeVersandOpen] = useState(false)
  const [ablehnenOpen, setAblehnenOpen] = useState(false)
  const [ablehnenGrund, setAblehnenGrund] = useState<KundeAblehnungGrund | ''>('')
  const [ablehnenNotiz, setAblehnenNotiz] = useState('')
  const [ablehnenKonkurrenz, setAblehnenKonkurrenz] = useState('')

  useEffect(() => {
    const raw = searchParams.get('tab')
    if ((raw ?? '').trim().toLowerCase() === 'visualisierungen') {
      router.replace(`/angebote/${detail.id}/visualisierung`)
      return
    }
    if (isLegacyDetailTabAlias(raw)) {
      const resolved = resolveAngebotDetailTabFromQuery(raw) ?? ANGEBOT_DETAIL_DEFAULT_TAB
      const q = new URLSearchParams(searchParams.toString())
      q.set('tab', resolved)
      q.delete('segment')
      router.replace(`/angebote/${detail.id}?${q.toString()}`, { scroll: false })
      return
    }
    const tab = resolveAngebotDetailTabFromQuery(raw)
    if (tab) setMainTab(tab)
  }, [searchParams, detail.id, router])

  const statusEinfach = resolveStatusEinfach(detail)
  const angebotStatus = useMemo(() => angebotStatusDisplay(detail), [detail])

  const positionenAnzeigeCount = useMemo(
    () => (detail.positionen ?? []).filter((p) => !istGewerkBeschreibungPosition(p)).length,
    [detail.positionen]
  )

  const kannBearbeiten =
    (statusEinfach === 'entwurf' || statusEinfach === 'gesendet' || statusEinfach === 'abgelaufen') &&
    angebotDarfImWizardBearbeitetWerden(detail.status)
  const bearbeitenSperrgrund = angebotWizardBearbeitenSperrgrund(detail.status)

  const angeboteAuswahlZeilen = useMemo((): AngebotAuswahlZeile[] => {
    const fromCtx = (projektKontext?.angebote ?? []).map((a) => ({
      id: a.id,
      status: a.status,
      status_einfach: a.status_einfach,
      gesamt_fix: a.gesamt_fix,
      gesamt_min: a.gesamt_min,
      gesamt_max: a.gesamt_max,
      created_at: a.created_at,
      angebotsnr: a.angebotsnr,
    }))
    if (!fromCtx.some((a) => a.id === detail.id)) {
      fromCtx.unshift({
        id: detail.id,
        status: detail.status,
        status_einfach: detail.status_einfach ?? null,
        gesamt_fix: detail.gesamt_fix ?? null,
        gesamt_min: detail.gesamt_min ?? null,
        gesamt_max: detail.gesamt_max ?? null,
        created_at: detail.created_at ?? new Date().toISOString(),
        angebotsnr: detail.angebotsnr ?? null,
      })
    }
    return fromCtx
  }, [projektKontext?.angebote, detail])

  function openWizardMitBootstrap(bootstrap: AngebotWizardBootstrap | null) {
    wizardFinishLockRef.current = false
    setWizardSavedAngebotId(bootstrap?.angebotId?.trim() || null)
    setWizardBootstrap(bootstrap)
    setWizardSessionKey((k) => k + 1)
    setWizardOpen(true)
  }

  function finishWizardAndGo(angebotId: string | null | undefined) {
    const target = (angebotId ?? wizardSavedAngebotId)?.trim() || null
    /* Immer schließen — Lock nur gegen doppelte Navigation (onDone + onClose). */
    setWizardOpen(false)
    setWizardBootstrap(null)
    setWizardSavedAngebotId(null)
    if (wizardFinishLockRef.current) return
    wizardFinishLockRef.current = true
    if (target && target !== detail.id) {
      router.push(`/angebote/${target}`)
      return
    }
    refresh()
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
    /* Mehrere Angebote oder kein reiner Entwurf → Auswahl wie an der Anfrage */
    if (angeboteAuswahlZeilen.length > 1 || statusEinfach !== 'entwurf') {
      setAngebotAuswahlOpen(true)
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

  useEffect(() => {
    if (searchParams.get('bearbeiten') !== '1') return
    const q = new URLSearchParams(searchParams.toString())
    q.delete('bearbeiten')
    const qs = q.toString()
    router.replace(`/angebote/${detail.id}${qs ? `?${qs}` : ''}`, { scroll: false })
    openWizardBearbeiten()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- einmalig bei ?bearbeiten=1
  }, [searchParams, detail.id])

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : ''
    if (hash !== 'angebot-versand-handwerker' && hash !== 'handwerker-partner') return
    const t = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)
    return () => window.clearTimeout(t)
  }, [detail.id, detail.angebot_handwerker])

  function closeWizard() {
    finishWizardAndGo(wizardSavedAngebotId)
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

  const kundeName =
    (lead ? leadKontaktAnzeigeName(lead, '') : '') ||
    kundeNameAusAngebot(detail)
  const summenMail = useMemo(
    () => summenAusPositionen(detail.positionen ?? [], 19),
    [detail.positionen]
  )
  const gueltigBisYmd = detail.gueltig_bis?.slice(0, 10) ?? addDaysYmd(heuteYmd(), 30)

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

  const anhaengeCount = useMemo(() => {
    const hasLead = Boolean(detail.lead_id ?? lead?.id)
    const rechnungenCount = (projektKontext?.rechnungen ?? []).filter((r) =>
      rechnungIstAlsAkteUnterlage(r)
    ).length
    return anzahlAngebotAnhaenge(detail, dokumenteRows, {
      includeFotos: !hasLead,
      rechnungenCount,
    })
  }, [detail, dokumenteRows, lead?.id, projektKontext?.rechnungen])

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
  const headMeta = useMemo(() => {
    const parts = [
      projektTitel && projektTitel !== '—' ? projektTitel : null,
      formatEurBetrag(summenMail.bruttoMin),
      gueltigBisYmd
        ? `gültig bis ${formatDatum(gueltigBisYmd) || gueltigBisYmd}`
        : null,
    ].filter(Boolean)
    return parts.join(' · ')
  }, [projektTitel, summenMail.bruttoMin, gueltigBisYmd])
  const headSub =
    statusEinfach === 'gesendet'
      ? gesendetDetailSubline(gesendetAmWert(detail), detail.updated_at)
      : undefined

  const dangerAction = useMemo((): DetailActionDef | null => {
    if (!((statusEinfach === 'gesendet' || statusEinfach === 'abgelaufen') && !auftragId)) {
      return null
    }
    return {
      label: 'Ablehnen',
      icon: 'x',
      danger: true,
      onClick: () => {
        setAblehnenGrund('')
        setAblehnenNotiz('')
        setAblehnenKonkurrenz('')
        setAblehnenOpen(true)
      },
    }
  }, [statusEinfach, auftragId])

  const kundeEmail =
    lead?.auftraggeber?.email?.trim() ||
    kunde?.email?.trim() ||
    lead?.kontakt_email?.trim() ||
    ''
  const kundeTel =
    detail.kunden?.telefon?.trim() || lead?.kontakt_telefon?.trim() || ''
  const akteLeadId = detail.lead_id ?? lead?.id ?? null
  const { quickBar, sheets: quickActionSheets } = useDetailQuickActions({
    telefon: kundeTel,
    email: kundeEmail,
    notiz: akteLeadId ? { kind: 'lead', leadId: akteLeadId } : null,
    dokument: akteLeadId ? { kind: 'lead', leadId: akteLeadId } : null,
    onSaved: () => refresh(),
  })

  function openAcceptModal() {
    setAufBetreff('')
    setAufTo([])
    setAufCc([])
    setAufPreviewHtml('')
    setAcceptOpen(true)
  }

  const unterSchwelleDirektAuftrag = useMemo(() => {
    if (auftragId) return false
    const ag = lead?.auftraggeber
    const regeln = resolveAnfrageFreigabeRegeln({
      portalModus: ag?.portal_modus,
      freigabeModus: ag?.freigabe_modus,
      orgSchwelleEur: ag?.freigabe_schwelle_eur,
      orgNotfallDirekt: ag?.notfall_direkt,
      objektSchwelleEur: lead?.kunden_objekte?.freigabe_schwelle_eur,
      objektNotfallDirekt: lead?.kunden_objekte?.notfall_direkt,
    })
    return angebotDarfDirektAuftragOhneHvFreigabe({
      portalModus: regeln.portalModus,
      freigabeModus: regeln.freigabeModus,
      schwelleEur: regeln.schwelleEur,
      betragEur: summenMail.nettoMax,
      hatAuftraggeber: Boolean(lead?.auftraggeber_kunde_id?.trim() || ag?.id),
    })
  }, [auftragId, lead, summenMail.nettoMax])

  const direktAuftragUnterSchwelleHinweis = useMemo(() => {
    if (!unterSchwelleDirektAuftrag || !lead) return null
    const ag = lead.auftraggeber
    const regeln = resolveAnfrageFreigabeRegeln({
      portalModus: ag?.portal_modus,
      freigabeModus: ag?.freigabe_modus,
      orgSchwelleEur: ag?.freigabe_schwelle_eur,
      orgNotfallDirekt: ag?.notfall_direkt,
      objektSchwelleEur: lead.kunden_objekte?.freigabe_schwelle_eur,
      objektNotfallDirekt: lead.kunden_objekte?.notfall_direkt,
    })
    if (regeln.schwelleEur == null || regeln.schwelleEur <= 0) return null
    return {
      betragEur: summenMail.nettoMax,
      schwelleEur: regeln.schwelleEur,
    }
  }, [unterSchwelleDirektAuftrag, lead, summenMail.nettoMax])

  const runDirektAuftrag = useCallback(() => {
    startTransition(async () => {
      const res = await acceptAngebotAndCreateAuftrag(detail.id, {
        start_datum: heuteYmd(),
        end_datum: null,
        send_kunden_email: false,
        direktOhneHvFreigabe: true,
      })
      if (!res?.ok) {
        toast.error(
          res && 'message' in res && res.message
            ? res.message
            : 'Direkt Auftrag fehlgeschlagen — bitte neu laden.'
        )
        return
      }
      toast.success('Auftrag erstellt — ohne Kundenmail / ohne HV-Freigabe')
      router.push(`/auftraege/${res.auftragId}`)
      refresh()
    })
  }, [detail.id, router, refresh, startTransition])

  const primaryAction = useMemo((): DetailActionDef | null => {
    const cta = primaryCta('angebot', statusEinfach || detail.status, {
      unterSchwelleDirektAuftrag,
    })
    if (!cta) return null
    if (cta.id === 'angebot_versenden') {
      return {
        label: cta.label,
        icon: cta.icon,
        onClick: () => setKundeVersandOpen(true),
        disabled: pending,
      }
    }
    if (cta.id === 'direkt_auftrag') {
      return {
        label: cta.label,
        icon: cta.icon,
        onClick: runDirektAuftrag,
        disabled: pending,
      }
    }
    if (cta.id === 'angebot_annehmen') {
      return {
        label: cta.label,
        icon: cta.icon,
        onClick: openAcceptModal,
        disabled: pending,
      }
    }
    return null
  }, [statusEinfach, detail.status, pending, unterSchwelleDirektAuftrag, runDirektAuftrag])

  const secondaryAction = useMemo((): DetailActionDef | null => {
    if (kannBearbeiten) {
      return {
        label: 'Angebot bearbeiten',
        icon: 'pencil',
        onClick: openWizardBearbeiten,
        disabled: pending,
      }
    }
    if (bearbeitenSperrgrund) {
      return {
        label: 'Angebot bearbeiten',
        icon: 'pencil',
        onClick: () => toast.info(bearbeitenSperrgrund),
        disabled: true,
        title: bearbeitenSperrgrund,
      }
    }
    return null
  }, [kannBearbeiten, bearbeitenSperrgrund, pending])

  const stammdatenInhalt = (
    <>
      <AngebotStammdatenCard detail={detail} lead={lead} onSaved={() => refresh()} />
      {lead ? (
        <HvMeldungKontextCards
          lead={lead}
          direktAuftragUnterSchwelle={direktAuftragUnterSchwelleHinweis}
          angebotId={detail.id}
          onSaved={() => refresh()}
        />
      ) : null}
      {lead?.id &&
      (lead.org_freigabe_status || (lead.org_freigabe_log?.length ?? 0) > 0) ? (
        <AngebotOrgFreigabeBanner
          leadId={lead.id}
          angebotId={detail.id}
          orgFreigabeStatus={lead.org_freigabe_status}
          orgFreigabeLog={lead.org_freigabe_log}
          gesamtFix={detail.gesamt_fix}
          gesamtMax={detail.gesamt_max}
          onDone={() => refresh()}
        />
      ) : null}
    </>
  )

  const leistungenInhalt = (
    <AngebotLeistungenTab
      detail={detail}
      lead={lead}
      onOpenDokument={openWizardBearbeiten}
      onSaved={() => refresh()}
    />
  )

  const dokumenteInhalt = (
    <AngebotAnhaengeTab
      detail={detail}
      leadId={detail.lead_id ?? lead?.id ?? null}
      dokumente={dokumenteRows}
      rechnungen={projektKontext?.rechnungen ?? []}
      geschwisterAngebote={(projektKontext?.angebote ?? []).map((a) => ({
        id: a.id,
        created_at: a.created_at,
        angebotsnr: a.angebotsnr,
        pdf_url: a.pdf_url ?? null,
      }))}
      protokolle={
        projektKontext?.auftrag
          ? [
              ...(projektKontext.auftrag.abnahme_protokoll_url
                ? [
                    {
                      id: 'abnahme-protokoll',
                      name: 'Abnahmeprotokoll',
                      href: projektKontext.auftrag.abnahme_protokoll_url,
                      created_at: projektKontext.auftrag.created_at ?? null,
                      beschreibung: 'Abnahme',
                    },
                  ]
                : []),
              ...(projektKontext.auftrag.abschlussdokumentation_url
                ? [
                    {
                      id: 'abschluss-doku',
                      name: 'Abschlussdokumentation',
                      href: projektKontext.auftrag.abschlussdokumentation_url,
                      created_at:
                        projektKontext.auftrag.abschlussdokumentation_gesendet_at ??
                        projektKontext.auftrag.created_at ??
                        null,
                      beschreibung: 'Abschluss',
                    },
                  ]
                : []),
            ]
          : []
      }
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
      <MockCard title="Notizen" icon="messages" className="dshell-framed">
        <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-4)', padding: '4px 0' }}>
          Noch keine Notizen — verknüpfe eine Anfrage oder lege später welche an.
        </div>
      </MockCard>
    )

  const akteCount = (anhaengeCount || 0) + (notizenRows.length || 0) || undefined

  const detailShellGroups: DetailShellGroup[] = [
    {
      id: 'uebersicht',
      label: entityDetailTabLabel('uebersicht'),
      icon: 'file-invoice',
      render: () => (
        <div className="space-y-6">
          {stammdatenInhalt}
          {lead ? (
            <VorgangPhasenVerlauf
              kontext={projektKontext}
              fromRef={{ kind: 'angebot', id: detail.id }}
              lead={lead}
              onSaved={() => refresh()}
            />
          ) : null}
        </div>
      ),
    },
    {
      id: 'leistungen',
      label: entityDetailTabLabel('leistungen'),
      icon: 'tool',
      count: positionenAnzeigeCount || undefined,
      render: () => <div className="space-y-6">{leistungenInhalt}</div>,
    },
    {
      id: 'zahlung',
      label: entityDetailTabLabel('zahlung'),
      icon: 'receipt',
      render: () => <AngebotZahlungTab detail={detail} />,
    },
    {
      id: 'akte',
      label: entityDetailTabLabel('akte'),
      icon: 'files',
      count: akteCount,
      render: () => (
        <VorgangAkteTab
          dateien={dokumenteInhalt}
          notizen={notizenInhalt}
        />
      ),
    },
  ]

  return (
    <EntityDetailLayout
      phase="angebot"
      projektKontext={projektKontext}
      crumbBackHref="/vorgaenge?tab=angebot&lifecycle=offen"
      crumbBackLabel="Zurück zu den Suchergebnissen"
      crumbSectionLabel="Angebote"
      breadcrumbTitle={kundeName}
      className="space-y-4 pb-0"
      wiedervorlageDatum={detail.wiedervorlage_datum}
      wiedervorlageNotiz={detail.wiedervorlage_notiz}
      wiedervorlageEntity="angebot"
      wiedervorlageEntityId={detail.id}
      onWiedervorlageSaved={() => refresh()}
      quickBar={quickBar}
      head={{
        title: kundeName,
        sub: headSub,
        badges: (
          <StatusBadge
            status={detail.status}
            label={angebotStatus.label}
            kind={variantToMockBadgeKind(angebotStatus.variant)}
          />
        ),
        meta: headMeta,
        actions: (
          <DetailActionsBar
            sheetTitle="Angebot"
            primary={primaryAction}
            secondary={secondaryAction}
            danger={dangerAction}
          />
        ),
      }}
    >
      {statusEinfach === 'abgelehnt' ? (
        <p className="rounded-lg border border-bw-border px-3 py-2 text-[length:var(--fs-text)] text-bw-text-muted">
          Abgelehnt
          {detail.updated_at ? ` am ${formatDatum(detail.updated_at)}` : ''}
          {detail.ablehnung_grund ? ` — ${detail.ablehnung_grund}` : ''}
        </p>
      ) : null}

      {hatAngebotHandwerker(detail.angebot_handwerker) && !detail.ist_partner_einholung ? (
        <AngebotHandwerkerPartnerSection
          detail={detail}
          auftragId={auftragId}
          bruttoMin={summenMail.bruttoMin}
          bruttoMax={summenMail.bruttoMax}
          positionen={detail.positionen ?? []}
          gueltigBis={gueltigBisYmd}
        />
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
          onSaved={(id) => {
            setWizardSavedAngebotId(id)
            refresh()
          }}
          onDone={(id) => {
            finishWizardAndGo(id)
          }}
        />
      ) : null}

      {detail.lead_id ? (
        <AngebotAuswahlModal
          open={angebotAuswahlOpen}
          onClose={() => setAngebotAuswahlOpen(false)}
          leadId={detail.lead_id}
          angebote={angeboteAuswahlZeilen}
          onNeuesAngebot={() => {
            setAngebotAuswahlOpen(false)
            openWizardMitBootstrap(null)
          }}
          onWeiterbearbeiten={(bootstrap) => {
            setAngebotAuswahlOpen(false)
            openWizardMitBootstrap(bootstrap)
          }}
          onKopie={(bootstrap) => {
            setAngebotAuswahlOpen(false)
            openWizardMitBootstrap(bootstrap)
          }}
        />
      ) : null}

      <Modal open={acceptOpen} onClose={() => setAcceptOpen(false)} title="Angebot annehmen" size="lg">
        <div className="space-y-4">
          <p className="text-[length:var(--fs-text)] text-bw-text-muted">
            Angebot als angenommen markieren — auch ohne vorherigen Versand an den Kunden. Optional
            die Auftragsbestätigung per E-Mail senden.
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
            <p className="mb-3 text-[length:var(--fs-text)] font-semibold text-bw-text">Auftragsbestätigung an Kund:in</p>
            {!kunde?.email?.trim() ? (
              <p className="text-[length:var(--fs-text)] text-amber-700">Keine E-Mail-Adresse — Auftrag wird ohne Mail erstellt.</p>
            ) : (
              <>
                <KiAssistFieldLabel
                  label="Betreff"
                  value={aufBetreff}
                  onApply={setAufBetreff}
                  extraHint="Auftragsbestätigung — Betreff an den Kunden."
                  multiline={false}
                >
                  <Input
                    value={aufBetreff}
                    onChange={(e) => setAufBetreff(e.target.value)}
                    className="mb-3"
                  />
                </KiAssistFieldLabel>
                <EmailPillsField
                  label="An"
                  required
                  emails={aufTo}
                  onChange={setAufTo}
                  placeholder="kunde@beispiel.de"
                />
                <EmailPillsField
                  label="CC"
                  emails={aufCc}
                  onChange={setAufCc}
                  placeholder="weitere@beispiel.de"
                />
                <p className="mb-1 mt-4 inline-flex items-center gap-1 text-[length:var(--fs-meta)] font-medium text-bw-text-muted">
                  <MockIcon ctx="btn" n="mail" size={14} />
                  Vorschau
                </p>
                {aufPreviewLoading ? (
                  <p className="text-[length:var(--fs-text)] text-bw-text-muted">Vorschau wird geladen …</p>
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

      <Modal
        open={ablehnenOpen}
        onClose={() => setAblehnenOpen(false)}
        title="Angebot ablehnen"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-[length:var(--fs-text)] text-bw-text-muted">
            Markiert das Angebot als abgelehnt und kann den zugehörigen Lead schließen.
          </p>
          <Select
            label="Grund"
            name="ablehnung_grund"
            required
            value={ablehnenGrund}
            onChange={(e) => setAblehnenGrund(e.target.value as KundeAblehnungGrund | '')}
            options={[
              { value: '', label: 'Grund wählen' },
              ...KUNDE_ABLEHNUNG_GRUND_OPTIONS.map((v) => ({
                value: v,
                label: KUNDE_ABLEHNUNG_GRUND_LABELS[v],
              })),
            ]}
          />
          {(ablehnenGrund === 'konkurrenz' || ablehnenGrund === 'zu_teuer') && (
            <Input
              label="Konkurrenzpreis (€, optional)"
              type="number"
              min={0}
              step="0.01"
              value={ablehnenKonkurrenz}
              onChange={(e) => setAblehnenKonkurrenz(e.target.value)}
            />
          )}
          <Input
            label="Notiz (optional)"
            value={ablehnenNotiz}
            onChange={(e) => setAblehnenNotiz(e.target.value)}
          />
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setAblehnenOpen(false)}>
            Abbrechen
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={pending}
            onClick={() => {
              if (!ablehnenGrund) {
                toast.error('Bitte einen Ablehnungsgrund wählen.')
                return
              }
              startTransition(async () => {
                const kpRaw = ablehnenKonkurrenz.trim().replace(',', '.')
                const kp =
                  kpRaw && Number.isFinite(Number(kpRaw)) ? Number(kpRaw) : null
                const res = await recordKundeAbgelehntMitDetails(detail.id, {
                  grund: ablehnenGrund,
                  konkurrenz_preis_eur: kp,
                  notiz: ablehnenNotiz.trim() || null,
                })
                if (!res.ok) {
                  toast.error(res.message)
                  return
                }
                const leadClose = await schliesseLeadNachAngebotVerlust(detail.id)
                if (!leadClose.ok) {
                  toast.success('Angebot abgelehnt')
                  toast.info(leadClose.message)
                } else {
                  toast.success('Angebot abgelehnt — Lead geschlossen')
                }
                setAblehnenOpen(false)
                refresh()
              })
            }}
          >
            Ablehnen
          </Button>
        </div>
      </Modal>

      {quickActionSheets}
    </EntityDetailLayout>
  )
}
