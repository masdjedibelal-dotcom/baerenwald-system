'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { CrmInlineLoading } from '@/components/layout/CrmPageLoading'
import { DetailActionsBar } from '@/components/layout/DetailActionsBar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { InlineEditField, InlineEditSection } from '@/components/ui/InlineEditSection'
import { ComplianceBadge } from '@/components/handwerker/ComplianceBadge'
import { HandwerkerComplianceUnterlagenTable } from '@/components/handwerker/HandwerkerComplianceUnterlagenTable'
import {
  filterStandardComplianceTypen,
  standardDokumente,
  dokumentFuerTyp,
  complianceDokumentStatus,
} from '@/lib/handwerker/compliance-katalog'
import { buildPartnerWirtschaft } from '@/lib/handwerker/partner-wirtschaft'
import { DetailHead } from '@/components/layout/DetailHead'
import { DetailShell, type DetailShellGroup } from '@/components/mock-ui/DetailShell'
import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { MockIcon, mockMenuIcon } from '@/components/mock-ui/MockIcon'
import { HandwerkerWirtschaftlicheUebersicht } from '@/components/handwerker/HandwerkerWirtschaftlicheUebersicht'
import { MockDetailBackLink } from '@/components/mock-ui/MockDetailBackLink'
import { MockNotizenCard, MockNotizComposer } from '@/components/mock-ui/MockDetailCards'
import { NextStepBar } from '@/components/crm/NaechsterSchrittBanner'
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
  type HandwerkerBewertungKategorieKey,
} from '@/lib/handwerker/bewertung-kategorien'
import {
  updateHandwerker,
  updateHandwerkerNotizen,
  getPartnerPortalLoginHint,
  setHandwerkerPortalGesperrt,
  type HandwerkerFormInput,
} from '@/app/(dashboard)/handwerker/actions'
import {
  handwerkerDisplayName,
  handwerkerGfName,
  normalizeHandwerkerNamen,
  validateHandwerkerStammPflicht,
} from '@/lib/handwerker-stammdaten'
import {
  getPartnerPortalMailDraft,
  previewPartnerPortalMail,
  sendPartnerPortalLinkMail,
} from '@/app/actions/mails'
import { parseEmailTokens } from '@/lib/email-recipients'
import { buildPartnerDashboardLink } from '@/lib/portal-utils'
import type { ComplianceDokumentTyp, Gewerk, Handwerker } from '@/lib/types'
import { useIsCrmAdmin } from '@/hooks/useIsCrmAdmin'
import { openPortalAsHandwerker } from '@/app/(dashboard)/impersonation/actions'
import { buildEntityMenu, entityMenuToActionItems } from '@/lib/entity-menu'
import { runDuplicateHandwerker } from '@/lib/list-actions'
import {
  FabVorgangStartModal,
  type FabVorgangArt,
} from '@/components/neu/FabVorgangStartModal'
import { VorgaengeListeClient } from '@/components/vorgaenge/VorgaengeListeClient'
import type { VorgangListeRow } from '@/lib/vorgang/types'
import { formatRelativeDate } from '@/lib/utils'

type HandwerkerDetailTab = 'uebersicht' | 'vorgaenge' | 'compliance' | 'akte'

function gewerkSlugsFromField(gewerke: unknown): string[] {
  if (gewerke == null) return []
  if (Array.isArray(gewerke)) {
    return gewerke
      .map((x) => (typeof x === 'string' ? x.trim().toLowerCase() : ''))
      .filter(Boolean)
  }
  if (typeof gewerke === 'string') {
    try {
      return gewerkSlugsFromField(JSON.parse(gewerke) as unknown)
    } catch {
      return gewerke.trim() ? [gewerke.trim().toLowerCase()] : []
    }
  }
  return []
}

function gewerkTagsFromSlugs(gewerke: unknown, slugToName: Map<string, string>): string[] {
  return gewerkSlugsFromField(gewerke).map((slug) => slugToName.get(slug) ?? slug)
}

