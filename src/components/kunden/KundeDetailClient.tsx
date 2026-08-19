'use client'
import { useLocalTransition } from '@/components/ui/action-busy'

import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { DetailShell, type DetailShellGroup } from '@/components/mock-ui/DetailShell'
import { KundeWirtschaftlicheUebersicht } from '@/components/kunden/KundeWirtschaftlicheUebersicht'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CrmInlineLoading } from '@/components/layout/CrmPageLoading'
import { Card } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { CustomFieldRenderer } from '@/components/ui/CustomFieldRenderer'
import { TypBadge } from '@/components/kunden/TypBadge'
import {
  istKundeGewerbeTyp,
  istKundeHausverwaltungTyp,
  kundeDisplayName,
} from '@/lib/kunde-stammdaten'
import { toast } from '@/components/ui/app-toast'
import { KundenObjekteCard } from '@/components/kunden/KundenObjekteCard'
import { KundenAnsprechpartnerCard } from '@/components/kunden/KundenAnsprechpartnerCard'
import { MeldeLinksCard } from '@/components/kunden/MeldeLinksCard'
import { FreigabeSettingsCard } from '@/components/org/FreigabeSettingsCard'
import { saveKundeFreigabeRegeln } from '@/app/actions/kunden-organisation'
import { KundenOrganisationTab } from '@/components/kunden/KundenOrganisationTab'
import { KundenDokumenteTab } from '@/components/kunden/KundenDokumenteTab'
import { KundenNotizenTab } from '@/components/kunden/KundenNotizenTab'
import { KundePickerSheet } from '@/components/kunden/KundePickerSheet'
import { EntityKundenStammdatenCard } from '@/components/crm/EntityKundenStammdatenCard'
import type { Kunde, KundenObjekt } from '@/lib/types'
import { KiAssistFieldLabel } from '@/components/assistent/KiAssistFieldLabel'
import { EntityDetailLayout } from '@/components/layout/EntityDetailLayout'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { DetailActionsBar } from '@/components/layout/DetailActionsBar'
import { createAngebotHref, createRechnungHref } from '@/lib/crm/create-entry'
import { showRouteBusy } from '@/components/ui/action-busy'
import { useDetailQuickActions } from '@/components/vorgang/DetailQuickActions'
import { VorgangAkteTab } from '@/components/vorgang/VorgangAkteTab'
import { buildKundeWirtschaft } from '@/lib/kunden/kunde-wirtschaft'
import { useKundenMailCompose } from '@/components/kommunikation/useKundenMailCompose'
import { mailComposeContextFromKunde } from '@/app/(dashboard)/kommunikation/actions'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { saveKundeCustomFieldValue, setKundeSpam, mergeKunden } from '@/app/actions/kunden'
import { getPortalLoginHint } from '@/app/actions/kunden'
import { getKundenPortalMailDraft, previewKundenPortalMail, sendKundenPortalLinkMail } from '@/app/actions/mails'
import { runDeleteKunde } from '@/lib/list-actions'
import type { ActionsMenuItem } from '@/components/ui/actions-menu'
import {
  buildPortalLoginLink,
  defaultPortalInviteBetreff,
  defaultPortalInviteText,
} from '@/lib/portal-utils'
import type { KundeDetailPayload } from '@/lib/kunden/load-kunde-detail'
import type { CustomFieldDefinition, CustomFieldValueRow } from '@/lib/custom-fields'
import { kundeRechnungsempfaengerAusStammdaten } from '@/lib/kunde-rechnungsempfaenger'
import { parseEmailTokens } from '@/lib/email-recipients'
import { VorgaengeListeClient } from '@/components/vorgaenge/VorgaengeListeClient'
import type { VorgangListeRow } from '@/lib/vorgang/types'
import type { BewohnerPrivatkundeLink } from '@/app/actions/objektakte-actions'
import { MockCard } from '@/components/mock-ui/MockCard'
import Link from 'next/link'
import { EINHEIT_BEWOHNER_ROLLE_LABELS } from '@/lib/objektakte/labels'
import type { EinheitBewohnerRolle } from '@/lib/objektakte/types'

