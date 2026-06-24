'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Accordion } from '@/components/ui/Accordion'
import { ActionsMenu, type ActionsMenuItem } from '@/components/ui/actions-menu'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DetailTabBar } from '@/components/ui/detail-tab-bar'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { FormSheet } from '@/components/ui/FormSheet'
import { useIsMobile } from '@/hooks/useIsMobile'
import { PropertyRow } from '@/components/ui/PropertyRow'
import { Textarea } from '@/components/ui/Textarea'
import { AuftragStatusBadge } from '@/components/ui/AuftragStatusBadge'
import { ComplianceBadge } from '@/components/handwerker/ComplianceBadge'
import { HandwerkerComplianceTab } from '@/components/handwerker/HandwerkerComplianceTab'
import { ProjektComplianceCheckliste } from '@/components/handwerker/ProjektComplianceCheckliste'
import { standardDokumente } from '@/lib/handwerker/compliance-katalog'
import { DetailHead } from '@/components/layout/DetailHead'
import { AppDetailScreen } from '@/components/layout/app'
import {
  Briefcase,
  FileSignature,
  FileText,
  LayoutGrid,
  MoreHorizontal,
  Phone,
  Mail,
  Pencil,
  Shield,
  MessageSquare,
  Star,
  User,
} from 'lucide-react'
import { ClientOnly } from '@/components/ui/ClientOnly'
import { RahmenvertragWizard } from '@/components/vertraege/RahmenvertragWizard'
import {
  loadRahmenVertragBootstrap,
  type RahmenVertragWizardBootstrap,
} from '@/app/(dashboard)/vertraege/wizard-actions'
import type { HandwerkerVertragRow } from '@/lib/vertraege/types'
import { toast } from '@/components/ui/app-toast'
import type { HandwerkerDetailPayload } from '@/app/(dashboard)/handwerker/actions'
import {
  formatHandwerkerBewertung,
  HANDWERKER_BEWERTUNG_KATEGORIEN,
} from '@/lib/handwerker/bewertung-kategorien'
import {
  updateHandwerker,
  updateHandwerkerNotizen,
  getPartnerPortalLoginHint,
  type HandwerkerFormInput,
} from '@/app/(dashboard)/handwerker/actions'
import {
  handwerkerDisplayName,
  handwerkerGfName,
  normalizeHandwerkerNamen,
  validateHandwerkerStammPflicht,
} from '@/lib/handwerker-stammdaten'
import { StammdatenVerknuepfungen } from '@/components/stammdaten/StammdatenVerknuepfungen'
import type { StammdatenKontaktTreffer } from '@/lib/stammdaten-kontakt'
import {
  getPartnerPortalMailDraft,
  previewPartnerPortalMail,
  sendPartnerPortalLinkMail,
} from '@/app/actions/mails'
import { parseEmailTokens } from '@/lib/email-recipients'
import {
  buildPartnerDashboardLink,
} from '@/lib/portal-utils'
import type { ComplianceDokumentTyp, Gewerk, Handwerker } from '@/lib/types'

function gewerkSlugsFromField(gewerke: unknown): string[] {
  if (gewerke == null) return []
  if (Array.isArray(gewerke)) {
    return gewerke
      .map((x) => (typeof x === 'string' ? x.trim().toLowerCase() : ''))
      .filter(Boolean)
  }
  if (typeof gewerke === 'string') {
    try {
      const p = JSON.parse(gewerke) as unknown
      return gewerkSlugsFromField(p)
    } catch {
      return gewerke.trim() ? [gewerke.trim().toLowerCase()] : []
    }
  }
  return []
}

function gewerkTagsFromSlugs(
  gewerke: unknown,
  slugToName: Map<string, string>
): string[] {
  return gewerkSlugsFromField(gewerke).map((slug) => slugToName.get(slug) ?? slug)
}

function isAuftragAbgeschlossen(auftragStatus: string): boolean {
  return auftragStatus === 'abgeschlossen' || auftragStatus === 'storniert'
}

