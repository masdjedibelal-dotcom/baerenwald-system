'use client'

import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { MockDetailBackLink } from '@/components/mock-ui/MockDetailBackLink'
import { DetailShell, type DetailShellGroup } from '@/components/mock-ui/DetailShell'
import { KundeWirtschaftlicheUebersicht } from '@/components/kunden/KundeWirtschaftlicheUebersicht'
import { Suspense, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { InlineEditField, InlineEditSection } from '@/components/ui/InlineEditSection'
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
import { KundenDokumenteTab } from '@/components/kunden/KundenDokumenteTab'
import { KundenNotizenTab } from '@/components/kunden/KundenNotizenTab'
import type { KundenObjekt } from '@/lib/types'
import {
  kundeNeueAnfrageHref,
  kundeNeuerAuftragHref,
  kundeNeuesAngebotHref,
} from '@/lib/kunden/kunde-pipeline-nav'
import { DetailHead } from '@/components/layout/DetailHead'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { ActionsMenu, type ActionsMenuItem } from '@/components/ui/actions-menu'
import { useKundenMailCompose } from '@/components/kommunikation/useKundenMailCompose'
import { mailComposeContextFromKunde } from '@/app/(dashboard)/kommunikation/actions'
import { MockIcon, mockMenuIcon } from '@/components/mock-ui/MockIcon'
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
import { kundentypLabel } from '@/lib/lead-display-helpers'
import { kundeRechnungsempfaengerAusStammdaten } from '@/lib/kunde-rechnungsempfaenger'
import { parseEmailTokens } from '@/lib/email-recipients'
import { VorgaengeListeClient } from '@/components/vorgaenge/VorgaengeListeClient'
import type { VorgangListeRow } from '@/lib/vorgang/types'
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

type KundeDetailTab = 'uebersicht' | 'objekte' | 'stammdaten' | 'vorgaenge' | 'dokumente' | 'notizen'

export function KundeDetailClient({
  kunde: initialKunde,
  customFieldDefs,
  customValues: initialValues,
  kundenObjekte = [],
  vorgaengeRows = [],
}: {
  kunde: KundeDetailPayload
  customFieldDefs: CustomFieldDefinition[]
  customValues: CustomFieldValueRow[]
  kundenObjekte?: KundenObjekt[]
  vorgaengeRows?: VorgangListeRow[]
}) {
  const router = useRouter()
  const { refresh, generation } = useCrmRefresh()
  const mailCompose = useKundenMailCompose()
  const [kunde, setKunde] = useState(initialKunde)
  const [tab, setTab] = useState<KundeDetailTab>('uebersicht')
  const [pending, startTransition] = useTransition()
  const [customValues, setCustomValues] = useState(initialValues)
  const customSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [editingKontakt, setEditingKontakt] = useState(false)
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
    setEditForm(buildEditFormFromKunde(initialKunde))
  }, [initialKunde])

  const rechnungen = useMemo(() => kunde.rechnungen ?? [], [kunde.rechnungen])

  const dokumenteCount = useMemo(() => {
    let n = (kunde.kunden_dokumente ?? []).filter(
      (d) => d.typ !== 'protokoll' && d.datei_url?.trim()
    ).length
    const seenAngebote = new Set<string>()
    for (const a of kunde.auftraege ?? []) {
      for (const ang of normalizeAuftragAngebote(a.angebote)) {
        if (ang?.id && !seenAngebote.has(ang.id)) {
          seenAngebote.add(ang.id)
          n += 1
        }
      }
      if (a.abnahme_protokoll_url?.trim()) n += 1
      n += 1 // Abschlussdokumentation
    }
    for (const l of kunde.leads ?? []) {
      for (const ang of l.angebote ?? []) {
        if (!ang?.id || seenAngebote.has(ang.id)) continue
        if ('auftrag_id' in ang && ang.auftrag_id) continue
        seenAngebote.add(ang.id)
        n += 1
      }
    }
    n += rechnungen.length
    return n
  }, [kunde, rechnungen])

  const zeigtOrganisationTab =
    istKundeGewerbeTyp(kunde.typ) || kunde.portal_modus === 'organisation'

  const kundenStamm = useMemo(() => kundeRechnungsempfaengerAusStammdaten(kunde), [kunde])

  const zeigtObjekteTab = istKundeHausverwaltungTyp(kunde.typ)

  function beginEditKontakt() {
    setEditErr(null)
    setEditForm(buildEditFormFromKunde(kunde))
    setTab('stammdaten')
    setEditingKontakt(true)
  }

  function cancelEditKontakt() {
    setEditingKontakt(false)
    setEditErr(null)
    setEditForm(buildEditFormFromKunde(kunde))
  }

  function saveKundeStamm() {
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
      setEditingKontakt(false)
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

  const adresseAnzeige = [
    [kunde.strasse, kunde.hausnummer].filter(Boolean).join(' ') || kunde.adresse,
    [kunde.plz, kunde.ort].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ') || '—'

  const kontaktCard = (
    <InlineEditSection
      title="Stammdaten"
      editing={editingKontakt}
      onStartEdit={beginEditKontakt}
      onCancel={cancelEditKontakt}
      onSave={saveKundeStamm}
      saving={pending}
    >
      {editingKontakt ? (
        <p className="inline-edit-hint">
          <MockIcon ctx="default" n="info-circle" size={14} />
          Hervorgehobene Felder sind bearbeitbar.
        </p>
      ) : null}
      {editErr ? <p className="mb-2 text-sm text-status-cancel-text">{editErr}</p> : null}
      {kundenStamm.fehlendeRechnungsfelder.length > 0 && !editingKontakt ? (
        <p className="mb-3 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-[12px] text-amber-950">
          Für Rechnungen fehlen: {kundenStamm.fehlendeRechnungsfelder.join(', ')}.
        </p>
      ) : null}
      <div className="props">
        {editingKontakt ? (
          <>
            <InlineEditField label="Typ" editing value={kundentypLabel(editForm.typ)}>
              <select
                className="input"
                value={editForm.typ}
                onChange={(e) => setEditForm((f) => ({ ...f, typ: e.target.value }))}
              >
                {TYP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </InlineEditField>
            {istKundeFirmaPflichtTyp(editForm.typ) ? (
              <InlineEditField
                label={istKundeHausverwaltungTyp(editForm.typ) ? 'Firma' : 'Firma / Name'}
                editing
                value={editForm.firmaName || '—'}
              >
                <input
                  className="input"
                  value={editForm.firmaName}
                  onChange={(e) => setEditForm((f) => ({ ...f, firmaName: e.target.value }))}
                  autoFocus
                />
              </InlineEditField>
            ) : null}
            <InlineEditField label="Vorname" editing value={editForm.vorname || '—'}>
              <input
                className="input"
                value={editForm.vorname}
                onChange={(e) => setEditForm((f) => ({ ...f, vorname: e.target.value }))}
                autoFocus={!istKundeFirmaPflichtTyp(editForm.typ)}
              />
            </InlineEditField>
            <InlineEditField
              label={istKundeFirmaPflichtTyp(editForm.typ) ? 'Nachname (Ansprechpartner)' : 'Nachname'}
              editing
              value={editForm.nachname || '—'}
            >
              <input
                className="input"
                value={editForm.nachname}
                onChange={(e) => setEditForm((f) => ({ ...f, nachname: e.target.value }))}
              />
            </InlineEditField>
            <InlineEditField label="Straße" editing value={editForm.strasse || '—'}>
              <input
                className="input"
                value={editForm.strasse}
                onChange={(e) => setEditForm((f) => ({ ...f, strasse: e.target.value }))}
              />
            </InlineEditField>
            <InlineEditField label="Hausnummer" editing value={editForm.hausnummer || '—'}>
              <input
                className="input"
                value={editForm.hausnummer}
                onChange={(e) => setEditForm((f) => ({ ...f, hausnummer: e.target.value }))}
              />
            </InlineEditField>
            <InlineEditField label="PLZ" editing value={editForm.plz || '—'}>
              <input
                className="input"
                value={editForm.plz}
                onChange={(e) => setEditForm((f) => ({ ...f, plz: e.target.value }))}
              />
            </InlineEditField>
            <InlineEditField label="Ort" editing value={editForm.ort || '—'}>
              <input
                className="input"
                value={editForm.ort}
                onChange={(e) => setEditForm((f) => ({ ...f, ort: e.target.value }))}
              />
            </InlineEditField>
            <InlineEditField label="Telefon" editing value={editForm.telefon || '—'}>
              <input
                className="input"
                type="tel"
                value={editForm.telefon}
                onChange={(e) => setEditForm((f) => ({ ...f, telefon: e.target.value }))}
              />
            </InlineEditField>
            <InlineEditField label="E-Mail" editing value={editForm.email || '—'}>
              <input
                className="input"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              />
            </InlineEditField>
            {istKundeNurGewerbeTyp(editForm.typ) ? (
              <InlineEditField label="Ansprechpartner" editing value={editForm.ansprechpartner || '—'}>
                <input
                  className="input"
                  value={editForm.ansprechpartner}
                  onChange={(e) => setEditForm((f) => ({ ...f, ansprechpartner: e.target.value }))}
                />
              </InlineEditField>
            ) : null}
            <InlineEditField label="Webseite" editing value={editForm.webseite || '—'}>
              <input
                className="input"
                value={editForm.webseite}
                onChange={(e) => setEditForm((f) => ({ ...f, webseite: e.target.value }))}
              />
            </InlineEditField>
            <InlineEditField
              label="Quelle"
              editing
              value={(QUELLE_LABELS[editForm.quelle] ?? editForm.quelle) || '—'}
            >
              <select
                className="input"
                value={editForm.quelle}
                onChange={(e) => setEditForm((f) => ({ ...f, quelle: e.target.value }))}
              >
                <option value="">—</option>
                {Object.entries(QUELLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </InlineEditField>
          </>
        ) : (
          <>
            <InlineEditField
              label="Telefon"
              editing={false}
              link={Boolean(kundenStamm.telefon)}
              value={
                kundenStamm.telefon ? (
                  <a href={`tel:${kundenStamm.telefon.replace(/\s/g, '')}`}>{kundenStamm.telefon}</a>
                ) : (
                  '—'
                )
              }
            />
            <InlineEditField
              label="E-Mail"
              editing={false}
              link={Boolean(kundenStamm.email)}
              value={
                kundenStamm.email ? (
                  <a href={`mailto:${kundenStamm.email}`}>{kundenStamm.email}</a>
                ) : (
                  '—'
                )
              }
            />
            <InlineEditField label="Adresse" editing={false} value={adresseAnzeige} />
            <InlineEditField label="Typ" editing={false} value={kundentypLabel(kunde.typ)} />
          </>
        )}
      </div>
    </InlineEditSection>
  )

  const fixedOverview = <KundeWirtschaftlicheUebersicht kunde={kunde} />

  const tabStammdaten = (
    <>
      {kontaktCard}
      {zusatzfelderCard}
    </>
  )

  const tabObjekte = zeigtObjekteTab ? (
    <KundenObjekteCard
      kundeId={kunde.id}
      objekte={kundenObjekte}
      orgKennung={kunde.org_kennung}
      onChanged={() => refresh()}
    />
  ) : null

  const tabNotizen = (
    <KundenNotizenTab
      kundeId={kunde.id}
      notizen={kunde.kunden_notizen ?? []}
      legacyNotiz={kunde.notizen}
      onReload={() => refresh()}
    />
  )

  const tabDokumenteInhalt = (
    <KundenDokumenteTab
      kundeId={kunde.id}
      dokumente={kunde.kunden_dokumente ?? []}
      auftraege={kunde.auftraege ?? []}
      leads={kunde.leads ?? []}
      rechnungen={rechnungen}
      onReload={() => refresh()}
    />
  )

  const kundeLeadIds = useMemo(
    () => (kunde.leads ?? []).map((l) => l.id).filter(Boolean),
    [kunde.leads]
  )

  const kundeVorgaengeCount = useMemo(() => {
    const ids = new Set(kundeLeadIds)
    return vorgaengeRows.filter(
      (r) => r.kundeId === kunde.id || ids.has(r.leadId)
    ).length
  }, [vorgaengeRows, kundeLeadIds, kunde.id])

  const tabVorgaenge = (
    <Suspense
      fallback={
        <p className="py-6 text-center text-sm text-bw-text-muted" aria-busy="true">
          Vorgänge werden geladen…
        </p>
      }
    >
      <VorgaengeListeClient
        rows={vorgaengeRows}
        embedded
        restrictKundeId={kunde.id}
        restrictLeadIds={kundeLeadIds}
      />
    </Suspense>
  )

  const kundeMenuItems = useMemo((): ActionsMenuItem[] => {
    const items: ActionsMenuItem[] = [
      {
        label: 'Bearbeiten',
        icon: mockMenuIcon('pencil', 16),
        onClick: beginEditKontakt,
      },
      {
        label: 'Mail schreiben',
        icon: mockMenuIcon('mail', 16),
        onClick: () => mailCompose.openCompose(() => mailComposeContextFromKunde(kunde.id)),
      },
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
    if (zeigtOrganisationTab) {
      items.push({
        label: 'Organisation',
        icon: mockMenuIcon('building', 16),
        onClick: () => setTab('stammdaten'),
      })
    }
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
  }, [kunde, router, isCrmAdmin, impersonating, hasPortalAccount, zeigtOrganisationTab, mailCompose])

  const tabOrganisation = zeigtOrganisationTab ? (
    <KundenOrganisationTab
      kunde={kunde}
      hasPortalAccount={hasPortalAccount}
      onInvitePortal={() => void openPortalModal()}
      onSaved={() => refresh()}
    />
  ) : null

  const stammdatenInhalt = (
    <>
      {tabStammdaten}
      {zeigtOrganisationTab ? tabOrganisation : null}
    </>
  )

  const detailShellGroups: DetailShellGroup[] = [
    {
      id: 'uebersicht',
      label: 'Übersicht',
      icon: 'layout-dashboard',
      render: () => fixedOverview,
    },
    ...(zeigtObjekteTab
      ? [
          {
            id: 'objekte' as const,
            label: 'Objekte',
            icon: 'building',
            count: kundenObjekte.length || undefined,
            render: () => tabObjekte,
          },
        ]
      : []),
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
      count: kundeVorgaengeCount || undefined,
      render: () => tabVorgaenge,
    },
    {
      id: 'dokumente',
      label: 'Dokumente',
      icon: 'files',
      count: dokumenteCount || undefined,
      render: () => tabDokumenteInhalt,
    },
    {
      id: 'notizen',
      label: 'Notizen',
      icon: 'messages',
      count:
        (kunde.kunden_notizen?.length ?? 0) || (kunde.notizen?.trim() ? 1 : 0) || undefined,
      render: () => tabNotizen,
    },
  ]

  return (
    <div className="space-y-4 pb-6">
      <MockDetailBackLink href="/kunden" label="Zurück zu Kunden" />
      <DetailHead
        title={kundeDisplayName(kunde)}
        badges={
          <>
            <TypBadge typ={kunde.typ} />
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
            items={kundeMenuItems}
            sheetTitle="Kunde"
          />
        }
      />

      <DetailShell
        groups={detailShellGroups}
        value={tab}
        onChange={(id) => setTab(id as KundeDetailTab)}
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

      {mailCompose.modal}
    </div>
  )
}