const QUELLE_LABELS: Record<string, string> = {
  website: 'Website',
  empfehlung: 'Empfehlung',
  telefon: 'Telefon',
  social: 'Social Media',
  sonstiges: 'Sonstiges',
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

type KundeDetailTab = 'uebersicht' | 'objekte' | 'organisation' | 'vorgaenge' | 'akte'

export function KundeDetailClient({
  kunde: initialKunde,
  customFieldDefs,
  customValues: initialValues,
  kundenObjekte = [],
  vorgaengeRows = [],
  bewohnerLinks = [],
}: {
  kunde: KundeDetailPayload
  customFieldDefs: CustomFieldDefinition[]
  customValues: CustomFieldValueRow[]
  kundenObjekte?: KundenObjekt[]
  vorgaengeRows?: VorgangListeRow[]
  bewohnerLinks?: BewohnerPrivatkundeLink[]
}) {
  const router = useRouter()
  const { refresh, generation } = useCrmRefresh()
  const mailCompose = useKundenMailCompose()
  const [kunde, setKunde] = useState(initialKunde)
  const [tab, setTab] = useState<KundeDetailTab>('uebersicht')
  const [pending, startTransition] = useLocalTransition()
  const [customValues, setCustomValues] = useState(initialValues)
  const customSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [portalModalOpen, setPortalModalOpen] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalSending, setPortalSending] = useState(false)
  const [portalLink, setPortalLink] = useState('')
  const [portalTo, setPortalTo] = useState('')
  const [portalCc, setPortalCc] = useState('')
  const [portalBetreff, setPortalBetreff] = useState('')
  const [portalText, setPortalText] = useState('')
  const [portalHtml, setPortalHtml] = useState('')
  const [portalAnrede, setPortalAnrede] = useState<'du' | 'sie'>('sie')

  const [spamPending, setSpamPending] = useState(false)
  const [mergePickerOpen, setMergePickerOpen] = useState(false)
  const [mergeOther, setMergeOther] = useState<Pick<Kunde, 'id' | 'name' | 'vorname' | 'nachname'> | null>(
    null
  )
  const istSpam = Boolean(kunde.ist_spam)

  const detailMenuItems = useMemo((): ActionsMenuItem[] => {
    const items: ActionsMenuItem[] = [
      {
        label: istSpam ? 'Spam aufheben' : 'Als Spam markieren',
        onClick: () => toggleSpam(),
      },
      {
        label: 'Mit anderem Kunden zusammenführen',
        onClick: () => setMergePickerOpen(true),
      },
      'sep',
      {
        label: 'Kunde löschen',
        danger: true,
        onClick: () => {
          void (async () => {
            try {
              await runDeleteKunde(kunde.id, router, kundeDisplayName(kunde))
              showRouteBusy('Kundenliste…')
              router.push('/kunden')
            } catch {
              /* Toast kommt aus runDeleteKunde */
            }
          })()
        },
      },
    ]
    return items
  }, [istSpam, kunde, router])

  useEffect(() => {
    void (async () => {
      const hint = await getPortalLoginHint(initialKunde.id)
      if (hint.ok) {
        setPortalLink(hint.loginLink)
      } else {
        setPortalLink(buildPortalLoginLink())
      }
    })()
  }, [initialKunde.id])

  useEffect(() => {
    setKunde(initialKunde)
  }, [initialKunde])

  function toggleSpam() {
    const next = !istSpam
    const label = next
      ? 'Als Spam markieren? Der Kunde kann dann keine Anfragen mehr über den Rechner stellen und sich nicht mehr mit dieser E-Mail anmelden oder registrieren.'
      : 'Spam-Markierung aufheben? Rechner und Portal-Zugang sind danach wieder möglich.'
    if (!confirm(label)) return
    setSpamPending(true)
    void setKundeSpam(kunde.id, next).then((r) => {
      setSpamPending(false)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      setKunde((k) => ({
        ...k,
        ist_spam: next,
        spam_markiert_am: next ? new Date().toISOString() : null,
      }))
      toast.success(next ? 'Als Spam markiert' : 'Spam-Markierung aufgehoben')
      refresh()
    })
  }

  function confirmMergeIntoCurrent(other: Pick<Kunde, 'id' | 'name' | 'vorname' | 'nachname'>) {
    if (other.id === kunde.id) {
      toast.error('Derselbe Kunde kann nicht zusammengeführt werden.')
      return
    }
    setMergeOther(other)
    setMergePickerOpen(false)
  }

  function executeMerge() {
    if (!mergeOther) return
    startTransition(async () => {
      const res = await mergeKunden(kunde.id, mergeOther.id)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success(res.message)
      setMergeOther(null)
      router.push(`/kunden/${kunde.id}`)
      router.refresh()
    })
  }

  const rechnungen = useMemo(() => kunde.rechnungen ?? [], [kunde.rechnungen])

  const dokumenteCount = useMemo(() => {
    let n = (kunde.kunden_dokumente ?? []).filter(
      (d) => d.typ !== 'protokoll' && d.datei_url?.trim()
    ).length
    const seenAngebote = new Set<string>()
    const auftragIds = new Set<string>((kunde.auftraege ?? []).map((a) => a.id))
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
        // Orphan/Merge-Fall: wenn zwar `auftrag_id` gesetzt ist, aber der Auftrag im geladenen Datensatz fehlt,
        // muss das Angebot trotzdem gezählt werden.
        const offerAuftragId = ('auftrag_id' in ang
          ? (ang as { auftrag_id?: string | null }).auftrag_id?.trim()
          : null) as string | null
        if (offerAuftragId && auftragIds.has(offerAuftragId)) continue
        seenAngebote.add(ang.id)
        n += 1
      }
    }
    n += rechnungen.length
    return n
  }, [kunde, rechnungen])

  const zeigtOrganisationTab = istKundeHausverwaltungTyp(kunde.typ)

  const kundenStamm = useMemo(() => kundeRechnungsempfaengerAusStammdaten(kunde), [kunde])

  const zeigtObjekteTab = istKundeGewerbeTyp(kunde.typ)

  const wirtschaftSnap = useMemo(() => buildKundeWirtschaft(kunde, 'all'), [kunde])

  const letzterKontaktLabel = useMemo(() => {
    const mails = kunde.email_logs ?? []
    const latest = mails[0]?.created_at
    if (!latest) return '—'
    const d = new Date(latest)
    if (Number.isNaN(d.getTime())) return '—'
    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
    return `${days[d.getDay()]} · ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
  }, [kunde.email_logs])

  const kundeSeitLabel = useMemo(() => {
    const raw = kunde.created_at
    if (!raw) return null
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return null
    return `Kunde seit ${d.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })}`
  }, [kunde.created_at])

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
    setPortalAnrede('sie')
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

  const fixedOverview = (
    <div className="space-y-4">
      {bewohnerLinks.length > 0 ? (
        <MockCard title="Verknüpft mit Objektakte" icon="building">
          <p
            className="mb-3 text-[length:var(--fs-meta)] leading-relaxed"
            style={{ color: 'var(--text-3)' }}
          >
            Dieser Privatkunde stammt aus einer Einheit einer Hausverwaltung. Portal-Zugang bleibt
            über die HV — eigene Vorgänge nur im CRM.
          </p>
          <ul className="space-y-2" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {bewohnerLinks.map((l) => {
              const rolleLabel =
                l.rolle === 'eigentuemer' || l.rolle === 'mieter'
                  ? EINHEIT_BEWOHNER_ROLLE_LABELS[l.rolle as EinheitBewohnerRolle]
                  : l.rolle || 'Person'
              return (
                <li
                  key={l.bewohnerId}
                  style={{
                    border: '0.5px solid var(--border)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    background: 'var(--bg-soft)',
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 'var(--fs-text)' }}>
                    {rolleLabel}: {l.bewohnerName}
                  </p>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: 'var(--fs-meta)',
                      color: 'var(--text-3)',
                    }}
                  >
                    {l.einheitBezeichnung} ·{' '}
                    <Link
                      href={`/kunden/${l.hvKundeId}/objekte/${l.objektId}`}
                      className="text-bw-link hover:underline"
                    >
                      {l.objektTitel}
                    </Link>
                    {' · '}
                    <Link href={`/kunden/${l.hvKundeId}`} className="text-bw-link hover:underline">
                      {l.hvName}
                    </Link>
                  </p>
                </li>
              )
            })}
          </ul>
        </MockCard>
      ) : null}
      <EntityKundenStammdatenCard
        kundeId={kunde.id}
        kundeTyp={kunde.typ}
        hideKundeLink
        editKunde={kunde}
        initial={{
          name: kundeDisplayName(kunde),
          telefon: kunde.telefon ?? '',
          email: kunde.email ?? '',
          plz: kunde.plz ?? '',
          ort: kunde.ort ?? '',
          strasse:
            [kunde.strasse, kunde.hausnummer].filter(Boolean).join(' ') ||
            kunde.adresse ||
            '',
          vorname: kunde.vorname ?? '',
          nachname: kunde.nachname ?? '',
          ansprechpartner: kunde.ansprechpartner ?? '',
          webseite: kunde.webseite ?? '',
          quelleLabel: kunde.quelle
            ? (QUELLE_LABELS[kunde.quelle] ?? kunde.quelle)
            : '',
        }}
        banner={
          kundenStamm.fehlendeRechnungsfelder.length > 0 ? (
            <p className="mb-3 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-[length:var(--fs-meta)] text-amber-950">
              Für Rechnungen fehlen: {kundenStamm.fehlendeRechnungsfelder.join(', ')}.
            </p>
          ) : null
        }
        onSaved={(saved) => {
          if (saved) {
            setKunde((prev) => ({
              ...prev,
              ...saved,
              name: saved.name?.trim() || prev.name,
              adresse:
                [saved.strasse, saved.hausnummer].filter(Boolean).join(' ') ||
                prev.adresse,
            }))
          }
          refresh()
        }}
      />
      <KundenAnsprechpartnerCard
        kundeId={kunde.id}
        initial={kunde.kunden_ansprechpartner ?? []}
        onChanged={() => refresh()}
      />
      {kunde.org_kennung?.trim() ? (
        <MeldeLinksCard
          orgSlug={kunde.org_kennung.trim().toLowerCase()}
          aushangPdfHref={`/api/kunden/${kunde.id}/aushang-pdf`}
        />
      ) : null}
      {zeigtOrganisationTab ? (
        <FreigabeSettingsCard
          showHmAuto
          value={{
            notfall_direkt: kunde.notfall_direkt ?? true,
            freigabe_schwelle_eur:
              kunde.freigabe_schwelle_eur != null ? Number(kunde.freigabe_schwelle_eur) : null,
            hm_auto_zuweisen: Boolean(kunde.hm_auto_zuweisen),
          }}
          onSave={async (next) =>
            saveKundeFreigabeRegeln(kunde.id, {
              notfall_direkt: Boolean(next.notfall_direkt),
              freigabe_schwelle_eur: next.freigabe_schwelle_eur,
              freigabe_modus: kunde.freigabe_modus ?? 'freigabe',
              hm_auto_zuweisen: Boolean(next.hm_auto_zuweisen),
            })
          }
          onSaved={() => refresh()}
        />
      ) : null}
      {zusatzfelderCard}
      <KundeWirtschaftlicheUebersicht kunde={kunde} />
    </div>
  )

  const tabObjekte = zeigtObjekteTab ? (
    <KundenObjekteCard
      kundeId={kunde.id}
      objekte={kundenObjekte}
      verwaltungName={kundeDisplayName(kunde)}
      onChanged={() => refresh()}
    />
  ) : null

  const tabAkte = (
    <VorgangAkteTab
      dateien={
        <KundenDokumenteTab
          kundeId={kunde.id}
          dokumente={kunde.kunden_dokumente ?? []}
          auftraege={kunde.auftraege ?? []}
          leads={kunde.leads ?? []}
          rechnungen={rechnungen}
          onReload={() => refresh()}
        />
      }
      notizen={
        <KundenNotizenTab
          kundeId={kunde.id}
          notizen={kunde.kunden_notizen ?? []}
          legacyNotiz={kunde.notizen}
          onReload={() => refresh()}
        />
      }
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
    <Suspense fallback={<CrmInlineLoading label="Vorgänge werden geladen …" />}>
      <VorgaengeListeClient
        rows={vorgaengeRows}
        embedded
        restrictKundeId={kunde.id}
        restrictLeadIds={kundeLeadIds}
      />
    </Suspense>
  )

  const tabOrganisation = zeigtOrganisationTab ? (
    <KundenOrganisationTab kunde={kunde} onSaved={() => refresh()} />
  ) : null

  const detailShellGroups: DetailShellGroup[] = [
    {
      id: 'uebersicht',
      label: 'Übersicht',
      icon: 'layout-dashboard',
      render: () => fixedOverview,
    },
    {
      id: 'vorgaenge',
      label: 'Vorgänge',
      icon: 'folders',
      count: kundeVorgaengeCount || undefined,
      render: () => tabVorgaenge,
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
      id: 'akte',
      label: 'Akte',
      icon: 'file-text',
      count:
        dokumenteCount ||
        (kunde.kunden_notizen?.length ?? 0) ||
        (kunde.notizen?.trim() ? 1 : 0) ||
        undefined,
      render: () => tabAkte,
    },
  ]

  const { quickBar, sheets: quickActionSheets } = useDetailQuickActions({
    telefon: kunde.telefon,
    email: kunde.email,
    notiz: { kind: 'kunde', kundeId: kunde.id },
    dokument: { kind: 'kunde', kundeId: kunde.id },
    onSaved: () => refresh(),
  })

  return (
    <EntityDetailLayout
      crumbBackHref="/kunden"
      crumbBackLabel="Zurück zur Liste"
      quickBar={quickBar}
      head={{
        title: kundeDisplayName(kunde),
        titleBadges: (
          <>
            <TypBadge typ={kunde.typ} />
            {istSpam ? (
              <MockBadge kind="storniert">
                <span className="inline-flex items-center gap-1">
                  <MockIcon ctx="default" n="shield-x" size={10} />
                  Spam
                </span>
              </MockBadge>
            ) : null}
          </>
        ),
        badges: kundeSeitLabel ? <span>{kundeSeitLabel}</span> : null,
        actions: (
          <DetailActionsBar
            sheetTitle="Kunde"
            primary={{
              label: 'Angebot erstellen',
              icon: 'file-text',
              onClick: () => {
                showRouteBusy('Angebot wird geöffnet…')
                router.push(createAngebotHref(kunde.id))
              },
            }}
            secondary={{
              label: 'Rechnung erstellen',
              icon: 'receipt',
              onClick: () => {
                showRouteBusy('Rechnung wird geöffnet…')
                router.push(createRechnungHref(kunde.id))
              },
            }}
            menuItems={detailMenuItems}
          />
        ),
      }}
    >
      {zeigtOrganisationTab && tab === 'organisation' ? (
        <div className="space-y-3">
          <button type="button" className="btn ghost sm" onClick={() => setTab('uebersicht')}>
            ← Zurück zur Übersicht
          </button>
          {tabOrganisation}
        </div>
      ) : (
        <DetailShell
          groups={detailShellGroups}
          value={tab}
          onChange={(id) => setTab(id as KundeDetailTab)}
        />
      )}

      <Modal
        open={portalModalOpen}
        onClose={() => setPortalModalOpen(false)}
        title="Kundenportal-Link versenden"
        size="lg"
        footer={
          <div className="kunde-create-footer">
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
          <KiAssistFieldLabel
            label="Betreff"
            value={portalBetreff}
            onApply={setPortalBetreff}
            extraHint="Portal-Einladung Betreff an den Kunden (Sie-Anrede)."
            multiline={false}
          >
            <Input value={portalBetreff} onChange={(e) => setPortalBetreff(e.target.value)} />
          </KiAssistFieldLabel>
          <KiAssistFieldLabel
            label="Text"
            value={portalText}
            onApply={setPortalText}
            extraHint="Portal-Einladungstext an den Kunden."
          >
            <Textarea rows={6} value={portalText} onChange={(e) => setPortalText(e.target.value)} />
          </KiAssistFieldLabel>
          <div>
            <p className="mb-1 text-[length:var(--fs-meta)] font-medium text-bw-text-muted">Mail-Vorschau</p>
            <iframe
              title="Kundenportal Mail Vorschau"
              sandbox="allow-same-origin"
              className="h-[300px] w-full rounded-lg border border-bw-border bg-white"
              srcDoc={portalHtml}
            />
          </div>
          <Input
            label="Portal-Login"
            value={portalLink}
            readOnly
            className="bg-bw-bg-soft"
          />
          <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
            Der Button in der Mail führt immer zu <strong>/portal/login</strong>. Mehrere Adressen in „An“/„CC“
            mit Semikolon trennen.
          </p>
        </div>
      </Modal>

      {mailCompose.modal}

      <KundePickerSheet
        open={mergePickerOpen}
        onClose={() => setMergePickerOpen(false)}
        title="Kunde zum Zusammenführen"
        onPick={(other) => confirmMergeIntoCurrent(other)}
      />

      <Modal
        open={Boolean(mergeOther)}
        onClose={() => setMergeOther(null)}
        title="Kunden zusammenführen"
        size="sm"
        footer={
          <div className="kunde-create-footer">
            <Button type="button" variant="secondary" onClick={() => setMergeOther(null)}>
              Abbrechen
            </Button>
            <Button type="button" loading={pending} onClick={() => executeMerge()}>
              Zusammenführen
            </Button>
          </div>
        }
      >
        {mergeOther ? (
          <p className="text-[length:var(--fs-text)] text-bw-text">
            Kunde <strong>{kundeDisplayName(mergeOther)}</strong> in{' '}
            <strong>{kundeDisplayName(kunde)}</strong> überführen?{' '}
            <strong>{kundeDisplayName(mergeOther)}</strong> wird entfernt.
          </p>
        ) : null}
      </Modal>

      {quickActionSheets}
    </EntityDetailLayout>
  )
}
