'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { DetailTabBar } from '@/components/ui/detail-tab-bar'
import { ListGridShell } from '@/components/layout/ListPageParts'
import { DetailProp } from '@/components/ui/detail-prop'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import {
  CrmDokumenteTabelle,
  type CrmDokumentZeile,
} from '@/components/dokumente/CrmDokumenteTabelle'
import { AuftragStatusBadge } from '@/components/ui/AuftragStatusBadge'
import { AngebotEinfachStatusBadge } from '@/components/ui/AngebotEinfachStatusBadge'
import { LeadStatusBadge } from '@/components/ui/Badge'
import { CustomFieldRenderer } from '@/components/ui/CustomFieldRenderer'
import { TypBadge } from '@/components/kunden/TypBadge'
import {
  initKundeStammEditFelder,
  istKundeFirmaPflichtTyp,
  istKundeHausverwaltungTyp,
  istKundeGewerbeTyp,
  istKundeNurGewerbeTyp,
  kundeDisplayName,
} from '@/lib/kunde-stammdaten'
import { toast } from '@/components/ui/app-toast'
import { KundenObjekteCard } from '@/components/kunden/KundenObjekteCard'
import { KundenOrganisationTab } from '@/components/kunden/KundenOrganisationTab'
import type { KundenObjekt } from '@/lib/types'
import {
  kundeNeueAnfrageHref,
  kundeNeuerAuftragHref,
  kundeNeuesAngebotHref,
} from '@/lib/kunden/kunde-pipeline-nav'
import { DetailHead } from '@/components/layout/DetailHead'
import { DetailResponsiveTabs } from '@/components/layout/app'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { ActionsMenu, type ActionsMenuItem } from '@/components/ui/actions-menu'
import { KommunikationCard } from '@/components/kommunikation/KommunikationCard'
import { useKundenMailCompose } from '@/components/kommunikation/useKundenMailCompose'
import { mailComposeContextFromKunde } from '@/app/(dashboard)/kommunikation/actions'
import {
  AlertTriangle,
  MoreHorizontal,
  Pencil,
  Mail,
} from 'lucide-react'
import { mockMenuIcon } from '@/components/mock-ui/MockIcon'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { RECHNUNG_STATUS_LABELS, type RechnungStatus } from '@/lib/rechnung-config'
import { saveKunde, saveKundeCustomFieldValue } from '@/app/actions/kunden'
import { getPortalLoginHint } from '@/app/actions/kunden'
import { getKundenPortalMailDraft, previewKundenPortalMail, sendKundenPortalLinkMail } from '@/app/actions/mails'
import {
  buildPortalLoginLink,
  defaultPortalInviteBetreff,
  defaultPortalInviteText,
} from '@/lib/portal-utils'
import type { KundeDetailPayload } from '@/lib/kunden/load-kunde-detail'
import type { CustomFieldDefinition, CustomFieldValueRow } from '@/lib/custom-fields'
import type { AngebotStatus, AuftragStatus, LeadStatus } from '@/lib/types'
import { betragAnzeige, resolveStatusEinfach } from '@/lib/angebot-einfach'
import { leadSituationDisplay } from '@/lib/lead-funnel-daten'
import { bereicheFuerAnzeige } from '@/lib/lead-gewerbe-storage'
import { kundentypLabel } from '@/lib/lead-display-helpers'
import { kundeRechnungsempfaengerAusStammdaten } from '@/lib/kunde-rechnungsempfaenger'
import { BEREICH_LABELS, formatAnfragePreisAnzeige, formatDatum, formatRelativeDate } from '@/lib/utils'
import { parseEmailTokens } from '@/lib/email-recipients'
import { StammdatenVerknuepfungen } from '@/components/stammdaten/StammdatenVerknuepfungen'
import type { StammdatenKontaktTreffer } from '@/lib/stammdaten-kontakt'
import { useIsCrmAdmin } from '@/hooks/useIsCrmAdmin'
import { openPortalAsKunde } from '@/app/(dashboard)/impersonation/actions'

const QUELLE_LABELS: Record<string, string> = {
  website: 'Website',
  empfehlung: 'Empfehlung',
  telefon: 'Telefon',
  social: 'Social Media',
  sonstiges: 'Sonstiges',
}