export function HandwerkerDetailClient({
  payload,
  gewerkeSlugs,
  gewerke = [],
  complianceTypen,
  rahmenVertrag = null,
  verwandteStammdaten = [],
}: {
  payload: HandwerkerDetailPayload
  gewerkeSlugs: { slug: string; name: string }[]
  gewerke?: Gewerk[]
  complianceTypen: ComplianceDokumentTyp[]
  rahmenVertrag?: HandwerkerVertragRow | null
  verwandteStammdaten?: StammdatenKontaktTreffer[]
}) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const hw = payload.handwerker as Handwerker
  const slugToName = useMemo(
    () => new Map(gewerkeSlugs.map((g) => [g.slug.toLowerCase(), g.name])),
    [gewerkeSlugs]
  )
  const gewerkNamen = useMemo(() => gewerkTagsFromSlugs(hw.gewerke, slugToName), [hw.gewerke, slugToName])
  const hwGewerkSlugs = useMemo(() => gewerkSlugsFromField(hw.gewerke), [hw.gewerke])
  const dokumenteAnzahl = useMemo(
    () => standardDokumente(payload.dokumente).length,
    [payload.dokumente]
  )

  const [tab, setTab] = useState<'stammdaten' | 'auftraege' | 'compliance' | 'notizen'>('stammdaten')
  const [notizen, setNotizen] = useState(hw.notizen ?? '')
  const notizenTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [rahmenWizardOpen, setRahmenWizardOpen] = useState(false)
  const [rahmenWizardBootstrap, setRahmenWizardBootstrap] =
    useState<RahmenVertragWizardBootstrap | null>(null)
  const [rahmenWizardKey, setRahmenWizardKey] = useState(0)
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  const [portalModalOpen, setPortalModalOpen] = useState(false)
  const [portalSending, setPortalSending] = useState(false)
  const [portalLink, setPortalLink] = useState('')
  const [portalTo, setPortalTo] = useState('')
  const [portalCc, setPortalCc] = useState('')
  const [portalBetreff, setPortalBetreff] = useState('')
  const [portalText, setPortalText] = useState('')
  const [portalHtml, setPortalHtml] = useState('')
  const [hasPortalAccount, setHasPortalAccount] = useState(false)

  const legacyKontakt = normalizeHandwerkerNamen(hw)
  const [formFirma, setFormFirma] = useState(legacyKontakt.firma)
  const [formVorname, setFormVorname] = useState(legacyKontakt.vorname)
  const [formNachname, setFormNachname] = useState(legacyKontakt.nachname)
  const [formTelefon, setFormTelefon] = useState(hw.telefon ?? '')
  const [formEmail, setFormEmail] = useState(hw.email ?? '')
  const [formAdresse, setFormAdresse] = useState(hw.adresse ?? '')

  useEffect(() => {
    setNotizen(hw.notizen ?? '')
  }, [hw.id, hw.notizen])

  useEffect(() => {
    if (modalOpen) {
      const k = normalizeHandwerkerNamen(hw)
      setFormFirma(k.firma)
      setFormVorname(k.vorname)
      setFormNachname(k.nachname)
      setFormTelefon(hw.telefon ?? '')
      setFormEmail(hw.email ?? '')
      setFormAdresse(hw.adresse ?? '')
      setErr(null)
    }
  }, [modalOpen, hw])

  useEffect(() => {
    void (async () => {
      const hint = await getPartnerPortalLoginHint(hw.id)
      if (hint.ok) {
        setPortalLink(hint.loginLink)
        setHasPortalAccount(hint.hasAuthAccount)
      } else {
        setPortalLink(buildPartnerDashboardLink())
      }
    })()
  }, [hw.id])

  useEffect(() => {
    if (notizenTimer.current) clearTimeout(notizenTimer.current)
    notizenTimer.current = setTimeout(() => {
      const t = notizen.trim()
      if (t === (hw.notizen ?? '').trim()) return
      void (async () => {
        const r = await updateHandwerkerNotizen(hw.id, t || null)
        if (!r.ok) setErr(r.message)
        else router.refresh()
      })()
    }, 800)
    return () => {
      if (notizenTimer.current) clearTimeout(notizenTimer.current)
    }
  }, [notizen, hw.id, hw.notizen, router])

  const { aktiv: aktivAuftraege, fertig: fertigeAuftraege } = useMemo(() => {
    type AuftragZeile = HandwerkerDetailPayload['auftraege'][number]
    const aktiv: AuftragZeile[] = []
    const fertig: AuftragZeile[] = []
    for (const a of payload.auftraege) {
      if (isAuftragAbgeschlossen(a.auftrag_status)) fertig.push(a)
      else aktiv.push(a)
    }
    return { aktiv, fertig }
  }, [payload.auftraege])

  const openRahmenvertrag = useCallback(() => {
    startTransition(async () => {
      const res = await loadRahmenVertragBootstrap(hw.id, rahmenVertrag?.id ?? null)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      setRahmenWizardBootstrap(res.bootstrap)
      setRahmenWizardKey((k) => k + 1)
      setRahmenWizardOpen(true)
    })
  }, [hw.id, rahmenVertrag?.id])

  const saveKontaktModal = useCallback(() => {
    const pflicht = validateHandwerkerStammPflicht({
      firma: formFirma,
      vorname: formVorname,
      nachname: formNachname,
    })
    if (pflicht) {
      setErr(pflicht)
      return
    }
    const input: HandwerkerFormInput = {
      firma: formFirma.trim() || null,
      vorname: formVorname.trim() || null,
      nachname: formNachname.trim() || null,
      email: formEmail.trim() || null,
      telefon: formTelefon.trim() || null,
      whatsapp: hw.whatsapp?.trim() || null,
      webseite: hw.webseite?.trim() || null,
      adresse: formAdresse.trim() || null,
      gewerke: hw.gewerke ?? [],
      subkategorie: hw.subkategorie,
      ist_fachbetrieb: hw.ist_fachbetrieb,
      partner_kategorie_id: hw.partner_kategorie_id,
      steuernummer: hw.steuernummer?.trim() || null,
      ustid: hw.ustid?.trim() || null,
      iban: hw.iban?.replace(/\s+/g, '') || null,
      aktiv: hw.aktiv,
      notizen: hw.notizen?.trim() || null,
    }
    startTransition(async () => {
      const r = await updateHandwerker(hw.id, input)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      setModalOpen(false)
      setErr(null)
      router.refresh()
    })
  }, [
    formFirma,
    formVorname,
    formNachname,
    formEmail,
    formTelefon,
    formAdresse,
    hw,
    router,
  ])

  async function openPortalModal() {
    const draft = await getPartnerPortalMailDraft(hw.id)
    if (!draft.ok) {
      toast.error(draft.message)
      return
    }
    setPortalLink(draft.portalLink)
    setPortalTo(draft.to)
    setPortalCc(draft.cc.join('; '))
    setPortalBetreff(draft.betreff)
    setPortalText(draft.text)
    setPortalHtml(draft.html)
    setPortalModalOpen(true)
  }

  async function sendenPortalLink() {
    setPortalSending(true)
    const toList = parseEmailTokens(portalTo)
    const ccList = parseEmailTokens(portalCc)
    const toPrimary = toList[0] ?? ''
    const ccMerged = [...ccList, ...toList.slice(1)].filter(Boolean)
    const res = await sendPartnerPortalLinkMail({
      handwerkerId: hw.id,
      to: toPrimary,
      cc: ccMerged,
      betreff: portalBetreff,
      text: portalText,
    })
    setPortalSending(false)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    toast.success('Partner-Portal-Einladung gesendet')
    setPortalModalOpen(false)
  }

  useEffect(() => {
    if (!portalModalOpen) return
    const timer = setTimeout(() => {
      void (async () => {
        const preview = await previewPartnerPortalMail({
          handwerkerId: hw.id,
          text: portalText,
        })
        if (!preview.ok) return
        setPortalHtml(preview.html)
      })()
    }, 300)
    return () => clearTimeout(timer)
  }, [portalModalOpen, portalText, hw.id])

  const handwerkerMenuItems = useMemo((): ActionsMenuItem[] => {
    return [
      {
        label: 'Partner-Portal-Einladung',
        icon: <FileText className="h-4 w-4" aria-hidden />,
        hint: !hw.email ? 'Keine E-Mail' : undefined,
        onClick: () => void openPortalModal(),
      },
    ]
  }, [hw.email])

  const sidebar = (
    <>
      <Card
        title="Kontakt"
        action={
          <button type="button" onClick={() => setModalOpen(true)} className="btn btn-ghost btn-sm">
            <Pencil className="h-3.5 w-3.5" />
            Bearbeiten
          </button>
        }
      >
        <div className="space-y-1">
          <PropertyRow label="Firmenname" value={handwerkerDisplayName(hw)} editable={false} />
          <PropertyRow
            label="Geschäftsführer"
            value={handwerkerGfName(hw) || '—'}
            editable={false}
          />
          <PropertyRow
            label="Telefon"
            value={
              hw.telefon ? (
                <a href={`tel:${String(hw.telefon).replace(/\s/g, '')}`} className="text-bw-link hover:underline">
                  {hw.telefon}
                </a>
              ) : (
                '—'
              )
            }
            editable={false}
          />
          <PropertyRow
            label="E-Mail"
            value={
              hw.email ? (
                <a href={`mailto:${hw.email}`} className="text-bw-link hover:underline">
                  {hw.email}
                </a>
              ) : (
                '—'
              )
            }
            editable={false}
          />
          <PropertyRow label="Adresse" value={hw.adresse || '—'} editable={false} />
        </div>
      </Card>

      <StammdatenVerknuepfungen verwandte={verwandteStammdaten} />

      <Card title="Gewerke">
        <div className="flex flex-wrap gap-2">
          {gewerkNamen.length === 0 ? (
            <p className="text-sm text-bw-text-muted">Keine Gewerke hinterlegt.</p>
          ) : (
            gewerkNamen.map((n) => (
              <span key={n} className="rounded-full bg-bw-hover px-2.5 py-1 text-xs font-medium text-bw-text">
                {n}
              </span>
            ))
          )}
        </div>
      </Card>

      <Card title="Dokumente">
        <p className="text-sm text-bw-text">
          <span className="font-medium tabular-nums">{dokumenteAnzahl}</span>
          {' '}
          {dokumenteAnzahl === 1 ? 'Dokument' : 'Dokumente'} hochgeladen
        </p>
        {rahmenVertrag?.pdf_url ? (
          <p className="mt-2 text-sm">
            <a
              href={rahmenVertrag.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-bw-link hover:underline"
            >
              Rahmenvertrag {rahmenVertrag.vertrags_nr}
            </a>
          </p>
        ) : null}
        <p className="mt-2 text-sm text-bw-text-muted">
          Unter Tab „Compliance“ Dateien hochladen, ansehen und löschen.
        </p>
      </Card>

      <Card title="Bank & Steuer">
        <div className="space-y-1">
          <PropertyRow label="IBAN" value={hw.iban || '—'} editable={false} />
          <PropertyRow label="USt-ID" value={hw.ustid || '—'} editable={false} />
        </div>
      </Card>

      {(hw.bewertung_anzahl ?? 0) > 0 ? (
        <Card title="Bewertungen">
          <div className="mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 fill-amber-400 text-amber-500" aria-hidden />
            <span className="text-2xl font-semibold tabular-nums text-bw-text">
              {formatHandwerkerBewertung(hw.bewertung_gesamt)}
            </span>
            <span className="text-sm text-bw-text-muted">
              Ø · {hw.bewertung_anzahl} {hw.bewertung_anzahl === 1 ? 'Bewertung' : 'Bewertungen'}
            </span>
          </div>
          <div className="space-y-2">
            {HANDWERKER_BEWERTUNG_KATEGORIEN.map((kat) => {
              const keyMap = {
                qualitaet: hw.bewertung_qualitaet,
                termintreue: hw.bewertung_termintreue,
                sauberkeit: hw.bewertung_sauberkeit,
                kommunikation: hw.bewertung_kommunikation,
                preis_leistung: hw.bewertung_preis_leistung,
              } as const
              const val = keyMap[kat.key]
              return (
                <div key={kat.key} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-bw-text-muted">{kat.label}</span>
                  <span className="inline-flex items-center gap-1 font-medium tabular-nums text-bw-text">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-500" aria-hidden />
                    {formatHandwerkerBewertung(val)}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      ) : null}
    </>
  )

  const detailTabs = useMemo(
    () => [
      { id: 'stammdaten', label: 'Übersicht', icon: LayoutGrid },
      {
        id: 'auftraege',
        label: 'Aufträge',
        icon: Briefcase,
        count: aktivAuftraege.length + fertigeAuftraege.length || undefined,
      },
      {
        id: 'notizen',
        label: 'Notizen',
        icon: MessageSquare,
        count: hw.notizen?.trim() ? 1 : undefined,
      },
      {
        id: 'compliance',
        label: 'Compliance',
        icon: Shield,
        count: dokumenteAnzahl || undefined,
      },
    ],
    [aktivAuftraege.length, fertigeAuftraege.length, hw.notizen, dokumenteAnzahl]
  )

  const tabAuftraege = (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-bw-text-muted">Aktive Aufträge</h3>
        {aktivAuftraege.length === 0 ? (
          <p className="text-sm text-bw-text-muted">Keine laufenden Aufträge.</p>
        ) : (
          <ul className="space-y-3">
            {aktivAuftraege.map((a) => (
              <li key={a.id}>
                <Card className="p-4 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-bw-text">{a.kunde_name ?? '—'}</p>
                      <p className="mt-0.5 text-sm text-bw-text-muted">{a.titel ?? 'Ohne Titel'}</p>
                      <div className="mt-2">
                        <AuftragStatusBadge status={a.auftrag_status} />
                      </div>
                    </div>
                    <Link href={`/auftraege/${a.id}`} className="btn btn-secondary btn-sm shrink-0">
                      Zum Auftrag
                    </Link>
                  </div>
                  <div className="border-t border-bw-border pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-bw-text-muted">
                      Projekt-Compliance
                    </p>
                    <ProjektComplianceCheckliste
                      handwerkerId={hw.id}
                      auftragId={a.id}
                      auftragTitel={a.titel}
                      dokumente={payload.dokumente}
                      complianceTypen={complianceTypen}
                      handwerkerGewerke={hwGewerkSlugs}
                      gewerke={gewerke}
                      compact
                      showAuftragLink
                    />
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Accordion title={`Abgeschlossene Aufträge (${fertigeAuftraege.length})`} defaultOpen={false}>
        {fertigeAuftraege.length === 0 ? (
          <p className="pt-1 text-sm text-bw-text-muted">Keine abgeschlossenen Aufträge.</p>
        ) : (
          <ul className="space-y-3 pt-1">
            {fertigeAuftraege.map((a) => (
              <li key={a.id}>
                <Card className="p-4 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-bw-text">{a.kunde_name ?? '—'}</p>
                      <p className="mt-0.5 text-sm text-bw-text-muted">{a.titel ?? 'Ohne Titel'}</p>
                      <div className="mt-2">
                        <AuftragStatusBadge status={a.auftrag_status} />
                      </div>
                    </div>
                    <Link href={`/auftraege/${a.id}`} className="btn btn-secondary btn-sm shrink-0">
                      Zum Auftrag
                    </Link>
                  </div>
                  <div className="border-t border-bw-border pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-bw-text-muted">
                      Projekt-Compliance
                    </p>
                    <ProjektComplianceCheckliste
                      handwerkerId={hw.id}
                      auftragId={a.id}
                      auftragTitel={a.titel}
                      dokumente={payload.dokumente}
                      complianceTypen={complianceTypen}
                      handwerkerGewerke={hwGewerkSlugs}
                      gewerke={gewerke}
                      compact
                      showAuftragLink
                    />
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Accordion>
    </div>
  )

  const tabNotizen = (
    <Card>
      <div className="space-y-2">
        <label className="input-label" htmlFor="hw-notizen">
          Notizen
        </label>
        <Textarea
          id="hw-notizen"
          rows={12}
          value={notizen}
          onChange={(e) => setNotizen(e.target.value)}
          placeholder="Notizen zum Handwerker…"
          className="min-h-[200px]"
        />
        <p className="text-xs text-bw-text-muted">Wird automatisch gespeichert.</p>
        {err ? <p className="text-sm text-status-cancel-text">{err}</p> : null}
      </div>
    </Card>
  )

  const tabCompliance = (
    <HandwerkerComplianceTab
      handwerkerId={hw.id}
      handwerkerGewerke={hwGewerkSlugs}
      gewerke={gewerke}
      dokumente={payload.dokumente}
      complianceTypen={complianceTypen}
      rahmenVertrag={rahmenVertrag}
    />
  )

  return (
    <>
      <DetailHead
        backHref="/handwerker"
        backLabel="Zurück zu Handwerker"
        title={handwerkerDisplayName(hw)}
        sub={
          <span>
            {handwerkerGfName(hw) ? `${handwerkerGfName(hw)} · ` : null}
            {hw.subkategorie ?? 'Handwerker'}
            {gewerkNamen.length ? ` · ${gewerkNamen.slice(0, 3).join(', ')}` : null}
            {hw.adresse ? ` · ${hw.adresse}` : null}
          </span>
        }
        badges={<ComplianceBadge status={hw.compliance_status} />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {hasPortalAccount ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900">
                Portal-Konto aktiv
              </span>
            ) : null}
            <button type="button" className="btn btn-secondary btn-sm" onClick={openRahmenvertrag}>
              <FileSignature className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Rahmenvertrag
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
              <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Bearbeiten
            </button>
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
              items={handwerkerMenuItems}
              sheetTitle="Handwerker"
            />
          </div>
        }
      />

      <AppDetailScreen
        tabs={<DetailTabBar tabs={detailTabs} value={tab} onChange={(id) => setTab(id as typeof tab)} />}
      >
        <div className="min-w-0 space-y-3">
          {tab === 'stammdaten' ? sidebar : null}
          {tab === 'auftraege' ? tabAuftraege : null}
          {tab === 'notizen' ? tabNotizen : null}
          {tab === 'compliance' ? tabCompliance : null}
        </div>
      </AppDetailScreen>

      {(() => {
        const editForm = (
          <div className="space-y-4">
            {err ? <p className="text-sm text-status-cancel-text">{err}</p> : null}
            <Input label="Firmenname *" value={formFirma} onChange={(e) => setFormFirma(e.target.value)} />
            <div className="form-grid-2 grid gap-3 md:grid-cols-2">
              <Input
                label="Vorname (Geschäftsführer)"
                value={formVorname}
                onChange={(e) => setFormVorname(e.target.value)}
              />
              <Input
                label="Nachname (Geschäftsführer)"
                value={formNachname}
                onChange={(e) => setFormNachname(e.target.value)}
              />
            </div>
            <Input label="Telefon" type="tel" value={formTelefon} onChange={(e) => setFormTelefon(e.target.value)} />
            <Input label="E-Mail" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
            <Input label="Adresse" value={formAdresse} onChange={(e) => setFormAdresse(e.target.value)} />
          </div>
        )
        const editFooter = (
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" variant="primary" className="flex-1" onClick={saveKontaktModal} disabled={pending}>
              Speichern
            </Button>
          </div>
        )
        if (isMobile) {
          return (
            <FormSheet
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              breadcrumb="Handwerker"
              title="Bearbeiten"
              footer={editFooter}
            >
              {editForm}
            </FormSheet>
          )
        }
        return (
          <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Handwerker bearbeiten" size="md">
            {editForm}
            <div className="mt-4">{editFooter}</div>
          </Modal>
        )
      })()}

      <Modal
        open={portalModalOpen}
        onClose={() => setPortalModalOpen(false)}
        title="Partner-Portal-Einladung senden"
        size="lg"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setPortalModalOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" onClick={() => void sendenPortalLink()} loading={portalSending}>
              Senden
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            label="An"
            value={portalTo}
            onChange={(e) => setPortalTo(e.target.value)}
            placeholder="partner@beispiel.de; weitere@beispiel.de"
          />
          <Input
            label="CC (optional)"
            value={portalCc}
            onChange={(e) => setPortalCc(e.target.value)}
            placeholder="intern@baerenwald.de; team@baerenwald.de"
          />
          <Input label="Betreff" value={portalBetreff} onChange={(e) => setPortalBetreff(e.target.value)} />
          <Textarea label="Text" rows={6} value={portalText} onChange={(e) => setPortalText(e.target.value)} />
          <div>
            <p className="mb-1 text-xs font-medium text-bw-text-muted">Mail-Vorschau</p>
            <iframe
              title="Partner-Portal Mail Vorschau"
              sandbox="allow-same-origin"
              className="h-[300px] w-full rounded-lg border border-bw-border bg-white"
              srcDoc={portalHtml}
            />
          </div>
          <Input
            label="Partner-Portal Login"
            value={portalLink}
            readOnly
            className="bg-bw-bg-soft"
          />
          <p className="text-xs text-bw-text-muted">
            Der Button in der Mail führt zu <strong>/partner</strong>. Mehrere Adressen in „An“/„CC“ mit Semikolon
            trennen.
          </p>
        </div>
      </Modal>

      {rahmenWizardOpen && rahmenWizardBootstrap ? (
        <ClientOnly>
          <RahmenvertragWizard
            key={rahmenWizardKey}
            bootstrap={rahmenWizardBootstrap}
            onClose={() => {
              setRahmenWizardOpen(false)
              setRahmenWizardBootstrap(null)
            }}
            onDone={() => router.refresh()}
          />
        </ClientOnly>
      ) : null}
    </>
  )
}
