'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { ActionsMenu } from '@/components/ui/actions-menu'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { FormSheet } from '@/components/ui/FormSheet'
import { useIsMobile } from '@/hooks/useIsMobile'
import { PropertyRow } from '@/components/ui/PropertyRow'
import { Textarea } from '@/components/ui/Textarea'
import { ComplianceBadge } from '@/components/handwerker/ComplianceBadge'
import { HandwerkerComplianceTab } from '@/components/handwerker/HandwerkerComplianceTab'
import {
  complianceDokumentStatus,
  dokumentFuerTyp,
  filterStandardComplianceTypen,
  standardDokumente,
} from '@/lib/handwerker/compliance-katalog'
import { DetailHead } from '@/components/layout/DetailHead'
import { DetailShell, type DetailShellGroup } from '@/components/mock-ui/DetailShell'
import { MockBadge, MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon, mockMenuIcon } from '@/components/mock-ui/MockIcon'
import { MockUebersichtCard } from '@/components/mock-ui/MockUebersichtCard'
import { MockDetailBackLink } from '@/components/mock-ui/MockDetailBackLink'
import { MockNotizenCard, MockNotizComposer } from '@/components/mock-ui/MockDetailCards'
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
import { buildPartnerDashboardLink } from '@/lib/portal-utils'
import type { ComplianceDokumentTyp, Gewerk, Handwerker } from '@/lib/types'
import { useIsCrmAdmin } from '@/hooks/useIsCrmAdmin'
import { openPortalAsHandwerker } from '@/app/(dashboard)/impersonation/actions'
import { buildEntityMenu, entityMenuToActionItems } from '@/lib/entity-menu'
import { runDuplicateHandwerker } from '@/lib/list-actions'
import { VorgaengeListeClient } from '@/components/vorgaenge/VorgaengeListeClient'
import type { VorgangListeRow } from '@/lib/vorgang/types'
import { cn, formatRelativeDate } from '@/lib/utils'

type HandwerkerDetailTab = 'uebersicht' | 'stammdaten' | 'vorgaenge' | 'dokumente' | 'notizen'

function formatEurCompact(n: number): string {
  return `${Math.round(n).toLocaleString('de-DE')} €`
}

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

function complianceRowMeta(status: ReturnType<typeof complianceDokumentStatus>): {
  label: string
  tone: 'ok' | 'warn' | 'bad'
  icon: 'check' | 'alert-triangle' | 'circle-x'
} {
  if (status === 'ok') {
    return { label: 'geprüft', tone: 'ok', icon: 'check' }
  }
  if (status === 'warnung') {
    return { label: 'läuft ab', tone: 'warn', icon: 'alert-triangle' }
  }
  if (status === 'abgelaufen') {
    return { label: 'abgelaufen', tone: 'bad', icon: 'circle-x' }
  }
  return { label: 'fehlt', tone: 'bad', icon: 'alert-triangle' }
}