const TYP_OPTIONS = [
  { value: 'privat', label: 'Privat' },
  { value: 'gewerbe', label: 'Gewerbe' },
  { value: 'hausverwaltung', label: 'Hausverwaltung' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

function buildEditFormFromKunde(k: KundeDetailPayload) {
  const addr = initKundeStammEditFelder(k)
  return {
    firmaName: k.typ === 'gewerbe' || k.typ === 'hausverwaltung' ? (k.name ?? '') : '',
    vorname: k.vorname ?? '',
    nachname: k.nachname ?? k.name,
    typ: k.typ,
    telefon: k.telefon ?? '',
    email: k.email ?? '',
    plz: k.plz ?? '',
    ort: k.ort ?? '',
    strasse: addr.strasse,
    hausnummer: addr.hausnummer,
    webseite: k.webseite ?? '',
    ansprechpartner: k.ansprechpartner ?? '',
    quelle: k.quelle ?? '',
  }
}

function formatEur(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)
}

function normalizeAuftragAngebote(
  raw:
    | {
        id?: string
        pdf_url?: string | null
        created_at?: string | null
        status?: string
      }
    | {
        id?: string
        pdf_url?: string | null
        created_at?: string | null
        status?: string
      }[]
    | null
    | undefined
) {
  if (!raw) return []
  return Array.isArray(raw) ? raw : [raw]
}

function angebotAgg(
  a: {
    angebote?:
      | { gesamt_fix: number | null; gesamt_min: number | null; gesamt_max: number | null; pdf_url?: string | null }
      | {
          gesamt_fix: number | null
          gesamt_min: number | null
          gesamt_max: number | null
          pdf_url?: string | null
        }[]
      | null
  } | null
) {
  const ag = a?.angebote
  if (!ag) return null
  return Array.isArray(ag) ? ag[0] : ag
}

function auftragTitelFromRechnung(r: NonNullable<KundeDetailPayload['rechnungen']>[0]): string {
  const rel = r.auftraege
  if (!rel) return '—'
  const t = Array.isArray(rel) ? rel[0]?.titel : rel.titel
  return t?.trim() || '—'
}

function isRechnungUeberfaellig(r: { status: string; faellig_am?: string | null }) {
  if (r.status === 'bezahlt' || r.status === 'storniert') return false
  if (!r.faellig_am) return false
  return new Date(r.faellig_am).getTime() < Date.now()
}

function rechnungStatusBadge(r: { status: string; faellig_am?: string | null }) {
  if (isRechnungUeberfaellig(r)) {
    return <StatusBadge status="cancel" label="Überfällig" />
  }
  const st = r.status as RechnungStatus
  if (st === 'bezahlt') return <StatusBadge status="order" label={RECHNUNG_STATUS_LABELS.bezahlt} />
  if (st === 'gesendet') return <StatusBadge status="offer" label={RECHNUNG_STATUS_LABELS.gesendet} />
  if (st === 'storniert') return <StatusBadge status="cancel" label={RECHNUNG_STATUS_LABELS.storniert} />
  return <StatusBadge status="done" label={RECHNUNG_STATUS_LABELS.entwurf} />
}

type KundeDetailTab = 'stammdaten' | 'organisation' | 'anfragen' | 'angebote' | 'auftraege' | 'dokumente'

const DESKTOP_KUNDE_TABS_BASE: KundeDetailTab[] = ['anfragen', 'angebote', 'auftraege', 'dokumente']
const MOBILE_KUNDE_TABS_BASE: KundeDetailTab[] = ['stammdaten', 'anfragen', 'angebote', 'auftraege', 'dokumente']

export function KundeDetailClient({
  kunde: initialKunde,
  customFieldDefs,
  customValues: initialValues,
  kundenObjekte = [],
  verwandteStammdaten = [],
}: {
  kunde: KundeDetailPayload
  customFieldDefs: CustomFieldDefinition[]
  customValues: CustomFieldValueRow[]
  kundenObjekte?: KundenObjekt[]
  verwandteStammdaten?: StammdatenKontaktTreffer[]
}) {
  const router = useRouter()
  const { refresh, generation } = useCrmRefresh()
  const mailCompose = useKundenMailCompose()
  const [kunde, setKunde] = useState(initialKunde)
  const [tab, setTab] = useState<KundeDetailTab>('anfragen')
  const [interneNotiz, setInterneNotiz] = useState(initialKunde.notizen ?? '')
  const [pending, startTransition] = useTransition()
  const [customValues, setCustomValues] = useState(initialValues)
  const customSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const interneTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const kundeRef = useRef(kunde)
  kundeRef.current = kunde
  const [editOpen, setEditOpen] = useState(false)
  const [editErr, setEditErr] = useState<string | null>(null)
  const [portalModalOpen, setPortalModalOpen] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalSending, setPortalSending] = useState(false)
  const [portalLink, setPortalLink] = useState('')
  const [portalTo, setPortalTo] = useState('')
  const [portalCc, setPortalCc] = useState('')
  const [portalBetreff, setPortalBetreff] = useState('')
  const [portalText, setPortalText] = useState('')
  const [portalHtml, setPortalHtml] = useState('')
  const [portalAnrede, setPortalAnrede] = useState<'du' | 'sie'>('du')
  const [hasPortalAccount, setHasPortalAccount] = useState(false)
  const [editForm, setEditForm] = useState(() => buildEditFormFromKunde(initialKunde))
  const isCrmAdmin = useIsCrmAdmin()
  const [impersonating, setImpersonating] = useState(false)

  useEffect(() => {
    void (async () => {
      const hint = await getPortalLoginHint(initialKunde.id)
      if (hint.ok) {
        setPortalLink(hint.loginLink)
        setHasPortalAccount(hint.hasAuthAccount)
      } else {
        setPortalLink(buildPortalLoginLink())
      }
    })()
  }, [initialKunde.id])

  useEffect(() => {
    setKunde(initialKunde)
    setInterneNotiz(initialKunde.notizen ?? '')
    setEditForm(buildEditFormFromKunde(initialKunde))
  }, [initialKunde])

  useEffect(() => {
    if (interneTimer.current) clearTimeout(interneTimer.current)
    interneTimer.current = setTimeout(() => {
      const k = kundeRef.current
      const t = interneNotiz.trim()
      if (t === (k.notizen ?? '').trim()) return
      void (async () => {
        const r = await saveKunde(
          {
            typ: k.typ,
            name: istKundeFirmaPflichtTyp(k.typ) ? k.name : null,
            vorname: k.vorname ?? null,
            nachname: k.nachname ?? null,
            strasse: k.strasse ?? k.adresse,
            hausnummer: k.hausnummer ?? null,
            telefon: k.telefon,
            email: k.email,
            plz: k.plz,
            ort: k.ort,
            webseite: k.webseite,
            ansprechpartner: k.ansprechpartner,
            quelle: k.quelle,
            notizen: t || null,
            stammPflicht: false,
          },
          k.id
        )
        if (r.ok) refresh()
      })()
    }, 800)
    return () => {
      if (interneTimer.current) clearTimeout(interneTimer.current)
    }
  }, [interneNotiz, router])

  const rechnungen = useMemo(() => kunde.rechnungen ?? [], [kunde.rechnungen])
  const offenSumme = useMemo(
    () =>
      rechnungen
        .filter((r) => r.status !== 'bezahlt' && r.status !== 'storniert')
        .reduce((s, r) => s + (Number(r.brutto) || 0), 0),
    [rechnungen]
  )

  const einbehalteFlat = useMemo(() => {
    const rows: { id: string; label: string; betrag: number; freigabe: string; auftrag: string }[] = []
    for (const a of kunde.auftraege ?? []) {
      const atitel = a.titel?.trim() || 'Auftrag'
      for (const e of a.einbehalte ?? []) {
        const hw = e.handwerker
        const label = hw?.firma?.trim() || hw?.name?.trim() || 'Handwerker'
        rows.push({
          id: e.id,
          label,
          betrag: Number(e.einbehalt_betrag) || 0,
          freigabe: e.freigabe_datum,
          auftrag: atitel,
        })
      }
    }
    return rows
  }, [kunde.auftraege])

  const einbehaltSumme = useMemo(() => einbehalteFlat.reduce((s, e) => s + e.betrag, 0), [einbehalteFlat])

  const auftraegeCount = kunde.auftraege?.length ?? 0
  const anfragenCount = kunde.leads?.length ?? 0

  const alleAngebote = useMemo(() => {
    type Zeile = {
      id: string
      status: string
      status_einfach?: string | null
      gueltig_bis?: string | null
      gesamt_fix: number | null
      gesamt_min: number | null
      gesamt_max: number | null
      created_at?: string | null
      bezug: string
    }
    const byId = new Map<string, Zeile>()
    for (const l of kunde.leads ?? []) {
      const leadLabel =
        leadSituationDisplay(l.situation) ||
        (l.bereiche?.length ? l.bereiche.map((b) => BEREICH_LABELS[b] ?? b).join(', ') : 'Anfrage')
      for (const a of l.angebote ?? []) {
        byId.set(a.id, {
          id: a.id,
          status: a.status,
          status_einfach: a.status_einfach,
          gueltig_bis: a.gueltig_bis,
          gesamt_fix: a.gesamt_fix,
          gesamt_min: a.gesamt_min,
          gesamt_max: a.gesamt_max,
          created_at: a.created_at,
          bezug: leadLabel,
        })
      }
    }
    for (const a of kunde.auftraege ?? []) {
      for (const ang of normalizeAuftragAngebote(a.angebote) as Array<{
        id: string
        status?: string
        status_einfach?: string | null
        gueltig_bis?: string | null
        gesamt_fix?: number | null
        gesamt_min?: number | null
        gesamt_max?: number | null
        created_at?: string | null
      }>) {
        if (!ang?.id || byId.has(ang.id)) continue
        byId.set(ang.id, {
          id: ang.id,
          status: ang.status ?? 'entwurf',
          status_einfach: ang.status_einfach ?? null,
          gueltig_bis: ang.gueltig_bis ?? null,
          gesamt_fix: ang.gesamt_fix ?? null,
          gesamt_min: ang.gesamt_min ?? null,
          gesamt_max: ang.gesamt_max ?? null,
          created_at: ang.created_at,
          bezug: a.titel?.trim() || 'Auftrag',
        })
      }
    }
    return Array.from(byId.values()).sort(
      (x, y) => new Date(y.created_at ?? 0).getTime() - new Date(x.created_at ?? 0).getTime()
    )
  }, [kunde.leads, kunde.auftraege])

  const angeboteCount = alleAngebote.length
  const avgAuftrag =
    auftraegeCount > 0 && (kunde.gesamt_umsatz ?? 0) > 0
      ? (kunde.gesamt_umsatz ?? 0) / auftraegeCount
      : null

  const dokumenteCount = useMemo(() => {
    let n = (kunde.kunden_dokumente ?? []).filter((d) => d.typ !== 'protokoll').length
    for (const l of kunde.leads ?? []) {
      n += (l.angebote ?? []).filter((a) => a.pdf_url).length
    }
    for (const a of kunde.auftraege ?? []) {
      for (const ang of normalizeAuftragAngebote(a.angebote)) {
        if (ang?.pdf_url?.trim()) n += 1
      }
      if (a.abnahme_protokoll_url) n += 1
    }
    n += rechnungen.filter((r) => r.pdf_url).length
    return n
  }, [kunde, rechnungen])

  const zeigtOrganisationTab =
    istKundeGewerbeTyp(kunde.typ) || kunde.portal_modus === 'organisation'

  const angeboteAnAuftrag = useMemo(() => {
    const byAuftrag = new Map<string, CrmDokumentZeile[]>()
    for (const l of kunde.leads ?? []) {
      for (const ang of l.angebote ?? []) {
        const aid = 'auftrag_id' in ang ? ang.auftrag_id : null
        if (!aid) continue
        const list = byAuftrag.get(aid) ?? []
        list.push({
          id: `angebot-${ang.id}`,
          datum: ang.created_at ?? l.created_at,
          name: `Angebot ${ang.id.slice(0, 8).toUpperCase()}`,
          href: ang.pdf_url?.trim() || `/api/angebote/${ang.id}/pdf`,
        })
        byAuftrag.set(aid, list)
      }
    }
    return byAuftrag
  }, [kunde.leads])

  const kundenStamm = useMemo(() => kundeRechnungsempfaengerAusStammdaten(kunde), [kunde])

  const desktopKundeTabIds = useMemo((): KundeDetailTab[] => {
    if (!zeigtOrganisationTab) return DESKTOP_KUNDE_TABS_BASE
    return ['organisation', ...DESKTOP_KUNDE_TABS_BASE]
  }, [zeigtOrganisationTab])

  const mobileKundeTabIds = useMemo((): KundeDetailTab[] => {
    if (!zeigtOrganisationTab) return MOBILE_KUNDE_TABS_BASE
    const rest = MOBILE_KUNDE_TABS_BASE.filter((t) => t !== 'stammdaten')
    return ['stammdaten', 'organisation', ...rest]
  }, [zeigtOrganisationTab])

  const desktopDetailTabs = useMemo(
    () => {
      const tabs = [
        ...(zeigtOrganisationTab
          ? [{ id: 'organisation' as const, label: 'Organisation', iconName: 'building' }]
          : []),
        {
          id: 'anfragen' as const,
          label: 'Anfragen',
          iconName: 'inbox',
          count: anfragenCount || undefined,
        },
        {
          id: 'angebote' as const,
          label: 'Angebote',
          iconName: 'file-invoice',
          count: angeboteCount || undefined,
        },
        {
          id: 'auftraege' as const,
          label: 'Aufträge',
          iconName: 'briefcase',
          count: auftraegeCount || undefined,
        },
        {
          id: 'dokumente' as const,
          label: 'Dokumente',
          iconName: 'files',
          count: dokumenteCount || undefined,
        },
      ]
      return tabs
    },
    [anfragenCount, angeboteCount, auftraegeCount, dokumenteCount, zeigtOrganisationTab]
  )

  const mobileDetailTabs = useMemo(
    () => {
      const tabs = [
        { id: 'stammdaten' as const, label: 'Stammdaten', iconName: 'clipboard-list' },
        ...(zeigtOrganisationTab
          ? [{ id: 'organisation' as const, label: 'Organisation', iconName: 'building' }]
          : []),
        {
          id: 'anfragen' as const,
          label: 'Anfragen',
          iconName: 'inbox',
          count: anfragenCount || undefined,
        },
        {
          id: 'angebote' as const,
          label: 'Angebote',
          iconName: 'file-invoice',
          count: angeboteCount || undefined,
        },
        {
          id: 'auftraege' as const,
          label: 'Aufträge',
          iconName: 'briefcase',
          count: auftraegeCount || undefined,
        },
        {
          id: 'dokumente' as const,
          label: 'Dokumente',
          iconName: 'files',
          count: dokumenteCount || undefined,
        },
      ]
      return tabs
    },
    [anfragenCount, angeboteCount, auftraegeCount, dokumenteCount, zeigtOrganisationTab]
  )

  const ueberfaellig = useMemo(() => {
    const now = Date.now()
    return rechnungen.filter((r) => {
      if (r.status === 'bezahlt' || r.status === 'storniert') return false
      if (!r.faellig_am) return false
      const t = new Date(r.faellig_am).getTime()
      return t < now
    })
  }, [rechnungen])

  function openEditModal() {
    setEditErr(null)
    setEditForm(buildEditFormFromKunde(kunde))
    setEditOpen(true)
  }

  function saveKundeModal() {
    setEditErr(null)
    startTransition(async () => {
      const firmaPflicht = istKundeFirmaPflichtTyp(editForm.typ)
      const r = await saveKunde(
        {
          typ: editForm.typ,
          name: firmaPflicht ? editForm.firmaName : null,
          vorname: editForm.vorname || null,
          nachname: editForm.nachname || null,
          strasse: editForm.strasse,
          hausnummer: editForm.hausnummer,
          telefon: editForm.telefon || null,
          email: editForm.email || null,
          plz: editForm.plz || null,
          ort: editForm.ort || null,
          webseite: editForm.webseite || null,
          ansprechpartner: editForm.ansprechpartner || null,
          quelle: editForm.quelle || null,
          notizen: interneNotiz.trim() || null,
        },
        kunde.id
      )
      if (!r.ok) {
        setEditErr(r.message)
        toast.error(r.message)
        return
      }
      const name = firmaPflicht ? editForm.firmaName.trim() : kunde.name
      setKunde((prev) => ({
        ...prev,
        typ: editForm.typ,
        name,
        vorname: editForm.vorname || null,
        nachname: editForm.nachname || null,
        strasse: editForm.strasse || null,
        hausnummer: editForm.hausnummer || null,
        telefon: editForm.telefon || null,
        email: editForm.email || null,
        plz: editForm.plz || null,
        ort: editForm.ort || null,
        webseite: editForm.webseite || null,
        ansprechpartner: editForm.ansprechpartner || null,
        quelle: editForm.quelle || null,
        adresse: [editForm.strasse, editForm.hausnummer].filter(Boolean).join(' ') || null,
      }))
      toast.success('Stammdaten gespeichert')
      setEditOpen(false)
      refresh()
    })
  }

  async function openPortalModal() {
    setPortalLoading(true)
    const draft = await getKundenPortalMailDraft(kunde.id)
    setPortalLoading(false)
    if (!draft.ok) return
    setPortalLink(draft.portalLink)
    setPortalTo(draft.to)
    setPortalCc(draft.cc.join('; '))
    setPortalBetreff(draft.betreff)
    setPortalText(draft.text)
    setPortalHtml(draft.html)
    setPortalAnrede(draft.anrede)
    setPortalModalOpen(true)
  }

  async function sendenPortalLink() {
    setPortalSending(true)
    const toList = parseEmailTokens(portalTo)
    const ccList = parseEmailTokens(portalCc)
    const toPrimary = toList[0] ?? ''
    const ccMerged = [...ccList, ...toList.slice(1)].filter(Boolean)
    const res = await sendKundenPortalLinkMail({
      kundeId: kunde.id,
      to: toPrimary,
      cc: ccMerged,
      betreff: portalBetreff,
      text: portalText,
      anrede: portalAnrede,
    })
    setPortalSending(false)
    if (!res.ok) return
    setPortalModalOpen(false)
  }

  useEffect(() => {
    if (!portalModalOpen) return
    const timer = setTimeout(() => {
      void (async () => {
        const preview = await previewKundenPortalMail({
          kundeId: kunde.id,
          text: portalText,
          anrede: portalAnrede,
        })
        if (!preview.ok) return
        setPortalHtml(preview.html)
      })()
    }, 250)
    return () => clearTimeout(timer)
  }, [portalModalOpen, portalText, portalAnrede, kunde.id])

  const zusatzfelderCard =
    customFieldDefs.length > 0 ? (
      <Card title="Zusatzfelder" collapsible>
        <div className="space-y-3">
          {customFieldDefs.map((def) => {
            const row = customValues.find((v) => v.definition_id === def.id)
            return (
              <CustomFieldRenderer
                key={def.id}
                def={def}
                value={row?.wert ?? ''}
                onChange={(wert) => {
                  setCustomValues((prev) => {
                    const next = [...prev]
                    const i = next.findIndex((x) => x.definition_id === def.id)
                    const stub: CustomFieldValueRow = {
                      id: row?.id ?? 'local',
                      definition_id: def.id,
                      objekt_id: kunde.id,
                      wert,
                      created_at: row?.created_at ?? new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                      custom_field_definitions: def,
                    }
                    if (i >= 0) next[i] = { ...next[i], wert }
                    else next.push(stub)
                    return next
                  })
                  const prevT = customSaveTimers.current[def.id]
                  if (prevT) clearTimeout(prevT)
                  customSaveTimers.current[def.id] = setTimeout(() => {
                    void (async () => {
                      await saveKundeCustomFieldValue(def.id, kunde.id, wert)
                      refresh()
                    })()
                  }, 600)
                }}
              />
            )
          })}
        </div>
      </Card>
    ) : null

  const stammdatenCard = (
    <Card
      collapsible
      title="Stammdaten"
      action={
        <button type="button" onClick={openEditModal} className="btn btn-ghost btn-sm" aria-label="Bearbeiten">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      }
    >
      {kundenStamm.fehlendeRechnungsfelder.length > 0 ? (
        <p className="mb-3 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-[12px] text-amber-950">
          Für Rechnungen fehlen: {kundenStamm.fehlendeRechnungsfelder.join(', ')}.
        </p>
      ) : null}
      <div className="props">
        {kundenStamm.kundennummer ? (
          <DetailProp label="Kundennr.">{kundenStamm.kundennummer}</DetailProp>
        ) : null}
        {istKundeFirmaPflichtTyp(kunde.typ) ? (
          <>
            <DetailProp label="Firma">{kunde.name?.trim() || '—'}</DetailProp>
            {kundenStamm.vorname ? (
              <DetailProp label="Vorname (Ansprechpartner)">{kundenStamm.vorname}</DetailProp>
            ) : null}
            {kundenStamm.nachname ? (
              <DetailProp label="Nachname (Ansprechpartner)">{kundenStamm.nachname}</DetailProp>
            ) : null}
          </>
        ) : (
          <>
            {kundenStamm.vorname ? <DetailProp label="Vorname">{kundenStamm.vorname}</DetailProp> : null}
            <DetailProp label="Nachname">{kundenStamm.nachname || '—'}</DetailProp>
          </>
        )}
        {kundenStamm.ansprechpartner && istKundeNurGewerbeTyp(kunde.typ) ? (
          <DetailProp label="Ansprechpartner">{kundenStamm.ansprechpartner}</DetailProp>
        ) : null}
        <DetailProp label="Straße">{kundenStamm.strasse || '—'}</DetailProp>
        <DetailProp label="Hausnummer">{kundenStamm.hausnummer || '—'}</DetailProp>
        <DetailProp label="Postleitzahl">{kundenStamm.plz || '—'}</DetailProp>
        <DetailProp label="Ort">{kundenStamm.ort || '—'}</DetailProp>
        <DetailProp label="Kundentyp">{kundentypLabel(kunde.typ)}</DetailProp>
        <DetailProp label="Telefon">
          {kundenStamm.telefon ? (
            <a href={`tel:${kundenStamm.telefon.replace(/\s/g, '')}`}>{kundenStamm.telefon}</a>
          ) : (
            '—'
          )}
        </DetailProp>
        <DetailProp label="E-Mail">
          {kundenStamm.email ? (
            <a href={`mailto:${kundenStamm.email}`}>{kundenStamm.email}</a>
          ) : (
            '—'
          )}
        </DetailProp>
        {kundenStamm.ust_id ? <DetailProp label="USt-IdNr.">{kundenStamm.ust_id}</DetailProp> : null}
        {kunde.quelle ? (
          <DetailProp label="Quelle">{QUELLE_LABELS[kunde.quelle] ?? kunde.quelle}</DetailProp>
        ) : null}
        {kunde.webseite ? (
          <DetailProp label="Webseite">
            <a
              href={kunde.webseite.startsWith('http') ? kunde.webseite : `https://${kunde.webseite}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {kunde.webseite}
            </a>
          </DetailProp>
        ) : null}
        {kunde.geburtstag ? (
          <DetailProp label="Geburtstag">{formatDatum(kunde.geburtstag)}</DetailProp>
        ) : null}
      </div>
    </Card>
  )

  const kpiRow = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {[
        ['Anfragen', String(anfragenCount)],
        ['Angebote', String(angeboteCount)],
        ['Aufträge', String(auftraegeCount)],
        ['Umsatz', formatEur(kunde.gesamt_umsatz)],
        ['Ø Auftrag', formatEur(avgAuftrag)],
        ['Offen', formatEur(offenSumme)],
      ].map(([label, value]) => (
        <div key={label} className="rounded-lg border border-bw-border bg-bw-card px-3 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-bw-text-muted">{label}</div>
          <div className="mt-0.5 text-base font-semibold tabular-nums text-bw-text">{value}</div>
        </div>
      ))}
    </div>
  )

  const fixedOverview = (
    <div className="space-y-3">
      {stammdatenCard}
      <StammdatenVerknuepfungen verwandte={verwandteStammdaten} />
      {zusatzfelderCard}
      {istKundeGewerbeTyp(kunde.typ) ? (
        <KundenObjekteCard
          kundeId={kunde.id}
          objekte={kundenObjekte}
          orgKennung={kunde.org_kennung}
          onChanged={() => refresh()}
        />
      ) : null}
      <Card title="Interne Notiz" collapsible>
        <p className="mb-2 text-xs text-bw-text-muted">Wird automatisch gespeichert</p>
        <Textarea
          placeholder="Interne Kundennotiz…"
          value={interneNotiz}
          onChange={(e) => setInterneNotiz(e.target.value)}
          rows={5}
        />
      </Card>
      {kpiRow}
      <KommunikationCard filter={{ kundeId: kunde.id }} reloadKey={mailCompose.reloadKey + generation} />
    </div>
  )

  const tabDokumenteInhalt = (
    <div className="space-y-10">
      {(kunde.auftraege ?? []).map((a) => {
        const atitel = a.titel?.trim() || 'Auftrag'
        const angeboteZeilen: CrmDokumentZeile[] = [
          ...normalizeAuftragAngebote(a.angebote).map((ang) => ({
            id: `angebot-${ang.id}`,
            datum: ang.created_at ?? a.created_at,
            name: `Angebot ${String(ang.id).slice(0, 8).toUpperCase()}`,
            href: ang.pdf_url?.trim() || `/api/angebote/${String(ang.id)}/pdf`,
          })),
          ...(angeboteAnAuftrag.get(a.id) ?? []).filter(
            (z) => !normalizeAuftragAngebote(a.angebote).some((ang) => z.id === `angebot-${ang.id}`)
          ),
        ]
        const rechnungZeilen: CrmDokumentZeile[] = rechnungen
          .filter((r) => r.auftrag_id === a.id)
          .map((r) => ({
            id: `rechnung-${r.id}`,
            name: r.rechnungsnummer?.trim() || 'Rechnung',
            datum: r.rechnungsdatum,
            href: r.pdf_url?.trim() || `/api/rechnungen/${r.id}/pdf`,
          }))
        const dokumentationZeilen: CrmDokumentZeile[] = []
        if (a.abnahme_protokoll_url) {
          dokumentationZeilen.push({
            id: `abnahme-${a.id}`,
            name: 'Abnahmeprotokoll',
            datum: a.created_at,
            href: a.abnahme_protokoll_url,
          })
        }
        dokumentationZeilen.push({
          id: `abschluss-${a.id}`,
          name: 'Abschlussdokumentation (PDF)',
          datum: a.created_at,
          href: `/api/auftraege/${a.id}/abschlussdokumentation/pdf`,
        })
        return (
          <section key={a.id} className="space-y-4">
            <h3 className="border-b border-bw-border pb-2 text-sm font-semibold text-bw-text">
              <Link href={`/auftraege/${a.id}`} className="text-bw-link hover:underline">
                Auftrag: {atitel}
              </Link>
            </h3>
            <div className="space-y-3">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-bw-text-muted">Angebote</h4>
              <CrmDokumenteTabelle zeilen={angeboteZeilen} emptyDescription="Keine Angebots-PDFs." />
            </div>
            <div className="space-y-3">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-bw-text-muted">Rechnungen</h4>
              <CrmDokumenteTabelle zeilen={rechnungZeilen} emptyDescription="Keine Rechnungs-PDFs." />
            </div>
            <div className="space-y-3">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-bw-text-muted">
                Abnahme & Dokumentation
              </h4>
              <CrmDokumenteTabelle
                zeilen={dokumentationZeilen}
                emptyDescription="Keine Abnahme- oder Protokolldokumente."
              />
            </div>
          </section>
        )
      })}

      {(kunde.leads ?? [])
        .filter((l) => (l.angebote ?? []).some((ang) => !('auftrag_id' in ang) || !ang.auftrag_id))
        .map((l) => {
          const titel =
            leadSituationDisplay(l.situation) ||
            (l.bereiche?.length ? l.bereiche.map((b) => BEREICH_LABELS[b] ?? b).join(', ') : 'Anfrage')
          const zeilen: CrmDokumentZeile[] = (l.angebote ?? [])
            .filter((ang) => !('auftrag_id' in ang) || !ang.auftrag_id)
            .map((ang) => ({
              id: `angebot-${ang.id}`,
              datum: ang.created_at ?? l.created_at,
              name: `Angebot ${ang.id.slice(0, 8).toUpperCase()}`,
              href: ang.pdf_url?.trim() || `/api/angebote/${ang.id}/pdf`,
            }))
          if (!zeilen.length) return null
          return (
            <section key={l.id} className="space-y-3">
              <h3 className="border-b border-bw-border pb-2 text-sm font-semibold text-bw-text">
                <Link href={`/anfragen/${l.id}`} className="text-bw-link hover:underline">
                  Anfrage: {titel}
                </Link>
              </h3>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-bw-text-muted">Angebote</h4>
              <CrmDokumenteTabelle zeilen={zeilen} emptyDescription="Keine Angebots-PDFs." />
            </section>
          )
        })}

      <section className="space-y-3">
        <h3 className="border-b border-bw-border pb-2 text-sm font-semibold uppercase tracking-wide text-bw-text">
          Sonstige Dokumente
        </h3>
        <CrmDokumenteTabelle
          zeilen={(kunde.kunden_dokumente ?? [])
            .filter((d) => d.datei_url?.trim())
            .map((d) => ({
              id: d.id,
              name: d.name,
              datum: d.created_at,
              href: d.datei_url!.trim(),
            }))}
          emptyDescription="Noch keine sonstigen Dokumente."
        />
        <div className="kunde-dok-upload">
          Datei hierher ziehen oder <span className="font-medium text-bw-link">Datei auswählen</span>
          <div className="kunde-dok-upload__hint">PDF, JPG, PNG · max 10MB (Upload folgt)</div>
        </div>
      </section>
    </div>
  )

  const AUFTRAEGE_GRID_COLS = '100px minmax(180px,2fr) 110px 100px'
  const ANFRAGEN_GRID_COLS = '100px minmax(180px,2fr) 110px 100px 100px'
  const ANGEBOTE_GRID_COLS = '100px minmax(180px,2fr) 110px 100px 100px'

  function VorgaengeSectionHeading({ title, count }: { title: string; count?: number }) {
    return (
      <div className="flex items-baseline justify-between gap-2 border-b border-bw-border pb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-bw-text">{title}</h3>
        {count != null ? <span className="text-xs tabular-nums text-bw-text-muted">{count}</span> : null}
      </div>
    )
  }

  const tabAnfragen = (
    <section className="space-y-2">
      <VorgaengeSectionHeading title="Anfragen" count={(kunde.leads ?? []).length || undefined} />
      {(kunde.leads ?? []).length === 0 ? (
        <p className="py-4 text-center text-sm text-bw-text-muted">
          Noch keine Anfragen.{' '}
          <Link href={kundeNeueAnfrageHref(kunde.id)} className="text-bw-link hover:underline">
            Anfrage anlegen
          </Link>
        </p>
      ) : (
        <ListGridShell minWidth="720px">
          <div className="list-row-grid head" style={{ gridTemplateColumns: ANFRAGEN_GRID_COLS }}>
            <div>Nr.</div>
            <div>Anfrage</div>
            <div>Eingegangen</div>
            <div className="text-right">Preisrahmen</div>
            <div>Status</div>
          </div>
          {[...(kunde.leads ?? [])]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map((l) => {
              const titel =
                leadSituationDisplay(l.situation) ||
                (l.bereiche?.length ? l.bereiche.join(' + ') : 'Anfrage')
              const bereiche = bereicheFuerAnzeige(l.bereiche, l.situation)
              const bereicheText = bereiche.length
                ? bereiche.map((b) => BEREICH_LABELS[b] ?? b).join(', ')
                : null
              return (
                <Link
                  key={l.id}
                  href={`/anfragen/${l.id}`}
                  className="list-row-grid"
                  style={{ gridTemplateColumns: ANFRAGEN_GRID_COLS }}
                >
                  <div className="font-mono text-xs text-bw-text-muted">{l.id.slice(0, 8).toUpperCase()}</div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-bw-text">{titel}</p>
                    {bereicheText ? (
                      <p className="truncate text-xs text-bw-text-muted">{bereicheText}</p>
                    ) : null}
                  </div>
                  <p className="text-[13px] tabular-nums text-bw-text-muted">{formatDatum(l.created_at)}</p>
                  <p className="text-right text-[13px] font-medium tabular-nums text-bw-text">
                    {formatAnfragePreisAnzeige(
                      l.kanal,
                      l.budget_ca,
                      l.preis_min,
                      l.preis_max,
                      l.funnel_daten
                    )}
                  </p>
                  <LeadStatusBadge status={l.status as LeadStatus} />
                </Link>
              )
            })}
        </ListGridShell>
      )}
    </section>
  )

  const tabAngebote = (
    <section className="space-y-2">
      <VorgaengeSectionHeading title="Angebote" count={alleAngebote.length || undefined} />
      {alleAngebote.length === 0 ? (
        <p className="py-4 text-center text-sm text-bw-text-muted">
          Noch keine Angebote.{' '}
          <Link href={kundeNeuesAngebotHref(kunde)} className="text-bw-link hover:underline">
            Angebot anlegen
          </Link>
        </p>
      ) : (
        <ListGridShell minWidth="720px">
          <div className="list-row-grid head" style={{ gridTemplateColumns: ANGEBOTE_GRID_COLS }}>
            <div>Nr.</div>
            <div>Bezug</div>
            <div className="text-right">Betrag</div>
            <div>Erstellt</div>
            <div>Status</div>
          </div>
          {alleAngebote.map((a) => (
            <Link
              key={a.id}
              href={`/angebote/${a.id}`}
              className="list-row-grid"
              style={{ gridTemplateColumns: ANGEBOTE_GRID_COLS }}
            >
              <div className="font-mono text-xs text-bw-text-muted">{a.id.slice(0, 8).toUpperCase()}</div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-bw-text">{a.bezug}</p>
                <p className="truncate text-xs text-bw-text-muted">
                  {a.created_at ? formatRelativeDate(a.created_at) : '—'}
                </p>
              </div>
              <p className="text-right text-[13px] font-medium tabular-nums text-bw-text">
                {betragAnzeige(a.gesamt_fix, a.gesamt_min, a.gesamt_max)}
              </p>
              <p className="text-[13px] tabular-nums text-bw-text-muted">
                {a.created_at ? formatDatum(a.created_at) : '—'}
              </p>
              <AngebotEinfachStatusBadge
                status={resolveStatusEinfach({
                  status: a.status as AngebotStatus,
                  status_einfach: a.status_einfach ?? null,
                  gueltig_bis: a.gueltig_bis ?? null,
                })}
              />
            </Link>
          ))}
        </ListGridShell>
      )}
    </section>
  )

  const tabAuftraege = (
    <section className="space-y-2">
      <VorgaengeSectionHeading title="Aufträge" count={(kunde.auftraege ?? []).length || undefined} />
      {(kunde.auftraege ?? []).length === 0 ? (
        <p className="py-4 text-center text-sm text-bw-text-muted">
          Noch keine Aufträge.{' '}
          <Link href={kundeNeuerAuftragHref(kunde)} className="text-bw-link hover:underline">
            Auftrag anlegen
          </Link>
        </p>
      ) : (
        <ListGridShell minWidth="720px">
          <div className="list-row-grid head" style={{ gridTemplateColumns: AUFTRAEGE_GRID_COLS }}>
            <div>Nr.</div>
            <div>Auftrag</div>
            <div className="text-right">Wert</div>
            <div>Status</div>
          </div>
          {(kunde.auftraege ?? [])
            .slice()
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map((a) => {
            const agg = angebotAgg(a)
            const wert = betragAnzeige(agg?.gesamt_fix ?? null, agg?.gesamt_min ?? null, agg?.gesamt_max ?? null)
            return (
              <Link
                key={a.id}
                href={`/auftraege/${a.id}`}
                className="list-row-grid"
                style={{ gridTemplateColumns: AUFTRAEGE_GRID_COLS }}
              >
                <div className="font-mono text-xs text-bw-text-muted">{a.id.slice(0, 8).toUpperCase()}</div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-bw-text">{a.titel?.trim() || 'Auftrag'}</p>
                  <p className="truncate text-xs text-bw-text-muted">
                    {a.end_datum ? `bis ${formatDatum(a.end_datum)}` : formatDatum(a.created_at)}
                  </p>
                </div>
                <p className="text-right text-[13px] font-medium tabular-nums text-bw-text">{wert}</p>
                <AuftragStatusBadge status={a.status as AuftragStatus} />
              </Link>
            )
          })}
        </ListGridShell>
      )}
    </section>
  )

  const RECHNUNG_GRID_COLS_SIMPLE = '120px minmax(140px,1.5fr) 110px 100px'

  const tabRechnungen = (
    <div className="space-y-6">
      <section className="space-y-2">
        <VorgaengeSectionHeading title="Rechnungen" count={rechnungen.length || undefined} />
        {rechnungen.length === 0 ? (
          <p className="py-4 text-center text-sm text-bw-text-muted">Noch keine Rechnungen für diesen Kunden.</p>
        ) : (
          <ListGridShell minWidth="640px">
            <div className="list-row-grid head" style={{ gridTemplateColumns: RECHNUNG_GRID_COLS_SIMPLE }}>
              <div>Nr.</div>
              <div>Beschreibung</div>
              <div className="text-right">Betrag</div>
              <div>Status</div>
            </div>
            {[...rechnungen]
              .sort(
                (a, b) =>
                  new Date(b.rechnungsdatum ?? 0).getTime() - new Date(a.rechnungsdatum ?? 0).getTime()
              )
              .map((r) => (
                <Link
                  key={r.id}
                  href={`/rechnungen/${r.id}`}
                  className="list-row-grid"
                  style={{ gridTemplateColumns: RECHNUNG_GRID_COLS_SIMPLE }}
                >
                  <div className="font-mono text-xs text-bw-text-muted">{r.rechnungsnummer}</div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-bw-text">
                      {auftragTitelFromRechnung(r)}
                    </p>
                    <p className="truncate text-xs text-bw-text-muted">{formatDatum(r.rechnungsdatum)}</p>
                  </div>
                  <p className="text-right text-[13px] font-semibold tabular-nums text-bw-text">
                    {formatEur(r.brutto)}
                  </p>
                  {rechnungStatusBadge(r)}
                </Link>
              ))}
          </ListGridShell>
        )}
      </section>

      {einbehalteFlat.length > 0 ? (
        <section className="space-y-2">
          <VorgaengeSectionHeading title="Einbehalte" count={einbehalteFlat.length} />
          <ul className="space-y-2 text-sm">
            {einbehalteFlat.map((e) => (
              <li key={e.id} className="text-bw-text">
                <span className="font-medium">{e.auftrag}</span> · {e.label} · {formatEur(e.betrag)}
                <span className="text-bw-text-muted"> — Freigabe: {formatDatum(e.freigabe)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {ueberfaellig.length > 0 ? (
        <section className="space-y-2">
          <VorgaengeSectionHeading title="Offene Posten" count={ueberfaellig.length} />
          <ul className="space-y-2">
            {ueberfaellig.map((r) => (
              <li key={r.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                <div className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                  <Link href={`/rechnungen/${r.id}`} className="hover:underline">
                    Rechnung {r.rechnungsnummer}
                  </Link>
                </div>
                <p>
                  {auftragTitelFromRechnung(r)} · Überfällig · {formatEur(r.brutto)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )

  const ansprechperson = [kunde.vorname, kunde.nachname].filter(Boolean).join(' ').trim()
  const headSubParts = [
    QUELLE_LABELS[kunde.quelle ?? ''] ?? null,
    [kunde.plz, kunde.ort].filter(Boolean).join(' '),
    ansprechperson || kunde.ansprechpartner || null,
  ].filter(Boolean) as string[]

  const kundeMenuItems = useMemo((): ActionsMenuItem[] => {
    const items: ActionsMenuItem[] = [
      {
        label: 'Neue Anfrage',
        icon: mockMenuIcon('inbox', 16),
        onClick: () => router.push(kundeNeueAnfrageHref(kunde.id)),
      },
      {
        label: 'Neues Angebot',
        icon: mockMenuIcon('file-invoice', 16),
        onClick: () => router.push(kundeNeuesAngebotHref(kunde)),
      },
      {
        label: 'Neuer Auftrag',
        icon: mockMenuIcon('briefcase', 16),
        onClick: () => router.push(kundeNeuerAuftragHref(kunde)),
      },
      'sep',
      {
        label: 'MeinBärenwald-Einladung',
        icon: mockMenuIcon('external-link', 16),
        hint: !kunde.email ? 'Keine E-Mail' : undefined,
        onClick: () => void openPortalModal(),
      },
    ]
    if (isCrmAdmin) {
      const label = kundeDisplayName(kunde) || kunde.name || 'Kunde'
      items.push('sep', {
        label: 'Admin Login',
        icon: mockMenuIcon('external-link', 16),
        hint: !hasPortalAccount
          ? 'Kein Portal-Account'
          : impersonating
            ? 'Öffne…'
            : `HV-Portal als ${label}`,
        onClick: () => {
          if (!hasPortalAccount || impersonating) return
          setImpersonating(true)
          void openPortalAsKunde(kunde.id).then((r) => {
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
  }, [kunde, router, isCrmAdmin, impersonating, hasPortalAccount])

  const tabOrganisation = zeigtOrganisationTab ? (
    <KundenOrganisationTab
      kunde={kunde}
      hasPortalAccount={hasPortalAccount}
      onInvitePortal={() => void openPortalModal()}
      onSaved={() => refresh()}
    />
  ) : null

  const stammdatenInhalt = fixedOverview

  const desktopTabContent =
    tab === 'organisation'
      ? tabOrganisation
      : tab === 'anfragen'
        ? tabAnfragen
        : tab === 'angebote'
          ? tabAngebote
          : tab === 'auftraege'
            ? tabAuftraege
            : tabDokumenteInhalt

  const mobileTabContent =
    tab === 'stammdaten'
      ? stammdatenInhalt
      : tab === 'organisation'
        ? tabOrganisation
        : tab === 'anfragen'
          ? tabAnfragen
          : tab === 'angebote'
            ? tabAngebote
            : tab === 'auftraege'
              ? tabAuftraege
              : tabDokumenteInhalt

  return (
    <div className="space-y-4 pb-6">
      <DetailHead
        backHref="/kunden"
        backLabel="Zurück zu Kunden"
        title={
          <div className="detail-head-title-row">
            <span>{kundeDisplayName(kunde)}</span>
            <TypBadge typ={kunde.typ} />
          </div>
        }
        sub={headSubParts.join(' · ') || 'Kunde'}
        actions={
          <>
            <button
              type="button"
              className="btn btn-primary btn-sm inline-flex shrink-0 gap-1.5"
              onClick={() => mailCompose.openCompose(() => mailComposeContextFromKunde(kunde.id))}
            >
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
              E-Mail
            </button>
            {hasPortalAccount ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900">
                Portal-Konto aktiv
              </span>
            ) : null}
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
              items={kundeMenuItems}
              sheetTitle="Kunde"
            />
          </>
        }
      />

      <DetailResponsiveTabs
        tab={tab}
        onTabChange={setTab}
        desktopOverview={fixedOverview}
        desktopTabs={
          <DetailTabBar tabs={desktopDetailTabs} value={tab} onChange={(id) => setTab(id as KundeDetailTab)} />
        }
        mobileTabs={
          <DetailTabBar tabs={mobileDetailTabs} value={tab} onChange={(id) => setTab(id as KundeDetailTab)} />
        }
        desktopTabContent={desktopTabContent}
        mobileTabContent={mobileTabContent}
        mobileDefaultTab="stammdaten"
        desktopDefaultTab="anfragen"
        mobileTabIds={mobileKundeTabIds}
        desktopTabIds={desktopKundeTabIds}
      />

      <Modal
        open={portalModalOpen}
        onClose={() => setPortalModalOpen(false)}
        title="MeinBärenwald-Einladung senden"
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
            placeholder="kunde@beispiel.de; weitere@beispiel.de"
          />
          <Input
            label="CC (optional)"
            value={portalCc}
            onChange={(e) => setPortalCc(e.target.value)}
            placeholder="intern@baerenwald.de; team@baerenwald.de"
          />
          <Select
            label="Anrede"
            name="portal-anrede"
            value={portalAnrede}
            onChange={(e) => {
              const next = e.target.value === 'du' ? 'du' : 'sie'
              setPortalAnrede(next)
              const istOrg = kunde.portal_modus === 'organisation'
              setPortalBetreff(defaultPortalInviteBetreff(next, { organisation: istOrg }))
              setPortalText(
                defaultPortalInviteText(next, {
                  organisation: istOrg,
                  orgName: kunde.org_anzeigename ?? kunde.name,
                })
              )
            }}
            options={[
              { value: 'du', label: 'Du' },
              { value: 'sie', label: 'Sie' },
            ]}
          />
          <Input label="Betreff" value={portalBetreff} onChange={(e) => setPortalBetreff(e.target.value)} />
          <Textarea label="Text" rows={6} value={portalText} onChange={(e) => setPortalText(e.target.value)} />
          <div>
            <p className="mb-1 text-xs font-medium text-bw-text-muted">Mail-Vorschau</p>
            <iframe
              title="Kundenportal Mail Vorschau"
              sandbox="allow-same-origin"
              className="h-[300px] w-full rounded-lg border border-bw-border bg-white"
              srcDoc={portalHtml}
            />
          </div>
          <Input
            label="MeinBärenwald Login"
            value={portalLink}
            readOnly
            className="bg-bw-bg-soft"
          />
          <p className="text-xs text-bw-text-muted">
            Der Button in der Mail führt immer zu <strong>/portal/login</strong>. Mehrere Adressen in „An“/„CC“
            mit Semikolon trennen.
          </p>
        </div>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Kunde bearbeiten"
        size="md"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" onClick={saveKundeModal} loading={pending}>
              Speichern
            </Button>
          </div>
        }
      >
        {editErr ? <p className="mb-3 text-sm text-status-cancel-text">{editErr}</p> : null}
        <div className="form-grid-2 grid gap-3 md:grid-cols-2">
          <Select
            label="Typ *"
            name="typ"
            value={editForm.typ}
            onChange={(e) => setEditForm((f) => ({ ...f, typ: e.target.value }))}
            options={TYP_OPTIONS}
          />
          {istKundeFirmaPflichtTyp(editForm.typ) ? (
            <Input
              label={istKundeHausverwaltungTyp(editForm.typ) ? 'Firma *' : 'Firma / Name *'}
              value={editForm.firmaName}
              onChange={(e) => setEditForm((f) => ({ ...f, firmaName: e.target.value }))}
            />
          ) : null}
          {istKundeFirmaPflichtTyp(editForm.typ) ? (
            <>
              <Input
                label="Vorname (Ansprechpartner)"
                value={editForm.vorname}
                onChange={(e) => setEditForm((f) => ({ ...f, vorname: e.target.value }))}
              />
              <Input
                label="Nachname (Ansprechpartner)"
                value={editForm.nachname}
                onChange={(e) => setEditForm((f) => ({ ...f, nachname: e.target.value }))}
              />
            </>
          ) : null}
          {!istKundeFirmaPflichtTyp(editForm.typ) ? (
            <>
              <Input
                label="Vorname"
                value={editForm.vorname}
                onChange={(e) => setEditForm((f) => ({ ...f, vorname: e.target.value }))}
              />
              <Input
                label="Nachname *"
                value={editForm.nachname}
                onChange={(e) => setEditForm((f) => ({ ...f, nachname: e.target.value }))}
              />
            </>
          ) : null}
          <Input
            label="Straße *"
            value={editForm.strasse}
            onChange={(e) => setEditForm((f) => ({ ...f, strasse: e.target.value }))}
          />
          <Input
            label="Hausnummer *"
            value={editForm.hausnummer}
            onChange={(e) => setEditForm((f) => ({ ...f, hausnummer: e.target.value }))}
          />
          <Input
            label="Postleitzahl *"
            value={editForm.plz}
            onChange={(e) => setEditForm((f) => ({ ...f, plz: e.target.value }))}
          />
          <Input label="Ort *" value={editForm.ort} onChange={(e) => setEditForm((f) => ({ ...f, ort: e.target.value }))} />
          <Input
            label="Telefon"
            type="tel"
            value={editForm.telefon}
            onChange={(e) => setEditForm((f) => ({ ...f, telefon: e.target.value }))}
          />
          <Input
            label="E-Mail"
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            label="Webseite"
            value={editForm.webseite}
            onChange={(e) => setEditForm((f) => ({ ...f, webseite: e.target.value }))}
          />
          {istKundeNurGewerbeTyp(editForm.typ) ? (
            <Input
              label="Ansprechpartner"
              value={editForm.ansprechpartner}
              onChange={(e) => setEditForm((f) => ({ ...f, ansprechpartner: e.target.value }))}
            />
          ) : null}
          <Select
            label="Quelle"
            name="quelle"
            value={editForm.quelle}
            onChange={(e) => setEditForm((f) => ({ ...f, quelle: e.target.value }))}
            options={[
              { value: '', label: '—' },
              ...Object.entries(QUELLE_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
        </div>
      </Modal>

      {mailCompose.modal}
    </div>
  )
}
