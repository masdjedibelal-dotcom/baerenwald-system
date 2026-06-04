'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fragment, useEffect, useMemo, useState, useTransition } from 'react'
import {
  CalendarClock,
  Check,
  Download,
  ExternalLink,
  History,
  List,
  ListChecks,
  Mail,
  MoreHorizontal,
  Paperclip,
  Pencil,
  CircleX,
  Send,
} from 'lucide-react'
import { DetailHead } from '@/components/layout/DetailHead'
import { DetailScreenShell } from '@/components/layout/app'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { DetailTabBar } from '@/components/ui/detail-tab-bar'
import { DetailProp } from '@/components/ui/detail-prop'
import { NaechsteSchritteCard } from '@/components/crm/NaechsteSchritteCard'
import { Card } from '@/components/ui/Card'
import { RichTextContent } from '@/components/ui/RichTextContent'
import { angebotGewerkNameAnzeige, istFreitextPosition } from '@/lib/dokument-zeilen'
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
} from '@/app/(dashboard)/angebote/angebot-flow-actions'
import { extendAngebotGueltigkeit } from '@/app/(dashboard)/angebote/extend-gueltigkeit-action'
import { loadAngebotWizardBootstrap } from '@/app/(dashboard)/angebote/wizard-actions'
import { previewAuftragsbestaetigungMail } from '@/app/(dashboard)/angebote/actions'
import { KUNDE_MAIL_BCC_HINT } from '@/lib/mail-constants'
import { AngebotAnhaengeTab, anzahlAngebotAnhaenge } from '@/components/angebote/AngebotAnhaengeTab'
import { AngebotWizard } from '@/components/angebote/AngebotWizard'
import { AngebotEinfachStatusBadge } from '@/components/ui/AngebotEinfachStatusBadge'
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
import { angebotWizardZahlungLabel, angebotDarfImWizardBearbeitetWerden, parseZahlungsbedingungenKey, type AngebotWizardBootstrap } from '@/lib/angebote/angebot-wizard-types'
import {
  groupAngebotPositionenByBlock,
  type AngebotBlockPdfEntry,
  type AngebotPositionBlockGroup,
} from '@/lib/angebote/angebot-position-blocks'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { kundentypLabel } from '@/lib/lead-display-helpers'
import type { AngebotDetail, AngebotPosition, Gewerk, LeadDetail, LeadTimelineRow, Preisliste } from '@/lib/types'
import { cn, formatDatum, formatDatumZeit } from '@/lib/utils'
import {
  KUNDE_ABLEHNUNG_GRUND_LABELS,
  KUNDE_ABLEHNUNG_GRUND_OPTIONS,
} from '@/lib/angebote/ablehnung-labels'
import { buildAngebotNaechsteSchritte } from '@/lib/naechste-schritte'
import { ACTIVITY_SECTIONS } from '@/lib/crm-labels'

function positionNetto(p: AngebotPosition): number {
  const menge = p.menge || 1
  const ausSplit = (p.lohn_netto + p.material_netto) * menge
  if (ausSplit > 0) return ausSplit
  return ((p.gesamt_min + p.gesamt_max) / 2) * menge
}

function positionAnzeigeTitel(p: AngebotPosition): string {
  const leistung = (p.leistung_name || p.leistung || '').trim()
  if (istFreitextPosition(p)) {
    if (leistung && leistung !== 'Freitext') return leistung
    return angebotGewerkNameAnzeige(p.gewerk_name)
  }
  return leistung || (p.beschreibung || '').trim() || '—'
}

