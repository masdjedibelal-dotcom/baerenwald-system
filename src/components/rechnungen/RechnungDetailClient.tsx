'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition, type ReactNode } from 'react'
import {
  AlertTriangle,
  Briefcase,
  Download,
  FileMinus,
  FileText,
  History,
  LayoutGrid,
  List,
  ListChecks,
  Mail,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Receipt,
  Send,
  User,
} from 'lucide-react'
import { DetailHead } from '@/components/layout/DetailHead'
import { ProjektKette } from '@/components/crm/ProjektKette'
import { ProjektUebersichtCard } from '@/components/crm/ProjektUebersichtCard'
import { DetailResponsiveTabs } from '@/components/layout/app'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { DetailTabBar } from '@/components/ui/detail-tab-bar'
import { DetailAccordion } from '@/components/ui/DetailAccordion'
import { NaechsteSchritteCard } from '@/components/crm/NaechsteSchritteCard'
import { ActionsMenu, type ActionsMenuItem } from '@/components/ui/actions-menu'
import { KommunikationCard } from '@/components/kommunikation/KommunikationCard'
import { useKundenMailCompose } from '@/components/kommunikation/useKundenMailCompose'
import { mailComposeContextFromRechnung } from '@/app/(dashboard)/kommunikation/actions'
import { Card } from '@/components/ui/Card'
import {
  CrmDokumenteTabelle,
  type CrmDokumentZeile,
} from '@/components/dokumente/CrmDokumenteTabelle'
import { Button } from '@/components/ui/Button'
import { ClientOnly } from '@/components/ui/ClientOnly'
import { StatusBadge } from '@/components/ui/StatusBadge'
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
import { loadRechnungWizardBootstrap } from '@/app/(dashboard)/rechnungen/wizard-actions'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { Gewerk, Preisliste, Rechnung, RechnungBelegTyp, RechnungStatus } from '@/lib/types'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import {
  berechneRechnung,
  formatHinweis35aRechnung,
  rechnungZeigtHinweis35a,
} from '@/lib/rechnung-berechnung'
import { formatDatum, formatPreis } from '@/lib/utils'
import {
  HINWEIS_KLEINUNTERNEHMER,
  HINWEIS_REVERSE_CHARGE_13B,
  RECHNUNG_BELEG_TYP_LABELS,
  RECHNUNG_STATUS_LABELS,
} from '@/lib/rechnung-config'
import {
  defaultZahlungszielTage,
  rechnungDarfImWizardBearbeitetWerden,
  type RechnungWizardBootstrap,
} from '@/lib/rechnungen/rechnung-wizard-types'
import { toast } from '@/components/ui/app-toast'
import { buildRechnungNaechsteSchritte } from '@/lib/naechste-schritte'
import {
  mahnstufeListenLabel,
  rechnungHatMahnverlauf,
} from '@/lib/rechnungen/mahnverlauf'
import { ACTIVITY_SECTIONS } from '@/lib/crm-labels'

function DetailProp({
  label,
  children,
  link,
}: {
  label: string
  children: ReactNode
  link?: boolean
}) {
  return (
    <div className="prop">
      <div className="prop-l">{label}</div>
      <div className={link ? 'prop-v link' : 'prop-v'}>{children}</div>
    </div>
  )
}

function tageSeitFaelligkeit(faelligAm: string | null): number {
  if (!faelligAm) return 0
  const parts = faelligAm.split('-').map((x) => parseInt(x, 10))
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return 0
  const [y, m, d] = parts
  const due = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - due.getTime()) / 86400000)
}

function rechnungStatusBadge(status: RechnungStatus, ueberfaellig: boolean) {
  if (ueberfaellig) return <StatusBadge status="cancel" label="Überfällig" />
  if (status === 'bezahlt') return <StatusBadge status="order" label="Bezahlt" />
  if (status === 'gesendet') return <StatusBadge status="offer" label="Gesendet" />
  if (status === 'storniert') return <StatusBadge status="cancel" label="Storniert" />
  return <StatusBadge status="done" label="Entwurf" />
}

type RechnungDetailTab = 'stammdaten' | 'leistung' | 'schritte' | 'uebersicht' | 'positionen' | 'aktivitaet' | 'dokumente'