function RatingStars({ value, size = 14 }: { value: number | null | undefined; size?: number }) {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.min(5, Math.max(0, value)) : 0
  const full = Math.floor(n)
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${formatHandwerkerBewertung(n)} von 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <MockIcon
          key={i}
          ctx="default"
          n={i < full ? 'star-filled' : 'star'}
          size={size}
          className={i < full ? 'text-[var(--yel-tx,#c9a227)]' : 'text-[var(--text-4)]'}
        />
      ))}
    </span>
  )
}

function bewertungKategorieWert(
  hw: Handwerker,
  key: HandwerkerBewertungKategorieKey
): number | null {
  const map: Record<HandwerkerBewertungKategorieKey, number | null | undefined> = {
    qualitaet: hw.bewertung_qualitaet,
    termintreue: hw.bewertung_termintreue,
    sauberkeit: hw.bewertung_sauberkeit,
    kommunikation: hw.bewertung_kommunikation,
    preis_leistung: hw.bewertung_preis_leistung,
  }
  const v = map[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export function HandwerkerDetailClient({
  payload,
  gewerkeSlugs,
  gewerke = [],
  complianceTypen,
  rahmenVertrag = null,
  vorgaengeRows = [],
}: {
  payload: HandwerkerDetailPayload
  gewerkeSlugs: { slug: string; name: string }[]
  gewerke?: Gewerk[]
  complianceTypen: ComplianceDokumentTyp[]
  rahmenVertrag?: HandwerkerVertragRow | null
  vorgaengeRows?: VorgangListeRow[]
}) {
  const router = useRouter()
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

  const [tab, setTab] = useState<HandwerkerDetailTab>('uebersicht')
  const [notizen, setNotizen] = useState(hw.notizen ?? '')
  const [notizDraft, setNotizDraft] = useState('')
  const notizenTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [editingKontakt, setEditingKontakt] = useState(false)
  const [editingBank, setEditingBank] = useState(false)
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
  const isCrmAdmin = useIsCrmAdmin()
  const [impersonating, setImpersonating] = useState(false)
  const [vorgangArt, setVorgangArt] = useState<FabVorgangArt | null>(null)
  const [portalGesperrtPending, setPortalGesperrtPending] = useState(false)
  const [istPortalGesperrt, setIstPortalGesperrt] = useState(Boolean(hw.ist_portal_gesperrt))

  useEffect(() => {
    setIstPortalGesperrt(Boolean(hw.ist_portal_gesperrt))
  }, [hw.id, hw.ist_portal_gesperrt])

  function togglePortalGesperrt() {
    const next = !istPortalGesperrt
    const label = next
      ? 'Partner vom Portal ausschließen? Der Betrieb kann sich dann nicht mehr anmelden oder registrieren und sieht den Hinweis, sich an Bärenwald zu wenden.'
      : 'Portal-Ausschluss aufheben? Login und Registrierung sind danach wieder möglich.'
    if (!confirm(label)) return
    setPortalGesperrtPending(true)
    void setHandwerkerPortalGesperrt(hw.id, next).then((r) => {
      setPortalGesperrtPending(false)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      setIstPortalGesperrt(next)
      toast.success(next ? 'Vom Portal ausgeschlossen' : 'Portal-Ausschluss aufgehoben')
      router.refresh()
    })
  }

  const legacyKontakt = normalizeHandwerkerNamen(hw)
  const [formFirma, setFormFirma] = useState(legacyKontakt.firma)
  const [formVorname, setFormVorname] = useState(legacyKontakt.vorname)
  const [formNachname, setFormNachname] = useState(legacyKontakt.nachname)
  const [formTelefon, setFormTelefon] = useState(hw.telefon ?? '')
  const [formEmail, setFormEmail] = useState(hw.email ?? '')
  const [formAdresse, setFormAdresse] = useState(hw.adresse ?? '')
  const [formIban, setFormIban] = useState(hw.iban ?? '')
  const [formUstid, setFormUstid] = useState(hw.ustid ?? '')
  const [formSteuernummer, setFormSteuernummer] = useState(hw.steuernummer ?? '')

  useEffect(() => {
    setNotizen(hw.notizen ?? '')
  }, [hw.id, hw.notizen])

  useEffect(() => {
    if (editingKontakt || editingBank) return
    const k = normalizeHandwerkerNamen(hw)
    setFormFirma(k.firma)
    setFormVorname(k.vorname)
    setFormNachname(k.nachname)
    setFormTelefon(hw.telefon ?? '')
    setFormEmail(hw.email ?? '')
    setFormAdresse(hw.adresse ?? '')
    setFormIban(hw.iban ?? '')
    setFormUstid(hw.ustid ?? '')
    setFormSteuernummer(hw.steuernummer ?? '')
  }, [hw, editingKontakt, editingBank])

  function syncFormFromHw() {
    const k = normalizeHandwerkerNamen(hw)
    setFormFirma(k.firma)
    setFormVorname(k.vorname)
    setFormNachname(k.nachname)
    setFormTelefon(hw.telefon ?? '')
    setFormEmail(hw.email ?? '')
    setFormAdresse(hw.adresse ?? '')
    setFormIban(hw.iban ?? '')
    setFormUstid(hw.ustid ?? '')
    setFormSteuernummer(hw.steuernummer ?? '')
    setErr(null)
  }

  function beginEditKontakt() {
    syncFormFromHw()
    setEditingBank(false)
    setEditingKontakt(true)
  }

  function beginEditBank() {
    syncFormFromHw()
    setEditingKontakt(false)
    setEditingBank(true)
  }

  function cancelEditStamm() {
    setEditingKontakt(false)
    setEditingBank(false)
    syncFormFromHw()
  }

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

  const complianceTypenStandard = useMemo(
    () => filterStandardComplianceTypen(complianceTypen, hwGewerkSlugs, gewerke),
    [complianceTypen, hwGewerkSlugs, gewerke]
  )

  const bewertungGesamt = hw.bewertung_gesamt ?? null
  const bewertungAnzahl = hw.bewertung_anzahl ?? 0
  const kategorie = hw.subkategorie?.trim() || gewerkNamen[0] || 'Handwerker'

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

  const saveHandwerkerStamm = useCallback(() => {
    const pflicht = validateHandwerkerStammPflicht({
      firma: formFirma,
      vorname: formVorname,
      nachname: formNachname,
    })
    if (pflicht) {
      toast.error(pflicht)
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
      steuernummer: formSteuernummer.trim() || null,
      ustid: formUstid.trim() || null,
      iban: formIban.replace(/\s+/g, '') || null,
      aktiv: hw.aktiv,
      notizen: hw.notizen?.trim() || null,
    }
    startTransition(async () => {
      const r = await updateHandwerker(hw.id, input)
      if (!r.ok) {
        toast.error(r.message)
        setErr(r.message)
        return
      }
      setEditingKontakt(false)
      setEditingBank(false)
      setErr(null)
      toast.success('Gespeichert')
      router.refresh()
    })
  }, [
    formFirma,
    formVorname,
    formNachname,
    formEmail,
    formTelefon,
    formAdresse,
    formIban,
    formUstid,
    formSteuernummer,
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
    toast.success('Handwerker-Link versendet')
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

  const handwerkerMenuItems = useMemo(() => {
    const extra: import('@/lib/entity-menu').EntityMenuItem[] = [
      'sep',
      {
        icon: 'file-pencil',
        label: 'Rahmenvertrag',
        onClick: () => void openRahmenvertrag(),
      },
      'sep',
      {
        icon: istPortalGesperrt ? 'check' : 'shield-x',
        label: istPortalGesperrt ? 'Portal-Ausschluss aufheben' : 'Vom Portal ausschließen',
        danger: !istPortalGesperrt,
        hint: portalGesperrtPending ? 'Speichere…' : undefined,
        onClick: () => {
          if (portalGesperrtPending) return
          togglePortalGesperrt()
        },
      },
    ]

    const items = buildEntityMenu(
      'handwerker',
      {
        name: handwerkerDisplayName(hw),
        tel: hw.telefon,
        mail: hw.email,
      },
      {
        onEdit: () => {
          setTab('uebersicht')
          beginEditKontakt()
        },
        onCopy: () => runDuplicateHandwerker(hw.id, router),
        onPortal: isCrmAdmin
          ? () => {
              if (!hasPortalAccount) {
                toast.error('Kein Portal-Account')
                return
              }
              if (istPortalGesperrt) {
                toast.error('Partner ist vom Portal ausgeschlossen — Zugang gesperrt.')
                return
              }
              if (impersonating) {
                toast.error('Anmeldung läuft bereits…')
                return
              }
              setImpersonating(true)
              // Popup sofort im User-Gesture öffnen — sonst blockiert der Browser ab dem 2. Partner.
              const popup = window.open('about:blank', '_blank')
              void openPortalAsHandwerker(hw.id).then((r) => {
                setImpersonating(false)
                if (!r.ok) {
                  popup?.close()
                  toast.error(r.message)
                  return
                }
                if (popup) {
                  popup.location.href = r.url
                } else {
                  window.location.assign(r.url)
                }
              })
            }
          : undefined,
        onPortalLink: () => {
          if (istPortalGesperrt) {
            toast.error('Partner ist vom Portal ausgeschlossen — Zugang gesperrt.')
            return
          }
          void openPortalModal()
        },
        onCreateAnfrage: () => router.push('/anfragen/neu'),
        onCreateAngebot: () => setVorgangArt('angebot'),
        onCreateRechnung: () => setVorgangArt('rechnung'),
        tel: hw.telefon,
        mail: hw.email,
        extra,
      }
    )
    return entityMenuToActionItems(items, (n, size) => mockMenuIcon(n as Parameters<typeof mockMenuIcon>[0], size))
  }, [
    hw,
    isCrmAdmin,
    hasPortalAccount,
    impersonating,
    router,
    openRahmenvertrag,
    istPortalGesperrt,
    portalGesperrtPending,
  ])

  const wirtschaftSnap = useMemo(() => buildPartnerWirtschaft(payload, 'all'), [payload])

  function formatGueltigKurz(iso: string | null | undefined): string | null {
    if (!iso?.trim()) return null
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' })
  }

  const uebersichtInhalt = (
    <div className="space-y-4">
      <div className="card">
        <div className="card-h">
          <div className="card-title title">Stammdaten</div>
          <button
            type="button"
            className="qa-btn"
            title="Stammdaten bearbeiten"
            aria-label="Stammdaten bearbeiten"
            onClick={beginEditKontakt}
          >
            <MockIcon ctx="default" n="pencil" size={14} />
          </button>
        </div>
        <div className="card-b">
          {editingKontakt ? (
            <div className="props">
              {err ? <p className="mb-2 text-[length:var(--fs-text)] text-status-cancel-text">{err}</p> : null}
              <InlineEditField label="Betrieb" editing value={formFirma}>
                <input
                  className="input"
                  value={formFirma}
                  onChange={(e) => setFormFirma(e.target.value)}
                  placeholder="Firmenname"
                  autoFocus
                />
              </InlineEditField>
              <InlineEditField label="Vorname (GF)" editing value={formVorname}>
                <input
                  className="input"
                  value={formVorname}
                  onChange={(e) => setFormVorname(e.target.value)}
                />
              </InlineEditField>
              <InlineEditField label="Nachname (GF)" editing value={formNachname}>
                <input
                  className="input"
                  value={formNachname}
                  onChange={(e) => setFormNachname(e.target.value)}
                />
              </InlineEditField>
              <InlineEditField label="Telefon" editing value={formTelefon}>
                <input
                  className="input"
                  type="tel"
                  value={formTelefon}
                  onChange={(e) => setFormTelefon(e.target.value)}
                />
              </InlineEditField>
              <InlineEditField label="E-Mail" editing value={formEmail}>
                <input
                  className="input"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </InlineEditField>
              <InlineEditField label="Einsatzgebiet" editing value={formAdresse}>
                <input
                  className="input"
                  value={formAdresse}
                  onChange={(e) => setFormAdresse(e.target.value)}
                />
              </InlineEditField>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button type="button" className="btn ghost sm" onClick={cancelEditStamm}>
                  Abbrechen
                </button>
                <button
                  type="button"
                  className="btn primary sm"
                  disabled={pending}
                  onClick={saveHandwerkerStamm}
                >
                  Speichern
                </button>
              </div>
            </div>
          ) : (
            <div className="vgid">
              <div className="vgid-name">{handwerkerDisplayName(hw)}</div>
              <div className="vgid-meta">
                {[gewerkNamen.join(' · ') || kategorie, hw.adresse?.trim() || null]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
              {(hw.telefon?.trim() || hw.email?.trim()) && (
                <div className="vgid-chips">
                  {hw.telefon?.trim() ? (
                    <a className="vgid-chip" href={`tel:${String(hw.telefon).replace(/\s/g, '')}`}>
                      <MockIcon ctx="default" n="phone" size={14} />
                      {hw.telefon.trim()}
                    </a>
                  ) : null}
                  {hw.email?.trim() ? (
                    <a className="vgid-chip" href={`mailto:${hw.email.trim()}`}>
                      <MockIcon ctx="default" n="mail" size={14} />
                      {hw.email.trim()}
                    </a>
                  ) : null}
                </div>
              )}
              <div
                className="vgid-portal"
                style={{
                  marginTop: 12,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 'var(--fs-meta)',
                  color: 'var(--text-3)',
                }}
              >
                <span>
                  PORTAL ·{' '}
                  <span style={{ color: istPortalGesperrt ? 'var(--text-4)' : 'var(--green)' }}>
                    {istPortalGesperrt ? 'Gesperrt' : hasPortalAccount ? 'Aktiv' : 'Offen'}
                  </span>
                </span>
                {!istPortalGesperrt ? (
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => void openPortalModal()}
                  >
                    Zugang zurücksetzen
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      <HandwerkerWirtschaftlicheUebersicht payload={payload} />

      <div className="card">
        <div className="card-h">
          <div className="card-title title">
            <MockIcon ctx="emphasis" n="star" size={16} />
            Bewertungen von Kunden
          </div>
        </div>
        <div className="card-b">
          <div className="mb-4 flex flex-wrap items-baseline gap-3">
            <div
              className="text-[length:var(--fs-head)] font-semibold leading-none tabular-nums"
              style={{ color: '#D9A800' }}
            >
              {bewertungGesamt != null && bewertungGesamt > 0
                ? formatHandwerkerBewertung(bewertungGesamt)
                : '—'}
            </div>
            <div>
              <RatingStars value={bewertungGesamt} size={14} />
              <div className="mt-0.5 text-[length:var(--fs-meta)] text-[var(--text-3)]">
                {bewertungAnzahl > 0
                  ? `aus ${bewertungAnzahl} Bewertung${bewertungAnzahl === 1 ? '' : 'en'}`
                  : 'Noch keine Bewertungen'}
              </div>
            </div>
          </div>

          {payload.bewertungen.length > 0 ? (
            <ul>
              {payload.bewertungen.map((b) => (
                <li
                  key={b.id}
                  className="border-b border-[var(--border)] py-2.5 last:border-0"
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div className="text-[length:var(--fs-text)] font-medium text-[var(--text)]">
                      {b.kundeName || 'Kunde'}
                    </div>
                    <div className="text-[length:var(--fs-meta)] text-[var(--text-3)]">
                      {b.updatedAt ? formatRelativeDate(b.updatedAt) : ''}
                    </div>
                  </div>
                  <div className="mb-1">
                    <RatingStars value={b.note} />
                  </div>
                  {b.notiz?.trim() ? (
                    <p className="text-[length:var(--fs-text)] text-[var(--text-2)]">&ldquo;{b.notiz.trim()}&rdquo;</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-2">
              {HANDWERKER_BEWERTUNG_KATEGORIEN.map((k) => {
                const val = bewertungKategorieWert(hw, k.key)
                return (
                  <li
                    key={k.key}
                    className="flex items-center justify-between gap-3 border-b border-[var(--border)] py-2 last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="text-[length:var(--fs-text)] font-medium text-[var(--text)]">{k.label}</div>
                      <div className="text-[length:var(--fs-meta)] text-[var(--text-3)]">{k.hint}</div>
                    </div>
                    <RatingStars value={val} />
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )

  const stammdatenInhalt = (
    <>
      <InlineEditSection
        title="Kontakt"
        icon="users"
        editing={editingKontakt}
        onStartEdit={beginEditKontakt}
        onCancel={cancelEditStamm}
        onSave={saveHandwerkerStamm}
        saving={pending}
      >
        {editingKontakt ? (
          <p className="inline-edit-hint">
            <MockIcon ctx="default" n="info-circle" size={14} />
            Hervorgehobene Felder sind bearbeitbar.
          </p>
        ) : null}
        {err && editingKontakt ? <p className="mb-2 text-[length:var(--fs-text)] text-status-cancel-text">{err}</p> : null}
        <div className="props">
          <InlineEditField
            label="Betrieb"
            editing={editingKontakt}
            value={handwerkerDisplayName(hw)}
          >
            <input
              className="input"
              value={formFirma}
              onChange={(e) => setFormFirma(e.target.value)}
              placeholder="Firmenname"
              autoFocus
            />
          </InlineEditField>
          {editingKontakt ? (
            <>
              <InlineEditField label="Vorname (GF)" editing value={formVorname || '—'}>
                <input
                  className="input"
                  value={formVorname}
                  onChange={(e) => setFormVorname(e.target.value)}
                />
              </InlineEditField>
              <InlineEditField label="Nachname (GF)" editing value={formNachname || '—'}>
                <input
                  className="input"
                  value={formNachname}
                  onChange={(e) => setFormNachname(e.target.value)}
                />
              </InlineEditField>
            </>
          ) : handwerkerGfName(hw) ? (
            <InlineEditField label="Geschäftsführer" editing={false} value={handwerkerGfName(hw)} />
          ) : null}
          <InlineEditField
            label="Gewerk"
            editing={false}
            value={gewerkNamen.join(', ') || kategorie || '—'}
          />
          <InlineEditField
            label="Telefon"
            editing={editingKontakt}
            value={
              hw.telefon ? (
                <a href={`tel:${String(hw.telefon).replace(/\s/g, '')}`} className="text-bw-link hover:underline">
                  {hw.telefon}
                </a>
              ) : (
                '—'
              )
            }
          >
            <input
              className="input"
              type="tel"
              value={formTelefon}
              onChange={(e) => setFormTelefon(e.target.value)}
            />
          </InlineEditField>
          <InlineEditField
            label="E-Mail"
            editing={editingKontakt}
            value={
              hw.email ? (
                <a href={`mailto:${hw.email}`} className="text-bw-link hover:underline">
                  {hw.email}
                </a>
              ) : (
                '—'
              )
            }
          >
            <input
              className="input"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
            />
          </InlineEditField>
          <InlineEditField
            label="Einsatzgebiet"
            editing={editingKontakt}
            value={hw.adresse || '—'}
          >
            <input
              className="input"
              value={formAdresse}
              onChange={(e) => setFormAdresse(e.target.value)}
            />
          </InlineEditField>
        </div>
      </InlineEditSection>

      <InlineEditSection
        title="Bank & Steuer"
        editing={editingBank}
        onStartEdit={beginEditBank}
        onCancel={cancelEditStamm}
        onSave={saveHandwerkerStamm}
        saving={pending}
      >
        {editingBank ? (
          <p className="inline-edit-hint">
            <MockIcon ctx="default" n="info-circle" size={14} />
            Hervorgehobene Felder sind bearbeitbar.
          </p>
        ) : null}
        {err && editingBank ? <p className="mb-2 text-[length:var(--fs-text)] text-status-cancel-text">{err}</p> : null}
        <div className="props">
          <InlineEditField label="IBAN" editing={editingBank} value={hw.iban || '—'}>
            <input className="input" value={formIban} onChange={(e) => setFormIban(e.target.value)} />
          </InlineEditField>
          <InlineEditField label="USt-ID" editing={editingBank} value={hw.ustid || '—'}>
            <input className="input" value={formUstid} onChange={(e) => setFormUstid(e.target.value)} />
          </InlineEditField>
          <InlineEditField label="Steuernummer" editing={editingBank} value={hw.steuernummer || '—'}>
            <input
              className="input"
              value={formSteuernummer}
              onChange={(e) => setFormSteuernummer(e.target.value)}
            />
          </InlineEditField>
        </div>
      </InlineEditSection>

      {rahmenVertrag?.pdf_url ? (
        <div className="card">
          <div className="card-h">
            <div className="card-title title">Rahmenvertrag</div>
          </div>
          <div className="card-b">
            <a
              href={rahmenVertrag.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-bw-link hover:underline"
            >
              {rahmenVertrag.vertrags_nr || 'Rahmenvertrag öffnen'}
            </a>
          </div>
        </div>
      ) : null}
    </>
  )

  const vorgaengeInhalt = (
    <Suspense fallback={<CrmInlineLoading label="Vorgänge werden geladen …" />}>
      <VorgaengeListeClient rows={vorgaengeRows} embedded restrictHandwerkerId={hw.id} />
    </Suspense>
  )

  const appendNotiz = useCallback(() => {
    const text = notizDraft.trim()
    if (!text) return
    const next = notizen.trim() ? `${notizen.trim()}\n\n${text}` : text
    setNotizen(next)
    setNotizDraft('')
  }, [notizDraft, notizen])

  const notizenInhalt = (
    <MockNotizenCard
      notes={
        notizen.trim()
          ? [{ autor: 'Notiz', text: notizen.trim() }]
          : []
      }
      composer={
        <MockNotizComposer
          value={notizDraft}
          onChange={setNotizDraft}
          onSubmit={appendNotiz}
          placeholder="Notiz schreiben… (Enter senden · Shift+Enter neue Zeile)"
        />
      }
    />
  )

  const complianceInhalt = (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
          paddingBottom: 8,
          borderBottom: '0.5px solid var(--border)',
        }}
      >
        <MockIcon ctx="nav" n="shield-check" size={16} style={{ color: 'var(--text-3)' }} />
        <span
          style={{
            fontSize: 'var(--fs-meta)',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--text-3)',
          }}
        >
          Nachweise
        </span>
        <div style={{ flex: 1 }} />
        <ComplianceBadge status={hw.compliance_status} />
      </div>

      {complianceTypenStandard.length === 0 ? (
        <p style={{ fontSize: 'var(--fs-text)', color: 'var(--text-3)' }}>
          Keine Compliance-Typen konfiguriert.
        </p>
      ) : (
        <div className="listcard">
          {complianceTypenStandard.map((typ) => {
            const doc = dokumentFuerTyp(standardDokumente(payload.dokumente), typ.slug, {
              handwerkerId: hw.id,
              auftragId: null,
            })
            const st = complianceDokumentStatus(typ, doc)
            const gueltig = formatGueltigKurz(doc?.gueltig_bis)
            let sub = 'fehlt'
            if (st === 'ok') sub = gueltig ? `gültig bis ${gueltig}` : 'geprüft'
            else if (st === 'warnung') sub = gueltig ? `läuft ab ${gueltig}` : 'Prüfung ausstehend'
            else if (st === 'abgelaufen') sub = gueltig ? `abgelaufen ${gueltig}` : 'abgelaufen'
            const ok = st === 'ok'
            return (
              <div
                key={typ.id}
                className="list-row"
                style={{
                  gridTemplateColumns: '1fr 28px',
                  alignItems: 'center',
                  cursor: 'default',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div className="lc-title" style={{ fontWeight: 600 }}>
                    {typ.bezeichnung}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--fs-meta)',
                      color: 'var(--text-3)',
                      marginTop: 2,
                    }}
                  >
                    {sub}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <MockIcon
                    ctx="default"
                    n={ok ? 'check' : st === 'warnung' ? 'alert-triangle' : 'x'}
                    size={16}
                    style={{ color: ok ? 'var(--green)' : 'var(--text-4)' }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <details>
          <summary
            style={{
              cursor: 'pointer',
              fontSize: 'var(--fs-meta)',
              color: 'var(--text-3)',
              marginBottom: 10,
            }}
          >
            Unterlagen hochladen & bearbeiten
          </summary>
          <HandwerkerComplianceUnterlagenTable
            handwerkerId={hw.id}
            dokumente={payload.dokumente}
            typen={complianceTypenStandard}
          />
        </details>
      </div>
    </div>
  )

  const akteInhalt = (
    <div className="space-y-4">
      {stammdatenInhalt}
      {notizenInhalt}
    </div>
  )

  const vorgaengeCount = useMemo(
    () => vorgaengeRows.filter((r) => (r.handwerkerIds ?? []).includes(hw.id)).length,
    [vorgaengeRows, hw.id]
  )

  const detailShellGroups: DetailShellGroup[] = [
    {
      id: 'uebersicht',
      label: 'Übersicht',
      icon: 'layout-dashboard',
      render: () => uebersichtInhalt,
    },
    {
      id: 'vorgaenge',
      label: 'Vorgänge',
      icon: 'folders',
      count: vorgaengeCount || undefined,
      render: () => vorgaengeInhalt,
    },
    {
      id: 'compliance',
      label: 'Compliance',
      icon: 'shield-check',
      count: dokumenteAnzahl || undefined,
      render: () => complianceInhalt,
    },
    {
      id: 'akte',
      label: 'Akte',
      icon: 'file-text',
      count: hw.notizen?.trim() ? 1 : undefined,
      render: () => akteInhalt,
    },
  ]

  return (
    <>
      <MockDetailBackLink href="/handwerker" label="Zurück zu Handwerker" />
      <DetailHead
        title={handwerkerDisplayName(hw)}
        titleBadges={<ComplianceBadge status={hw.compliance_status} />}
        badges={
          <>
            {gewerkNamen.length > 0 ? (
              <span>{gewerkNamen.join(' · ')}</span>
            ) : kategorie ? (
              <span>{kategorie}</span>
            ) : null}
            {bewertungGesamt != null && bewertungGesamt > 0 ? (
              <span className="rating inline-flex items-center gap-1">
                <MockIcon
                  ctx="default"
                  n="star-filled"
                  size={12}
                  className="text-[var(--yel-tx,#c9a227)]"
                />
                {formatHandwerkerBewertung(bewertungGesamt)}
              </span>
            ) : null}
            {istPortalGesperrt ? (
              <MockBadge kind="storniert">
                <span className="inline-flex items-center gap-1">
                  <MockIcon ctx="default" n="shield-x" size={10} />
                  Portal gesperrt
                </span>
              </MockBadge>
            ) : null}
          </>
        }
        actions={<DetailActionsBar sheetTitle="Handwerker" menuItems={handwerkerMenuItems} />}
      />

      <NextStepBar
        step={{
          label:
            wirtschaftSnap.aktiveEinsaetze > 0
              ? `→ ${wirtschaftSnap.aktiveEinsaetze} Einsätze aktiv`
              : '→ Keine aktiven Einsätze',
          hint:
            wirtschaftSnap.offenesVolumen > 0
              ? `${Math.round(wirtschaftSnap.offenesVolumen).toLocaleString('de-DE')} € offen`
              : undefined,
        }}
        metrics={[
          {
            label: 'Volumen',
            value: `${Math.round(payload.stats.volumen || wirtschaftSnap.umsatz).toLocaleString('de-DE')} €`,
          },
          {
            label: 'Bewertung',
            value:
              bewertungGesamt != null && bewertungGesamt > 0
                ? formatHandwerkerBewertung(bewertungGesamt)
                : '—',
          },
          {
            label: 'Annahmequote',
            value: payload.stats.quote != null ? `${payload.stats.quote} %` : '—',
          },
        ]}
      />

      <DetailShell
        groups={detailShellGroups}
        value={tab}
        onChange={(id) => setTab(id as HandwerkerDetailTab)}
      />

      <Modal
        open={portalModalOpen}
        onClose={() => setPortalModalOpen(false)}
        title="Handwerker-Link versenden"
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
            <p className="mb-1 text-[length:var(--fs-meta)] font-medium text-bw-text-muted">Mail-Vorschau</p>
            <iframe
              title="Partner-Portal Mail Vorschau"
              sandbox="allow-same-origin"
              className="h-[300px] w-full rounded-lg border border-bw-border bg-white"
              srcDoc={portalHtml}
            />
          </div>
          <Input label="Partner-Portal Login" value={portalLink} readOnly className="bg-bw-bg-soft" />
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

      <FabVorgangStartModal
        open={vorgangArt != null}
        art={vorgangArt}
        onClose={() => setVorgangArt(null)}
      />
    </>
  )
}