function PositionenMobileEntry({ entry, indexKey }: { entry: AngebotBlockPdfEntry; indexKey: string }) {
  if (entry.kind === 'freitext') {
    return (
      <div key={indexKey} className="border-b border-bw-border px-4 py-3 text-sm last:border-b-0">
        {entry.freitext.titel ? (
          <div className="text-xs font-semibold uppercase tracking-wide text-bw-text-muted">
            {entry.freitext.titel}
          </div>
        ) : null}
        {entry.freitext.text ? (
          <RichTextContent html={entry.freitext.text} className="mt-0.5 text-sm text-bw-text-muted" />
        ) : null}
      </div>
    )
  }

  const p = entry.position
  const netto = positionNetto(p)
  const titel = positionAnzeigeTitel(p)
  const besch = p.beschreibung && p.beschreibung !== titel ? p.beschreibung : ''

  return (
    <div key={indexKey} className="border-b border-bw-border px-4 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-[13px] font-medium text-bw-text">{titel}</p>
        <p className="shrink-0 text-[13px] font-semibold tabular-nums text-bw-primary">
          {netto.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
        </p>
      </div>
      {besch ? <RichTextContent html={besch} className="mt-1 text-xs text-bw-text-muted" /> : null}
      <p className="mt-1.5 text-xs text-bw-text-muted">
        {p.menge} {p.einheit}
        {p.ist_fachbetrieb ? (
          <span className="ml-2 inline-flex rounded bg-bw-hover px-1.5 py-0.5 text-[10px] font-medium">
            Fachbetrieb
          </span>
        ) : null}
      </p>
    </div>
  )
}

function PositionenMobileListe({
  blocks,
  mehrereGewerke,
}: {
  blocks: AngebotPositionBlockGroup[]
  mehrereGewerke: boolean
}) {
  return (
    <div className="space-y-3 p-4 md:hidden">
      {blocks.map((block) => (
        <div key={block.key} className="space-y-2">
          {mehrereGewerke ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-bw-text-muted">{block.titel}</p>
          ) : null}
          {block.entries.map((entry, idx) => (
            <PositionenMobileEntry
              key={`${block.key}-m-${idx}`}
              entry={entry}
              indexKey={`${block.key}-m-${idx}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function PositionenZeile({ p }: { p: AngebotPosition }) {
  const netto = positionNetto(p)
  const titel = positionAnzeigeTitel(p)
  const besch = p.beschreibung && p.beschreibung !== titel ? p.beschreibung : ''
  return (
    <tr className="border-b border-bw-border align-top">
      <td className="px-4 py-3">
        <div className="font-medium text-bw-text">{titel}</div>
        {besch ? (
          <RichTextContent html={besch} className="mt-0.5 text-xs text-bw-text-muted" />
        ) : null}
        {p.ist_fachbetrieb ? (
          <span className="mt-1 inline-flex rounded bg-bw-hover px-1.5 py-0.5 text-[10px] font-medium text-bw-text-muted">
            Fachbetrieb
          </span>
        ) : null}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">{p.menge}</td>
      <td className="px-4 py-3 text-bw-text-muted">{p.einheit}</td>
      <td className="px-4 py-3 text-right tabular-nums font-medium">
        {netto.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
      </td>
    </tr>
  )
}

type Tab = 'schritte' | 'positionen' | 'aktivitaet' | 'dokumente'

export function AngebotDetailPageClient({
  detail,
  timeline: timelineInitial,
  auftragId,
  gewerke,
  wizardPreislisten,
  wizardFirm,
  lead,
}: {
  detail: AngebotDetail
  timeline: LeadTimelineRow[]
  auftragId: string | null
  gewerke: Gewerk[]
  wizardPreislisten: Preisliste[]
  wizardFirm: FirmenEinstellungen
  lead: LeadDetail | null
}) {
  const router = useRouter()
  const { refresh } = useCrmRefresh()
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
  const [verlaengernOpen, setVerlaengernOpen] = useState(false)
  const [verlaengernDatum, setVerlaengernDatum] = useState(() => {
    const raw = detail.gueltig_bis?.slice(0, 10)
    if (raw && raw > heuteYmd()) return raw
    return addDaysYmd(heuteYmd(), 30)
  })

  const statusEinfach = resolveStatusEinfach(detail)
  const kannVerlaengern = statusEinfach === 'gesendet' || statusEinfach === 'abgelaufen'

  const positionBlocks = useMemo(
    () => groupAngebotPositionenByBlock(detail.positionen ?? [], gewerke),
    [detail.positionen, gewerke]
  )
  const mehrereGewerke = positionBlocks.length > 1

  const kannBearbeiten =
    (statusEinfach === 'entwurf' || statusEinfach === 'gesendet' || statusEinfach === 'abgelaufen') &&
    angebotDarfImWizardBearbeitetWerden(detail.status)

  function openWizardBearbeiten() {
    if (!kannBearbeiten) {
      toast.error('Dieses Angebot kann nicht mehr bearbeitet werden.')
      return
    }
    if (!detail.lead_id || !lead) {
      router.push(`/angebote/neu?angebot_id=${detail.id}`)
      return
    }
    startTransition(async () => {
      const res = await loadAngebotWizardBootstrap(detail.id, detail.lead_id!)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      setWizardBootstrap(res.bootstrap)
      setWizardSessionKey((k) => k + 1)
      setWizardOpen(true)
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

  const headSub = [
    betragAnzeige(detail.gesamt_fix, detail.gesamt_min, detail.gesamt_max),
    detail.gueltig_bis ? `gültig bis ${formatDatum(detail.gueltig_bis)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  function openVerlaengernModal() {
    const raw = detail.gueltig_bis?.slice(0, 10)
    setVerlaengernDatum(raw && raw > heuteYmd() ? raw : addDaysYmd(heuteYmd(), 30))
    setVerlaengernOpen(true)
  }

  const mailCompose = useKundenMailCompose()
  const kundeEmail = kunde?.email?.trim() ?? ''

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

    if (workflow.length > 0) {
      items.push('sep', ...workflow)
    }

    items.push('sep', {
      label: 'PDF herunterladen',
      icon: <Download className="h-[15px] w-[15px]" aria-hidden />,
      onClick: () => window.open(`/api/angebote/${detail.id}/pdf`, '_blank'),
    })

    return items
  }, [
    kannBearbeiten,
    kundeEmail,
    detail.id,
    kannVerlaengern,
    statusEinfach,
    mailCompose,
  ])

  const primaryAction = (() => {
    if (statusEinfach === 'entwurf') {
      return (
        <button
          type="button"
          className="btn btn-primary btn-sm inline-flex gap-1.5"
          disabled={pending}
          onClick={() => run(() => sendAngebotEinfach(detail.id), 'Angebot gesendet')}
        >
          Angebot senden
          <Send className="h-3.5 w-3.5" aria-hidden />
        </button>
      )
    }
    if (statusEinfach === 'gesendet' || statusEinfach === 'abgelaufen') {
      return (
        <button
          type="button"
          className="btn btn-primary btn-sm inline-flex gap-1.5"
          disabled={pending}
          onClick={() => {
            setAufBetreff('')
            setAufTo([])
            setAufCc([])
            setAufPreviewHtml('')
            setAcceptOpen(true)
          }}
        >
          <Check className="h-3.5 w-3.5" aria-hidden />
          Angebot annehmen
        </button>
      )
    }
    if (statusEinfach === 'angenommen' && auftragId) {
      return (
        <Link href={`/auftraege/${auftragId}`} className="btn btn-primary btn-sm inline-flex gap-1.5">
          Zum Auftrag
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
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

  const adresse = kunde
    ? [kunde.strasse, kunde.hausnummer, kunde.plz, kunde.ort].filter(Boolean).join(' ')
    : '—'

  const naechsteSchritte = useMemo(
    () =>
      buildAngebotNaechsteSchritte({
        status: statusEinfach,
        angebotId: detail.id,
        leadId: detail.lead_id,
        auftragId,
        onSenden:
          statusEinfach === 'entwurf'
            ? () => run(() => sendAngebotEinfach(detail.id), 'Angebot gesendet')
            : undefined,
        onAnnehmen:
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
    [statusEinfach, detail.id, detail.lead_id, auftragId]
  )

  const offeneSchritteCount = useMemo(
    () => naechsteSchritte.filter((s) => !s.done).length,
    [naechsteSchritte]
  )

  const detailTabs = useMemo(
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
        count: (detail.positionen?.length ?? 0) || undefined,
      },
      {
        id: 'aktivitaet',
        label: ACTIVITY_SECTIONS.verlauf,
        icon: History,
        count: timelineCount || undefined,
      },
      {
        id: 'dokumente',
        label: ACTIVITY_SECTIONS.dokumente,
        icon: Paperclip,
        count: anhaengeCount || undefined,
      },
    ],
    [offeneSchritteCount, detail.positionen?.length, timelineCount, anhaengeCount]
  )

  const formatEur = (n: number) =>
    n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

  const kundeCard = (
    <Card collapsible title="Kunde">
      <div className="props">
        <DetailProp label="Name">{kundeName}</DetailProp>
        <DetailProp label="Telefon">
          {kunde?.telefon ? (
            <a href={`tel:${kunde.telefon.replace(/\s/g, '')}`} className="text-bw-link">
              {kunde.telefon}
            </a>
          ) : (
            '—'
          )}
        </DetailProp>
        <DetailProp label="E-Mail">
          {kunde?.email ? (
            <a href={`mailto:${kunde.email}`} className="text-bw-link">
              {kunde.email}
            </a>
          ) : (
            '—'
          )}
        </DetailProp>
        <DetailProp label="Adresse">{adresse || '—'}</DetailProp>
        <DetailProp label="Kundentyp">{kunde?.typ ? kundentypLabel(kunde.typ) : '—'}</DetailProp>
      </div>
    </Card>
  )

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
        <DetailProp label="Zahlungsbedingungen">{zahlungLabel}</DetailProp>
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
    <div className="overflow-hidden rounded-lg border border-bw-border">
      <PositionenMobileListe blocks={positionBlocks} mehrereGewerke={mehrereGewerke} />
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bw-border text-xs text-bw-text-muted">
              <th className="px-4 py-2 text-left font-medium">Leistung</th>
              <th className="px-4 py-2 text-right font-medium">Menge</th>
              <th className="px-4 py-2 text-left font-medium">Einheit</th>
              <th className="px-4 py-2 text-right font-medium">€</th>
            </tr>
          </thead>
          <tbody>
            {positionBlocks.map((block) => (
              <Fragment key={block.key}>
                {mehrereGewerke ? (
                  <tr className="bg-bw-hover/40">
                    <td
                      colSpan={4}
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-bw-text-muted"
                    >
                      {block.titel}
                    </td>
                  </tr>
                ) : null}
                {block.entries.map((entry, idx) =>
                  entry.kind === 'freitext' ? (
                    <tr key={`${block.key}-ft-${idx}`} className="border-b border-bw-border align-top">
                      <td colSpan={4} className="px-4 py-3">
                        {entry.freitext.titel ? (
                          <div className="text-xs font-semibold text-bw-text-muted">{entry.freitext.titel}</div>
                        ) : null}
                        {entry.freitext.text ? (
                          <RichTextContent html={entry.freitext.text} className="mt-0.5 text-sm text-bw-text-muted" />
                        ) : null}
                      </td>
                    </tr>
                  ) : (
                    <PositionenZeile key={entry.position.id || `${block.key}-${idx}`} p={entry.position} />
                  )
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-bw-border px-4 py-3 text-sm">
        <div className="flex justify-between py-1">
          <span className="text-bw-text-muted">Netto</span>
          <span className="tabular-nums">{formatEur(summen.netto)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-bw-text-muted">MwSt {summen.mwstSatz}%</span>
          <span className="tabular-nums">{formatEur(summen.mwst)}</span>
        </div>
        <div className="flex justify-between border-t border-bw-border pt-2 font-semibold text-bw-primary">
          <span>Brutto</span>
          <span className="tabular-nums">{formatEur(summen.brutto)}</span>
        </div>
      </div>
    </div>
  )

  const fixedOverview = (
    <div className="space-y-3">
      {kundeCard}
      {angebotsdatenCard}
      <KommunikationCard
        filter={{ angebotId: detail.id, kundeId: detail.kunde_id ?? undefined }}
        reloadKey={mailCompose.reloadKey}
      />
    </div>
  )

  const tabContent =
    tab === 'schritte' ? (
      <NaechsteSchritteCard steps={naechsteSchritte} />
    ) : tab === 'positionen' ? (
      positionenTab
    ) : tab === 'aktivitaet' ? (
      <LeadTimelineList
        events={timelineInitial}
        fallbackCreatedAt={detail.created_at}
        fallbackCreatedLabel={`Erstellt am ${formatDatumZeit(detail.created_at)}`}
      />
    ) : (
      <AngebotAnhaengeTab detail={detail} />
    )

  return (
    <div className="space-y-4 pb-6">
      <DetailHead
        backHref="/angebote"
        backLabel="Zurück zu Angebote"
        title={
          <div className="detail-head-title-row">
            <span>{kundeName}</span>
            <AngebotEinfachStatusBadge status={statusEinfach} />
          </div>
        }
        sub={headSub}
        actions={
          <>
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
          </>
        }
      />

      {statusEinfach === 'abgelehnt' ? (
        <p className="rounded-lg border border-bw-border px-3 py-2 text-sm text-bw-text-muted">
          Abgelehnt
          {detail.updated_at ? ` am ${formatDatum(detail.updated_at)}` : ''}
          {detail.ablehnung_grund ? ` — ${detail.ablehnung_grund}` : ''}
        </p>
      ) : null}

      {fixedOverview}

      <DetailScreenShell tabs={<DetailTabBar tabs={detailTabs} value={tab} onChange={(id) => setTab(id as Tab)} />}>
        <div className="min-w-0 space-y-3">{tabContent}</div>
      </DetailScreenShell>

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

      {mailCompose.modal}
    </div>
  )
}