export function HandwerkerDetailClient({
  payload,
  gewerkeSlugs,
  gewerke = [],
  complianceTypen,
  rahmenVertrag = null,
  verwandteStammdaten = [],
  vorgaengeRows = [],
}: {
  payload: HandwerkerDetailPayload
  gewerkeSlugs: { slug: string; name: string }[]
  gewerke?: Gewerk[]
  complianceTypen: ComplianceDokumentTyp[]
  rahmenVertrag?: HandwerkerVertragRow | null
  verwandteStammdaten?: StammdatenKontaktTreffer[]
  vorgaengeRows?: VorgangListeRow[]
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

  const [tab, setTab] = useState<HandwerkerDetailTab>('uebersicht')
  const [notizen, setNotizen] = useState(hw.notizen ?? '')
  const [notizDraft, setNotizDraft] = useState('')
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
  const isCrmAdmin = useIsCrmAdmin()
  const [impersonating, setImpersonating] = useState(false)

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
    if (modalOpen) {
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
      steuernummer: formSteuernummer.trim() || null,
      ustid: formUstid.trim() || null,
      iban: formIban.replace(/\s+/g, '') || null,
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
    const extra: import('@/lib/entity-menu').EntityMenuItem[] = []
    if (!isCrmAdmin) {
      extra.push({
        icon: 'send',
        label: 'Handwerker-Link versenden',
        onClick: () => void openPortalModal(),
      })
    }
    extra.push('sep', {
      icon: 'file-pencil',
      label: 'Rahmenvertrag',
      onClick: () => void openRahmenvertrag(),
    })

    const items = buildEntityMenu(
      'handwerker',
      {
        name: handwerkerDisplayName(hw),
        tel: hw.telefon,
        mail: hw.email,
      },
      {
        onEdit: () => setModalOpen(true),
        onCopy: () => runDuplicateHandwerker(hw.id, router),
        onPortal: isCrmAdmin
          ? () => {
              if (!hasPortalAccount) {
                toast.error('Kein Portal-Account')
                return
              }
              if (impersonating) {
                toast.error('Anmeldung läuft bereits…')
                return
              }
              setImpersonating(true)
              void openPortalAsHandwerker(hw.id).then((r) => {
                setImpersonating(false)
                if (!r.ok) {
                  toast.error(r.message)
                  return
                }
                window.open(r.url, '_blank', 'noopener,noreferrer')
              })
            }
          : undefined,
        onPortalLink: () => void openPortalModal(),
        tel: hw.telefon,
        mail: hw.email,
        extra,
      }
    )
    return entityMenuToActionItems(items, (n, size) => mockMenuIcon(n as Parameters<typeof mockMenuIcon>[0], size))
  }, [hw, isCrmAdmin, hasPortalAccount, impersonating, router, openRahmenvertrag])

  const uebersichtInhalt = (
    <div className="space-y-5">
      <MockUebersichtCard
        stats={[
          {
            icon: 'inbox',
            label: 'Angefragt',
            value: payload.stats.angefragt,
          },
          {
            icon: 'file-invoice',
            label: 'Angebote',
            value: payload.stats.angebote,
          },
          {
            icon: 'tool',
            label: 'Aufträge',
            value: payload.stats.auftraegeAktiv,
          },
          {
            icon: 'calculator',
            label: 'Volumen',
            value: formatEurCompact(payload.stats.volumen),
          },
          {
            icon: 'trending-up',
            label: 'Ø Auftrag',
            value: formatEurCompact(payload.stats.avgAuftrag),
          },
          {
            icon: 'clock',
            label: 'Offen',
            value: formatEurCompact(payload.stats.offen),
          },
        ]}
      />

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
              className="text-[36px] font-semibold leading-none tabular-nums"
              style={{ color: '#D9A800' }}
            >
              {bewertungGesamt != null && bewertungGesamt > 0
                ? formatHandwerkerBewertung(bewertungGesamt)
                : '—'}
            </div>
            <div>
              <RatingStars value={bewertungGesamt} size={14} />
              <div className="mt-0.5 text-[12px] text-[var(--text-3)]">
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
                    <div className="text-[13px] font-medium text-[var(--text)]">
                      {b.kundeName || 'Kunde'}
                    </div>
                    <div className="text-[12px] text-[var(--text-3)]">
                      {b.updatedAt ? formatRelativeDate(b.updatedAt) : ''}
                    </div>
                  </div>
                  <div className="mb-1">
                    <RatingStars value={b.note} />
                  </div>
                  {b.notiz?.trim() ? (
                    <p className="text-[13px] text-[var(--text-2)]">&ldquo;{b.notiz.trim()}&rdquo;</p>
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
                      <div className="text-[13px] font-medium text-[var(--text)]">{k.label}</div>
                      <div className="text-[11.5px] text-[var(--text-3)]">{k.hint}</div>
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
      <div className="card">
        <div className="card-h">
          <div className="card-title title">
            <MockIcon ctx="emphasis" n="users" size={16} />
            Kontakt
          </div>
          <MockBtn sm kind="ghost" icon="pencil" onClick={() => setModalOpen(true)}>
            Bearbeiten
          </MockBtn>
        </div>
        <div className="card-b space-y-1">
          <PropertyRow label="Betrieb" value={handwerkerDisplayName(hw)} editable={false} />
          <PropertyRow
            label="Gewerk"
            value={gewerkNamen.join(', ') || kategorie || '—'}
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
          <PropertyRow label="Einsatzgebiet" value={hw.adresse || '—'} editable={false} />
          {handwerkerGfName(hw) ? (
            <PropertyRow label="Geschäftsführer" value={handwerkerGfName(hw)} editable={false} />
          ) : null}
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <div className="card-title title">
            <MockIcon ctx="emphasis" n="shield-check" size={16} />
            Compliance
          </div>
          <ComplianceBadge status={hw.compliance_status} />
        </div>
        <div className="card-b">
          {complianceTypenStandard.length === 0 ? (
            <p className="text-[13px] text-[var(--text-3)]">Keine Compliance-Typen konfiguriert.</p>
          ) : (
            complianceTypenStandard.map((typ) => {
              const doc = dokumentFuerTyp(payload.dokumente, typ.slug, {
                handwerkerId: hw.id,
                auftragId: null,
              })
              const st = complianceDokumentStatus(typ, doc)
              const row = complianceRowMeta(st)
              const sub =
                doc?.gueltig_bis != null
                  ? `gültig bis ${String(doc.gueltig_bis).slice(0, 10).split('-').reverse().join('.')}`
                  : row.label === 'geprüft'
                    ? 'geprüft'
                    : row.label
              return (
                <div key={typ.id} className="setting-row">
                  <div>
                    <div className="lbl">{typ.bezeichnung}</div>
                    <div className="sub">{sub}</div>
                  </div>
                  <MockIcon
                    ctx="default"
                    n={row.icon}
                    size={20}
                    className={cn(
                      row.tone === 'ok' && 'text-[var(--green)]',
                      row.tone === 'warn' && 'text-[var(--yel-tx,#c0622b)]',
                      row.tone === 'bad' && 'text-[var(--red-tx)]'
                    )}
                  />
                </div>
              )
            })
          )}
          <button
            type="button"
            className="mt-2 text-[12.5px] font-medium text-[var(--green)] hover:underline"
            onClick={() => setTab('dokumente')}
          >
            Alle Nachweise verwalten →
          </button>
        </div>
      </div>

      <StammdatenVerknuepfungen verwandte={verwandteStammdaten} />

      <div className="card">
        <div className="card-h">
          <div className="card-title title">Bank &amp; Steuer</div>
          <MockBtn sm kind="ghost" icon="pencil" onClick={() => setModalOpen(true)}>
            Bearbeiten
          </MockBtn>
        </div>
        <div className="card-b space-y-1">
          <PropertyRow label="IBAN" value={hw.iban || '—'} editable={false} />
          <PropertyRow label="USt-ID" value={hw.ustid || '—'} editable={false} />
          <PropertyRow label="Steuernummer" value={hw.steuernummer || '—'} editable={false} />
        </div>
      </div>

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
    <Suspense
      fallback={
        <p className="py-6 text-center text-sm text-bw-text-muted" aria-busy="true">
          Vorgänge werden geladen…
        </p>
      }
    >
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

  const dokumenteInhalt = (
    <HandwerkerComplianceTab
      handwerkerId={hw.id}
      handwerkerGewerke={hwGewerkSlugs}
      gewerke={gewerke}
      dokumente={payload.dokumente}
      complianceTypen={complianceTypen}
      rahmenVertrag={rahmenVertrag}
    />
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
      id: 'stammdaten',
      label: 'Stammdaten',
      icon: 'clipboard-list',
      render: () => stammdatenInhalt,
    },
    {
      id: 'vorgaenge',
      label: 'Vorgänge',
      icon: 'folders',
      count: vorgaengeCount || undefined,
      render: () => vorgaengeInhalt,
    },
    {
      id: 'dokumente',
      label: 'Dokumente',
      icon: 'files',
      count: dokumenteAnzahl || undefined,
      render: () => dokumenteInhalt,
    },
    {
      id: 'notizen',
      label: 'Notizen',
      icon: 'messages',
      count: hw.notizen?.trim() ? 1 : undefined,
      render: () => notizenInhalt,
    },
  ]

  return (
    <>
      <MockDetailBackLink href="/handwerker" label="Zurück zu Handwerker" />
      <DetailHead
        title={handwerkerDisplayName(hw)}
        badges={
          <>
            <ComplianceBadge status={hw.compliance_status} />
            <MockBadge kind={hasPortalAccount ? 'aktiv' : 'storniert'}>
              <span className="inline-flex items-center gap-1">
                <MockIcon
                  ctx="default"
                  n={hasPortalAccount ? 'plug' : 'circle-x'}
                  size={10}
                />
                Portal {hasPortalAccount ? 'aktiv' : 'inaktiv'}
              </span>
            </MockBadge>
          </>
        }
        meta={
          <>
            <span>{kategorie}</span>
            {bewertungGesamt != null && bewertungGesamt > 0 ? (
              <>
                <span className="sep" aria-hidden>
                  ·
                </span>
                <span className="rating inline-flex items-center gap-1">
                  <MockIcon
                    ctx="default"
                    n="star-filled"
                    size={12}
                    className="text-[var(--yel-tx,#c9a227)]"
                  />
                  {formatHandwerkerBewertung(bewertungGesamt)}
                </span>
              </>
            ) : null}
          </>
        }
        actions={
          <ActionsMenu
            trigger={
              <button
                type="button"
                className="btn ghost sm inline-flex shrink-0 gap-1.5 px-2.5"
                aria-label="Weitere Aktionen"
              >
                <MockIcon ctx="btn" n="dots" size={16} />
                <span className="sr-only">Mehr</span>
              </button>
            }
            items={handwerkerMenuItems}
            sheetTitle="Handwerker"
          />
        }
      />

      <DetailShell
        groups={detailShellGroups}
        value={tab}
        onChange={(id) => setTab(id as HandwerkerDetailTab)}
      />

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
            <div className="form-grid-2 grid gap-3 md:grid-cols-2">
              <Input label="IBAN" value={formIban} onChange={(e) => setFormIban(e.target.value)} />
              <Input label="USt-ID" value={formUstid} onChange={(e) => setFormUstid(e.target.value)} />
            </div>
            <Input
              label="Steuernummer"
              value={formSteuernummer}
              onChange={(e) => setFormSteuernummer(e.target.value)}
            />
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
            <p className="mb-1 text-xs font-medium text-bw-text-muted">Mail-Vorschau</p>
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
    </>
  )
}