const DESKTOP_RECHNUNG_TABS: RechnungDetailTab[] = ['uebersicht', 'positionen', 'aktivitaet', 'dokumente']
const MOBILE_RECHNUNG_TABS: RechnungDetailTab[] = ['stammdaten', 'leistung', 'schritte', 'aktivitaet', 'dokumente']

export function RechnungDetailClient({
  detail: initial,
  kleinunternehmerFirma,
  gewerke = [],
  preislisten = [],
  firm,
  mahnMails = [],
  projektKontext,
}: {
  detail: Rechnung
  kleinunternehmerFirma: boolean
  gewerke?: Gewerk[]
  preislisten?: Preisliste[]
  firm?: FirmenEinstellungen
  mahnMails?: RechnungMahnMailZeile[]
  projektKontext?: import('@/lib/crm/projekt-kontext-types').ProjektKontext
}) {
  const router = useRouter()
  const { refresh, generation } = useCrmRefresh()
  const mailCompose = useKundenMailCompose()
  const [detail, setDetail] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardBootstrap, setWizardBootstrap] = useState<RechnungWizardBootstrap | null>(null)
  const [wizardKey, setWizardKey] = useState(0)
  const [tab, setTab] = useState<RechnungDetailTab>('uebersicht')
  const [erinnerungModalOpen, setErinnerungModalOpen] = useState(false)
  const [emailPreviewId, setEmailPreviewId] = useState<string | null>(null)

  const pos = normalizeAngebotPositionen(detail.positionen ?? [])
  const berechnung = useMemo(
    () =>
      berechneRechnung(pos, {
        kleinunternehmer: kleinunternehmerFirma,
        reverseCharge13b: Boolean(detail.reverse_charge_13b),
      }),
    [pos, kleinunternehmerFirma, detail.reverse_charge_13b]
  )

  const belegTyp: RechnungBelegTyp =
    detail.beleg_typ === 'gutschrift' ? 'gutschrift' : 'rechnung'
  const titel = detail.kunden?.name?.trim() || 'Rechnung'

  const tageUeberfaellig = detail.faellig_am ? tageSeitFaelligkeit(detail.faellig_am) : 0
  const ueberfaellig =
    tageUeberfaellig > 0 &&
    detail.status !== 'bezahlt' &&
    detail.status !== 'storniert' &&
    belegTyp === 'rechnung'

  const hinweis35a =
    belegTyp === 'rechnung' &&
    rechnungZeigtHinweis35a(detail.kunden?.typ, berechnung.lohn_netto, kleinunternehmerFirma)

  const mahnLabel = mahnstufeListenLabel(detail)
  const zeigtMahnverlauf =
    belegTyp === 'rechnung' &&
    (detail.status === 'gesendet' ||
      detail.status === 'bezahlt' ||
      rechnungHatMahnverlauf(detail))

  const zahlungszielTage = Math.max(
    1,
    parseInt(firm?.zahlungsziel_tage ?? '', 10) ||
      defaultZahlungszielTage(detail.kunden?.typ)
  )

  const pdfHref = detail.pdf_url?.trim() || `/api/rechnungen/${detail.id}/pdf`

  async function setStatus(s: RechnungStatus) {
    setErr(null)
    startTransition(async () => {
      const r = await updateRechnungStatus(detail.id, s)
      if (!r.ok) {
        setErr(r.message)
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
    if (
      !window.confirm(
        'Gutschrift anlegen und Originalrechnung als storniert markieren?'
      )
    ) {
      return
    }
    setErr(null)
    startTransition(async () => {
      const r = await createGutschriftFromRechnung(detail.id)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      toast.success('Gutschrift erstellt')
      router.push(`/rechnungen/${r.id}`)
      refresh()
    })
  }

  function handleSenden() {
    setErr(null)
    startTransition(async () => {
      const r = await sendRechnung(detail.id)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      toast.success('Rechnung gesendet')
      setDetail((d) => ({ ...d, status: 'gesendet' }))
      refresh()
    })
  }

  function openWizard() {
    if (!detail.auftrag_id) {
      toast.error('Bearbeiten nur über den zugehörigen Auftrag möglich.')
      return
    }
    startTransition(async () => {
      const res = await loadRechnungWizardBootstrap(detail.id, detail.auftrag_id!)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      setWizardBootstrap(res.bootstrap)
      setWizardKey((k) => k + 1)
      setWizardOpen(true)
    })
  }

  const aktionenMenuItems = useMemo((): ActionsMenuItem[] => {
    const items: ActionsMenuItem[] = [
      {
        label: 'E-Mail schreiben',
        icon: <Mail className="h-[15px] w-[15px]" aria-hidden />,
        hint: detail.kunden?.email?.trim() ? undefined : 'Keine E-Mail-Adresse',
        onClick: () => mailCompose.openCompose(() => mailComposeContextFromRechnung(detail.id)),
      },
      {
        label: 'PDF öffnen',
        icon: <Download className="h-[15px] w-[15px]" aria-hidden />,
        onClick: () => window.open(pdfHref, '_blank', 'noopener,noreferrer'),
      },
    ]

    if (rechnungDarfImWizardBearbeitetWerden(detail.status) && detail.auftrag_id) {
      items.push({
        label: 'Im Wizard bearbeiten',
        icon: <Pencil className="h-[15px] w-[15px]" aria-hidden />,
        onClick: openWizard,
      })
    }

    if (detail.status === 'entwurf') {
      items.push({
        label: 'Als gesendet markieren',
        icon: <Send className="h-[15px] w-[15px]" aria-hidden />,
        onClick: () => void setStatus('gesendet'),
      })
    }

    if (detail.status === 'gesendet') {
      items.push(
        {
          label: 'Als bezahlt markieren',
          icon: <Receipt className="h-[15px] w-[15px]" aria-hidden />,
          onClick: () => void setStatus('bezahlt'),
        },
        {
          label: 'Zahlungserinnerung senden',
          icon: <AlertTriangle className="h-[15px] w-[15px]" aria-hidden />,
          onClick: () => setErinnerungModalOpen(true),
        }
      )
    }

    if (
      belegTyp === 'rechnung' &&
      detail.status !== 'storniert' &&
      detail.status !== 'bezahlt'
    ) {
      items.push('sep', {
        label: 'Gutschrift erstellen',
        icon: <FileMinus className="h-[15px] w-[15px]" aria-hidden />,
        onClick: handleGutschrift,
      })
      items.push({
        label: 'Nur stornieren',
        icon: <AlertTriangle className="h-[15px] w-[15px]" aria-hidden />,
        danger: true,
        onClick: () => void setStatus('storniert'),
      })
    }

    if (detail.kunden?.id || detail.kunde_id) {
      items.push('sep', {
        label: 'Zum Kunden',
        icon: <User className="h-[15px] w-[15px]" aria-hidden />,
        onClick: () =>
          router.push(`/kunden/${detail.kunden?.id ?? detail.kunde_id}`),
      })
    }

    if (detail.auftrag_id) {
      items.push({
        label: 'Zum Auftrag',
        icon: <Briefcase className="h-[15px] w-[15px]" aria-hidden />,
        onClick: () => router.push(`/auftraege/${detail.auftrag_id}`),
      })
    }

    return items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, belegTyp, pdfHref, router])

  const headSub = [
    RECHNUNG_BELEG_TYP_LABELS[belegTyp],
    detail.rechnungsdatum ? formatDatum(detail.rechnungsdatum) : null,
    detail.faellig_am && belegTyp === 'rechnung'
      ? `Fällig ${formatDatum(detail.faellig_am)}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const primaryAction = useMemo(() => {
    if (detail.status === 'entwurf') {
      return (
        <Button type="button" variant="primary" size="sm" loading={pending} onClick={handleSenden}>
          <Send className="h-3.5 w-3.5" aria-hidden />
          Rechnung senden
        </Button>
      )
    }
    if (detail.status === 'gesendet') {
      return (
        <div className="flex flex-wrap items-center gap-2">
          {ueberfaellig && belegTyp === 'rechnung' ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setErinnerungModalOpen(true)}
            >
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              Zahlungserinnerung
            </Button>
          ) : null}
          <Button
            type="button"
            variant={ueberfaellig ? 'secondary' : 'primary'}
            size="sm"
            loading={pending}
            onClick={() => void setStatus('bezahlt')}
          >
            Als bezahlt markieren
          </Button>
        </div>
      )
    }
    return (
      <a
        href={pdfHref}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-primary btn-sm inline-flex gap-1.5"
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        PDF öffnen
      </a>
    )
  }, [detail.status, pending, pdfHref, ueberfaellig, belegTyp])

  const summenFooter = (
    <div className="border-t border-bw-border px-4 py-3 text-sm">
      <div className="flex justify-between py-1">
        <span className="text-bw-text-muted">Lohn netto</span>
        <span className="tabular-nums">{formatEurBetrag(berechnung.lohn_netto)}</span>
      </div>
      <div className="flex justify-between py-1">
        <span className="text-bw-text-muted">Material netto</span>
        <span className="tabular-nums">{formatEurBetrag(berechnung.material_netto)}</span>
      </div>
      <div className="flex justify-between py-1">
        <span className="text-bw-text-muted">Netto</span>
        <span className="tabular-nums">{formatEurBetrag(berechnung.netto)}</span>
      </div>
      {kleinunternehmerFirma ? (
        <p className="py-1 text-xs text-bw-text-muted">{HINWEIS_KLEINUNTERNEHMER}</p>
      ) : detail.reverse_charge_13b ? (
        <p className="py-1 text-xs text-bw-text-muted">{HINWEIS_REVERSE_CHARGE_13B}</p>
      ) : (
        berechnung.mwst_aufschluesselung.map((z) => (
          <div key={z.satz} className="flex justify-between py-1">
            <span className="text-bw-text-muted">
              USt {z.satz} % (auf {formatEurBetrag(z.netto)})
            </span>
            <span className="tabular-nums">{formatEurBetrag(z.mwst)}</span>
          </div>
        ))
      )}
      <div className="flex justify-between border-t border-bw-border pt-2 font-semibold text-bw-primary">
        <span>Brutto</span>
        <span className="tabular-nums">{formatEurBetrag(berechnung.brutto)}</span>
      </div>
      {hinweis35a ? (
        <p className="mt-2 border-t border-bw-border pt-2 text-xs text-bw-text-muted">
          {formatHinweis35aRechnung(berechnung.lohn_netto)}
        </p>
      ) : null}
    </div>
  )

  const rechnungsdetailsCard = (
    <Card collapsible title="Rechnungsdetails">
      <div className="props">
        {detail.rechnungsnummer?.trim() ? (
          <DetailProp label="Rechnungsnr.">{detail.rechnungsnummer.trim()}</DetailProp>
        ) : null}
        <DetailProp label="Belegart">{RECHNUNG_BELEG_TYP_LABELS[belegTyp]}</DetailProp>
        <DetailProp label="Status">{RECHNUNG_STATUS_LABELS[detail.status]}</DetailProp>
        <DetailProp label="Kunde" link={Boolean(detail.kunden?.id ?? detail.kunde_id)}>
          {detail.kunden?.id ?? detail.kunde_id ? (
            <Link
              href={`/kunden/${detail.kunden?.id ?? detail.kunde_id}`}
              className="font-medium text-bw-link hover:underline"
            >
              {detail.kunden?.name ?? '—'}
            </Link>
          ) : (
            detail.kunden?.name ?? '—'
          )}
        </DetailProp>
        {detail.kunden?.ust_id ? (
          <DetailProp label="Kunden-USt-ID">{detail.kunden.ust_id}</DetailProp>
        ) : null}
        <DetailProp label="Rechnungsdatum">{formatDatum(detail.rechnungsdatum)}</DetailProp>
        {detail.leistungszeitraum_von && detail.leistungszeitraum_bis ? (
          <DetailProp label="Leistungszeitraum">
            {formatDatum(detail.leistungszeitraum_von)} – {formatDatum(detail.leistungszeitraum_bis)}
          </DetailProp>
        ) : null}
        {detail.faellig_am && belegTyp === 'rechnung' ? (
          <DetailProp label="Fällig">{formatDatum(detail.faellig_am)}</DetailProp>
        ) : null}
        {mahnLabel ? <DetailProp label="Mahnstufe">{mahnLabel}</DetailProp> : null}
        {detail.bezahlt_at ? (
          <DetailProp label="Bezahlt am">{formatDatum(detail.bezahlt_at)}</DetailProp>
        ) : null}
        {detail.gesendet_at ? (
          <DetailProp label="Gesendet am">{formatDatum(detail.gesendet_at)}</DetailProp>
        ) : null}
        {detail.reverse_charge_13b ? <DetailProp label="§ 13b">Reverse Charge</DetailProp> : null}
        {detail.auftrag_id ? (
          <DetailProp label="Zum Auftrag">
            <Link href={`/auftraege/${detail.auftrag_id}`} className="text-bw-link hover:underline">
              Auftrag öffnen
            </Link>
          </DetailProp>
        ) : null}
        {detail.angebot_id ? (
          <DetailProp label="Zum Angebot">
            <Link href={`/angebote/${detail.angebot_id}`} className="text-bw-link hover:underline">
              Angebot öffnen
            </Link>
          </DetailProp>
        ) : null}
      </div>
    </Card>
  )

  const positionenTab = (
    <div className="overflow-hidden rounded-lg border border-bw-border bg-bw-card shadow-card">
      {pos.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-bw-text-muted">Keine Positionen.</p>
      ) : (
        <ul className="divide-y divide-bw-border">
          {pos.map((p, i) => (
            <li key={p.id ?? i} className="px-4 py-3">
              <p className="text-sm font-medium text-bw-text">
                {i + 1}. {(p.beschreibung || p.leistung_name || p.leistung || 'Leistung').trim()}
              </p>
              <p className="mt-1 text-xs text-bw-text-muted">
                Lohn {formatEurBetrag(p.lohn_netto * (p.menge || 1))} · Material{' '}
                {formatEurBetrag(p.material_netto * (p.menge || 1))}
                {p.gewerk_name ? ` · ${p.gewerk_name}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
      {summenFooter}
    </div>
  )

  const fixedOverview = (
    <div className="space-y-3">
      {projektKontext ? <ProjektUebersichtCard kontext={projektKontext} /> : null}
      {rechnungsdetailsCard}
      {zeigtMahnverlauf ? (
        <RechnungMahnverlaufCard
          rechnung={detail}
          mahnMails={mahnMails}
          onSendErinnerung={() => setErinnerungModalOpen(true)}
          onMailAnsehen={(id) => setEmailPreviewId(id)}
        />
      ) : null}
      {ueberfaellig ? (
        <div
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="status"
        >
          Diese Rechnung ist seit {tageUeberfaellig} Tag
          {tageUeberfaellig === 1 ? '' : 'en'} überfällig.
        </div>
      ) : null}
    </div>
  )

  const naechsteSchritte = useMemo(
    () =>
      buildRechnungNaechsteSchritte({
        status: detail.status,
        rechnungId: detail.id,
        auftragId: detail.auftrag_id,
        onSenden: detail.status === 'entwurf' ? handleSenden : undefined,
        onBezahlt: detail.status === 'gesendet' ? () => void setStatus('bezahlt') : undefined,
      }),
    [detail.status, detail.id, detail.auftrag_id]
  )

  const schritteInhalt = <NaechsteSchritteCard steps={naechsteSchritte} />

  const aktivitaetInhalt = (
    <DetailAccordion
      mobileOnly
      sections={[
        {
          id: 'kommunikation',
          title: ACTIVITY_SECTIONS.kommunikation,
          defaultOpen: true,
          content: (
            <KommunikationCard
              filter={{ rechnungId: detail.id, kundeId: detail.kunde_id ?? detail.kunden?.id }}
              reloadKey={mailCompose.reloadKey + generation}
            />
          ),
        },
      ]}
    />
  )

  const dokumenteInhalt = (
    <div className="space-y-6">
      <CrmDokumenteTabelle
        zeilen={
          [
            {
              id: 'rechnung-pdf',
              datum: detail.rechnungsdatum,
              name: detail.rechnungsnummer?.trim()
                ? `Rechnung ${detail.rechnungsnummer.trim()}`
                : 'Rechnung PDF',
              href: pdfHref,
            },
          ] satisfies CrmDokumentZeile[]
        }
        emptyTitle="Noch kein PDF"
        emptyDescription="PDF wird nach Freigabe der Rechnung erzeugt."
      />
      <p className="text-xs text-bw-text-muted">
        Vor dem PDF werden Pflichtangaben (Adressen, Leistungszeitraum, Steuer-ID) geprüft.
      </p>
    </div>
  )

  const desktopDetailTabs = [
    { id: 'uebersicht', label: 'Übersicht', icon: LayoutGrid },
    { id: 'positionen', label: 'Positionen', icon: FileText, count: pos.length || undefined },
    { id: 'aktivitaet', label: 'Aktivität', icon: History },
    { id: 'dokumente', label: 'Dokumente', icon: Paperclip },
  ]

  const mobileDetailTabs = [
    { id: 'stammdaten', label: 'Stammdaten', icon: LayoutGrid },
    { id: 'leistung', label: 'Leistungsübersicht', icon: List, count: pos.length || undefined },
    { id: 'schritte', label: 'Nächste Schritte', icon: ListChecks },
    { id: 'aktivitaet', label: 'Aktivität', icon: History },
    { id: 'dokumente', label: 'Dokumente', icon: Paperclip },
  ]

  const desktopTabContent = (
    <>
      {tab === 'uebersicht' ? schritteInhalt : null}
      {tab === 'positionen' ? positionenTab : null}
      {tab === 'aktivitaet' ? aktivitaetInhalt : null}
      {tab === 'dokumente' ? dokumenteInhalt : null}
    </>
  )

  const mobileTabContent = (
    <>
      {tab === 'stammdaten' ? fixedOverview : null}
      {tab === 'leistung' ? positionenTab : null}
      {tab === 'schritte' ? schritteInhalt : null}
      {tab === 'aktivitaet' ? aktivitaetInhalt : null}
      {tab === 'dokumente' ? dokumenteInhalt : null}
    </>
  )

  return (
    <div className="space-y-4 pb-6">
      <DetailHead
        backHref="/rechnungen"
        backLabel="Zurück zu Rechnungen"
        title={
          <div className="detail-head-title-row">
            <span>{titel}</span>
            {rechnungStatusBadge(detail.status, ueberfaellig)}
            {mahnLabel ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-950">
                {mahnLabel}
              </span>
            ) : null}
          </div>
        }
        sub={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {headSub}
            {detail.brutto != null ? (
              <span className="font-semibold tabular-nums text-bw-primary">
                · {formatPreis(detail.brutto)}
              </span>
            ) : null}
          </span>
        }
        actions={
          <>
            {primaryAction}
            <ActionsMenu
              trigger={
                <button
                  type="button"
                  className="btn btn-secondary btn-sm inline-flex shrink-0 gap-1.5 px-2.5"
                  aria-label="Weitere Aktionen"
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden />
                  <span className="sr-only">Mehr</span>
                </button>
              }
              items={aktionenMenuItems}
              sheetTitle="Rechnung"
            />
          </>
        }
      />

      {projektKontext ? <ProjektKette kontext={projektKontext} /> : null}

      {err ? (
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {err}
        </p>
      ) : null}

      <DetailResponsiveTabs
        tab={tab}
        onTabChange={setTab}
        desktopOverview={fixedOverview}
        desktopTabs={
          <DetailTabBar
            tabs={desktopDetailTabs}
            value={tab}
            onChange={(id) => setTab(id as RechnungDetailTab)}
          />
        }
        mobileTabs={
          <DetailTabBar
            tabs={mobileDetailTabs}
            value={tab}
            onChange={(id) => setTab(id as RechnungDetailTab)}
          />
        }
        desktopTabContent={desktopTabContent}
        mobileTabContent={mobileTabContent}
        mobileDefaultTab="stammdaten"
        desktopDefaultTab="uebersicht"
        mobileTabIds={MOBILE_RECHNUNG_TABS}
        desktopTabIds={DESKTOP_RECHNUNG_TABS}
      />

      {wizardOpen && wizardBootstrap && firm ? (
        <ClientOnly>
          <RechnungWizard
            key={wizardKey}
            bootstrap={wizardBootstrap}
            gewerke={gewerke}
            preislisten={preislisten}
            firm={firm}
            zahlungszielTage={zahlungszielTage}
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

      <ZahlungserinnerungMailModal
        open={erinnerungModalOpen}
        onClose={() => setErinnerungModalOpen(false)}
        rechnungId={detail.id}
        rechnungsnummer={detail.rechnungsnummer?.trim() || detail.id.slice(0, 8)}
        erinnerung7SentAt={detail.erinnerung_7_sent_at}
        erinnerung21SentAt={detail.erinnerung_21_sent_at}
        onSent={() => {
          refresh()
        }}
      />

      <EmailLogPreviewModal
        emailLogId={emailPreviewId}
        open={Boolean(emailPreviewId)}
        onClose={() => setEmailPreviewId(null)}
      />

      {mailCompose.modal}
    </div>
  )
}
