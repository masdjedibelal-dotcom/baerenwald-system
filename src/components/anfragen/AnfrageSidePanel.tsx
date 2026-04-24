'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { ChevronDown } from 'lucide-react'
import { SidePanel } from '@/components/ui/SidePanel'
import { Card } from '@/components/ui/Card'
import { LeadStatusBadge } from '@/components/ui/Badge'
import { StatusActions } from '@/components/funnel/StatusActions'
import { PropertyRow } from '@/components/ui/PropertyRow'
import { Textarea } from '@/components/ui/Textarea'
import { TerminModal } from '@/components/anfragen/TerminModal'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { AngeboteListeTab, LeadNotizenListeTab, VorOrtTermineTab } from '@/components/anfragen/AnfrageLeadTabsShared'
import { LeadVorOrtAufnahmeSection } from '@/components/anfragen/LeadVorOrtAufnahmeSection'
import { createClient } from '@/lib/supabase'
import {
  updateLeadKontakt,
  updateLeadNotizen,
  updateLeadProjekt,
  updateLeadStatus,
} from '@/app/(dashboard)/anfragen/actions'
import { toast } from '@/components/ui/app-toast'
import type {
  KalenderTermin,
  LeadDetail,
  LeadKanal,
  LeadListAngebot,
  LeadNotizRow,
  LeadStatus,
  LeadWithAngebote,
} from '@/lib/types'
import {
  BEREICH_LABELS,
  KANAL_LABELS,
  SITUATION_LABELS,
  STATUS_LABELS,
  anfragePreisDetailLabel,
  formatAnfragePreisAnzeige,
  formatDatum,
  formatDatumZeit,
} from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  bereicheFuerAnzeige,
  bereicheMitLegacyGewerbeSituation,
  situationFuerAnzeige,
  situationOhneGewerbe,
} from '@/lib/lead-gewerbe-storage'

const BEREICH_KEYS = Object.keys(BEREICH_LABELS) as string[]

function leadName(l: LeadWithAngebote | LeadDetail) {
  const k = l.kunden
  if (k && 'name' in k && k.name) return k.name
  return l.kontakt_name ?? 'Ohne Namen'
}

function leadSubtitle(l: LeadWithAngebote | LeadDetail) {
  const kanal = KANAL_LABELS[l.kanal] ?? l.kanal
  const plz = l.plz?.trim() || '—'
  return `${kanal} · ${plz}`
}

function formatLeadZeitraum(l: LeadWithAngebote | LeadDetail) {
  const von = 'zeitraum_von' in l && l.zeitraum_von ? String(l.zeitraum_von).slice(0, 10) : ''
  const bis = 'zeitraum_bis' in l && l.zeitraum_bis ? String(l.zeitraum_bis).slice(0, 10) : ''
  if (von || bis) {
    const a = von ? new Date(von).toLocaleDateString('de') : ''
    const b = bis ? new Date(bis).toLocaleDateString('de') : ''
    if (a && b && von !== bis) return `${a} – ${b}`
    return a || b || '—'
  }
  return l.zeitraum?.trim() || '—'
}

type TabId = 'details' | 'vorort' | 'notizen' | 'aktiv' | 'angebot'

export function AnfrageSidePanel({
  open,
  onClose,
  leadId,
  summary,
}: {
  open: boolean
  onClose: () => void
  leadId: string | null
  /** Zeilen-Daten aus der Liste für schnellen Titel, bis Detail geladen ist */
  summary?: LeadWithAngebote | null
}) {
  const router = useRouter()
  const [detail, setDetail] = useState<LeadDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<TabId>('details')
  const [terminOpen, setTerminOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [accKontakt, setAccKontakt] = useState(true)
  const [accProjekt, setAccProjekt] = useState(true)
  const [notizen, setNotizen] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [kontaktModal, setKontaktModal] = useState(false)
  const [projektModal, setProjektModal] = useState(false)
  const [kontaktForm, setKontaktForm] = useState({
    name: '',
    telefon: '',
    email: '',
    plz: '',
    kundentyp: 'privat',
    kanal: 'telefon' as LeadKanal,
  })
  const [projektForm, setProjektForm] = useState({
    situation: '',
    bereiche: {} as Record<string, boolean>,
    sonstigesText: '',
    budget: '',
    zeitraumTyp: null as 'tag' | 'zeitraum' | null,
    zeitraumVon: '',
    zeitraumBis: '',
  })

  useEffect(() => {
    if (!open || !leadId) {
      setDetail(null)
      return
    }
    setLoading(true)
    const supabase = createClient()
    ;(async () => {
      const { data, error } = await supabase
        .from('leads')
        .select(
          `
          *,
          kunden(*),
          leads_status_history(*, user_profiles(name)),
          vorab_formulare(
            id, daten, created_at, updated_at,
            formular_templates(name, phase, typ, felder)
          ),
          angebote(id, status, gesamt_fix, gesamt_min, gesamt_max, positionen, created_at),
          kalender_termine(*),
          lead_notizen(*)
        `
        )
        .eq('id', leadId)
        .maybeSingle()

      setLoading(false)
      if (error || !data) {
        if (error) console.warn('AnfrageSidePanel fetch', error.message)
        setDetail(null)
        return
      }
      let d = data as LeadDetail
      const { data: tlRows } = await supabase
        .from('lead_timeline')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
      if (tlRows?.length) {
        d = { ...d, lead_timeline: tlRows as LeadDetail['lead_timeline'] }
      }
      setDetail(d)
      setNotizen(d.notizen ?? '')
    })()
  }, [open, leadId, reloadKey])

  const display = detail ?? summary
  const title = display ? leadName(display) : ''
  const subtitle = display ? leadSubtitle(display) : undefined

  const leadStatusData = useMemo(() => {
    const l = detail ?? summary
    if (!l) return {}
    const fd = l.funnel_daten
    const rec = typeof fd === 'object' && fd !== null ? (fd as Record<string, unknown>) : {}
    const angebotId = typeof rec.angebot_id === 'string' ? rec.angebot_id : undefined
    const auftragId = typeof rec.auftrag_id === 'string' ? rec.auftrag_id : undefined
    const angeboteArr = (l as LeadWithAngebote).angebote
    const firstAngebot =
      Array.isArray(angeboteArr) && angeboteArr[0]?.id ? angeboteArr[0].id : angebotId
    return {
      angebot_href: firstAngebot ? `/angebote/${firstAngebot}` : undefined,
      angebot_id: firstAngebot,
      auftrag_href: auftragId ? `/auftraege/${auftragId}` : undefined,
      auftrag_id: auftragId,
      abgeschlossen_datum:
        l.status === 'abgeschlossen' ? formatDatum(l.updated_at) : undefined,
    }
  }, [detail, summary])

  const setStatus = useCallback(
    (neu: LeadStatus) => {
      if (!leadId) return
      startTransition(async () => {
        const res = await updateLeadStatus(leadId, neu)
        if (!res.ok) {
          toast.error(res.message)
          return
        }
        toast.success('Status aktualisiert')
        setDetail((d) => (d ? { ...d, status: neu } : d))
        router.refresh()
      })
    },
    [leadId, router]
  )

  const onStatusAction = useCallback(
    (action: string, payload?: unknown) => {
      const p = (payload ?? {}) as Record<string, unknown>
      if (action === 'navigate' && typeof p.href === 'string') {
        router.push(p.href)
        return
      }
      if (action === 'lead.vor_ort_termin') {
        setTerminOpen(true)
        return
      }
      if (action === 'lead.kontakt') {
        if (!leadId) return
        startTransition(async () => {
          const res = await updateLeadStatus(leadId, 'kontaktiert')
          if (!res.ok) {
            toast.error(res.message)
            return
          }
          setDetail((d) => (d ? { ...d, status: 'kontaktiert' } : d))
          setTerminOpen(true)
          router.refresh()
        })
        return
      }
      if (action === 'lead.termin_anlegen') {
        setTerminOpen(true)
        return
      }
      if (action === 'lead.nicht_qualifiziert' || action === 'lead.kein_interesse') {
        if (!window.confirm('Lead als abgebrochen markieren?')) return
        setStatus('abgebrochen')
      }
    },
    [leadId, router, setStatus]
  )

  const [notizSaving, setNotizSaving] = useState(false)

  async function saveNotizen() {
    if (!leadId) return
    setNotizSaving(true)
    try {
      const res = await updateLeadNotizen(leadId, notizen)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success('Notiz gespeichert')
      setReloadKey((k) => k + 1)
      router.refresh()
    } finally {
      setNotizSaving(false)
    }
  }

  const historySorted = useMemo(() => {
    const h = detail?.leads_status_history ?? []
    return [...h].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [detail?.leads_status_history])

  const timelineSorted = useMemo(() => {
    const t = detail?.lead_timeline ?? []
    return [...t].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [detail?.lead_timeline])

  const notizenRows = useMemo(() => {
    const raw = detail?.lead_notizen
    if (!Array.isArray(raw)) return [] as LeadNotizRow[]
    return [...raw].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [detail?.lead_notizen])

  const angeboteRows = useMemo(() => {
    const raw = detail?.angebote
    if (!Array.isArray(raw)) return []
    return [...raw] as LeadListAngebot[]
  }, [detail?.angebote])

  function openKontaktModal() {
    if (!detail) return
    setKontaktForm({
      name: detail.kontakt_name ?? leadName(detail),
      telefon: detail.kontakt_telefon ?? '',
      email: detail.kontakt_email ?? '',
      plz: detail.plz ?? '',
      kundentyp: detail.kundentyp ?? 'privat',
      kanal: detail.kanal,
    })
    setKontaktModal(true)
  }

  function openProjektModal() {
    if (!detail) return
    const von = detail.zeitraum_von?.slice(0, 10) ?? ''
    const bis = detail.zeitraum_bis?.slice(0, 10) ?? ''
    let zt: 'tag' | 'zeitraum' | null = null
    if (von && !bis) zt = 'tag'
    else if (von && bis) zt = 'zeitraum'
    const bereicheMerged = bereicheFuerAnzeige(detail.bereiche, detail.situation)
    setProjektForm({
      situation: situationFuerAnzeige(detail.situation) ?? '',
      bereiche: Object.fromEntries(BEREICH_KEYS.map((k) => [k, bereicheMerged.includes(k)])),
      sonstigesText: detail.bereiche_sonstiges ?? '',
      budget: detail.budget_ca != null && detail.budget_ca > 0 ? String(detail.budget_ca) : '',
      zeitraumTyp: zt,
      zeitraumVon: von,
      zeitraumBis: bis,
    })
    setProjektModal(true)
  }

  function handleStatusDropdown(e: React.ChangeEvent<HTMLSelectElement>) {
    setStatus(e.target.value as LeadStatus)
  }

  async function saveKontaktModal() {
    if (!leadId) return
    startTransition(async () => {
      const r = await updateLeadKontakt(leadId, {
        kontakt_name: kontaktForm.name,
        kontakt_telefon: kontaktForm.telefon,
        kontakt_email: kontaktForm.email,
        plz: kontaktForm.plz,
        kundentyp: kontaktForm.kundentyp,
        kanal: kontaktForm.kanal,
      })
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Gespeichert')
        setKontaktModal(false)
        setReloadKey((k) => k + 1)
        router.refresh()
      }
    })
  }

  async function saveProjektModal() {
    if (!leadId) return
    const bereicheList = bereicheMitLegacyGewerbeSituation(
      BEREICH_KEYS.filter((k) => projektForm.bereiche[k]),
      projektForm.situation || null
    )
    const budgetN = projektForm.budget.trim() === '' || Number.isNaN(Number(projektForm.budget)) ? null : Number(projektForm.budget)
    let zVon: string | null = null
    let zBis: string | null = null
    if (projektForm.zeitraumTyp === 'tag' && projektForm.zeitraumVon) {
      zVon = projektForm.zeitraumVon
      zBis = null
    } else if (projektForm.zeitraumTyp === 'zeitraum') {
      zVon = projektForm.zeitraumVon.trim() || null
      zBis = projektForm.zeitraumBis.trim() || null
    }
    startTransition(async () => {
      const r = await updateLeadProjekt(leadId, {
        situation: situationOhneGewerbe(projektForm.situation || null),
        bereiche: bereicheList.length ? bereicheList : null,
        bereiche_sonstiges: projektForm.bereiche.sonstiges ? projektForm.sonstigesText.trim() || null : null,
        budget_ca: budgetN,
        zeitraum_von: zVon,
        zeitraum_bis: zBis,
      })
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Gespeichert')
        setProjektModal(false)
        setReloadKey((k) => k + 1)
        router.refresh()
      }
    })
  }

  if (!open || !leadId) return null
  if (!display && !loading) return null

  return (
    <>
      <SidePanel
        open={open}
        onClose={onClose}
        title={title || (loading ? '…' : '')}
        subtitle={subtitle}
        badge={
          display ? (
            <div className="flex flex-wrap items-center gap-2">
              <LeadStatusBadge status={display.status} />
              <select
                value={display.status}
                onChange={handleStatusDropdown}
                disabled={pending}
                className="cursor-pointer rounded-md border border-bw-border bg-bw-card px-2 py-1 text-xs text-bw-text hover:border-bw-primary"
                aria-label="Status ändern"
              >
                {(['neu', 'kontaktiert', 'angebot', 'auftrag', 'abgeschlossen', 'abgebrochen'] as const).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          ) : null
        }
        width="md"
        actions={
          display ? (
            <div className="w-full min-w-0">
              <StatusActions
                typ="lead"
                status={display.status}
                id={display.id}
                data={leadStatusData}
                onAction={onStatusAction}
                disabled={pending}
                layout="inline"
              />
            </div>
          ) : null
        }
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="tabs border-b border-bw-border px-2">
            {(
              [
                ['details', 'Details'],
                ['vorort', 'Vor-Ort'],
                ['notizen', 'Notizen'],
                ['aktiv', 'Aktivitäten'],
                ['angebot', 'Angebot'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={cn('tab', tab === id && 'active')}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {tab === 'details' ? (
              <div className="space-y-2">
                <div className="accordion">
                  <button
                    type="button"
                    className="accordion-header w-full"
                    onClick={() => setAccKontakt((v) => !v)}
                  >
                    <span className="accordion-title">Kontakt</span>
                    <ChevronDown className={cn('accordion-icon h-4 w-4', accKontakt && 'open')} />
                  </button>
                  {accKontakt ? (
                    <div className="accordion-body space-y-1">
                      <PropertyRow label="Name" value={leadName(display!)} editable={false} />
                      <PropertyRow label="Telefon" value={display!.kontakt_telefon ?? '—'} editable={false} />
                      <PropertyRow label="E-Mail" value={display!.kontakt_email ?? '—'} editable={false} />
                      <PropertyRow label="PLZ" value={display!.plz ?? '—'} editable={false} />
                      <PropertyRow
                        label="Kundentyp"
                        value={display!.kundentyp ?? '—'}
                        editable={false}
                      />
                      <PropertyRow label="Kanal" value={KANAL_LABELS[display!.kanal]} editable={false} />
                      <div className="mb-2 flex justify-end">
                        <button type="button" onClick={openKontaktModal} className="btn btn-ghost btn-sm">
                          ✏️ Bearbeiten
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="accordion">
                  <button
                    type="button"
                    className="accordion-header w-full"
                    onClick={() => setAccProjekt((v) => !v)}
                  >
                    <span className="accordion-title">Projekt</span>
                    <ChevronDown className={cn('accordion-icon h-4 w-4', accProjekt && 'open')} />
                  </button>
                  {accProjekt ? (
                    <div className="accordion-body space-y-1">
                      <PropertyRow
                        label="Situation"
                        value={
                          (() => {
                            const s = situationFuerAnzeige(display!.situation)
                            return s ? (SITUATION_LABELS[s] ?? s) : '—'
                          })()
                        }
                        editable={false}
                      />
                      <div className="property-row">
                        <span className="property-label">Bereiche</span>
                        <span className="property-value flex flex-wrap gap-1">
                          {(() => {
                            const list = bereicheFuerAnzeige(display!.bereiche, display!.situation)
                            return list.length
                              ? list.map((b) => (
                                  <span key={b} className="badge rounded bg-bw-bg px-2 py-0.5 text-xs">
                                    {BEREICH_LABELS[b] ?? b}
                                  </span>
                                ))
                              : '—'
                          })()}
                        </span>
                      </div>
                      <PropertyRow
                        label={anfragePreisDetailLabel(display!.kanal)}
                        value={formatAnfragePreisAnzeige(
                          display!.kanal,
                          'budget_ca' in display! ? (display as LeadDetail).budget_ca : undefined,
                          display!.preis_min,
                          display!.preis_max,
                          display!.funnel_daten
                        )}
                        editable={false}
                      />
                      <PropertyRow label="Zeitraum" value={formatLeadZeitraum(display!)} editable={false} />
                      <div className="mb-2 flex justify-end">
                        <button type="button" onClick={openProjektModal} className="btn btn-ghost btn-sm">
                          ✏️ Bearbeiten
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

              </div>
            ) : null}

            {tab === 'vorort' && display && detail ? (
              <div className="space-y-8">
                <LeadVorOrtAufnahmeSection leadId={display.id} vorabFormulare={detail.vorab_formulare} />
                <VorOrtTermineTab
                  leadId={display.id}
                  termine={(detail.kalender_termine ?? []) as KalenderTermin[]}
                  vorOrtNotiz={detail.vor_ort_notizen ?? ''}
                  onReload={() => setReloadKey((k) => k + 1)}
                />
              </div>
            ) : null}

            {tab === 'notizen' && display && detail ? (
              <div className="space-y-6">
                <Card className="p-4">
                  <h2 className="mb-2 text-sm font-semibold text-ink">Interne Notiz</h2>
                  <Textarea
                    value={notizen}
                    onChange={(e) => setNotizen(e.target.value)}
                    placeholder="Kurze interne Aktennotiz…"
                    rows={4}
                  />
                  <p className="mt-1 text-xs text-bw-text-muted">Bitte mit dem Button unten speichern.</p>
                  <div className="mt-3 flex justify-end">
                    <Button type="button" variant="primary" size="sm" loading={notizSaving} onClick={() => void saveNotizen()}>
                      Speichern
                    </Button>
                  </div>
                </Card>
                <LeadNotizenListeTab
                  leadId={display.id}
                  notizen={notizenRows}
                  onReload={() => setReloadKey((k) => k + 1)}
                />
              </div>
            ) : null}

            {tab === 'aktiv' ? (
              <ul className="space-y-3 text-sm">
                {timelineSorted.map((ev) => (
                  <li key={ev.id} className="border-b border-bw-border pb-2">
                    <p className="text-xs text-bw-text-muted">{formatDatumZeit(ev.created_at)}</p>
                    <p className="font-medium text-bw-text">{ev.titel}</p>
                    {ev.beschreibung ? (
                      <p className="text-bw-text-muted">{ev.beschreibung}</p>
                    ) : null}
                  </li>
                ))}
                {historySorted.map((h) => (
                  <li key={h.id} className="border-b border-bw-border pb-2">
                    <p className="text-xs text-bw-text-muted">{formatDatumZeit(h.created_at)}</p>
                    <p>
                      Status: {h.status_alt ? STATUS_LABELS[h.status_alt] : '—'} →{' '}
                      {STATUS_LABELS[h.status_neu]}
                    </p>
                    {h.user_profiles?.name ? (
                      <p className="text-bw-text-muted">von {h.user_profiles.name}</p>
                    ) : null}
                  </li>
                ))}
                {!timelineSorted.length && !historySorted.length ? (
                  <p className="text-bw-text-muted">Noch keine Aktivitäten.</p>
                ) : null}
              </ul>
            ) : null}

            {tab === 'angebot' && display && detail ? (
              <AngeboteListeTab leadId={display.id} angebote={angeboteRows} />
            ) : null}
          </div>

          <div className="border-t border-bw-border p-4">
            <Link href={`/anfragen/${display?.id}`} className="text-sm font-medium text-bw-link hover:underline">
              Zur Anfrage →
            </Link>
          </div>
        </div>
      </SidePanel>

      {display ? (
        <TerminModal
          open={terminOpen}
          onClose={() => setTerminOpen(false)}
          leadId={display.id}
          kontaktEmail={display.kontakt_email}
          kontaktName={leadName(display)}
          defaultPlz={display.plz}
          leadStatus={display.status}
          typFixed="besichtigung"
          onSaved={() => {
            setReloadKey((k) => k + 1)
            router.refresh()
          }}
        />
      ) : null}

      <Modal open={kontaktModal} onClose={() => setKontaktModal(false)} title="Kontaktdaten bearbeiten">
        <div className="space-y-4">
          <div className="form-grid-2 grid gap-3 md:grid-cols-2">
            <Input label="Name *" value={kontaktForm.name} onChange={(e) => setKontaktForm((f) => ({ ...f, name: e.target.value }))} required />
            <Input label="Telefon" type="tel" value={kontaktForm.telefon} onChange={(e) => setKontaktForm((f) => ({ ...f, telefon: e.target.value }))} />
            <Input label="E-Mail" type="email" value={kontaktForm.email} onChange={(e) => setKontaktForm((f) => ({ ...f, email: e.target.value }))} />
            <Input label="PLZ" value={kontaktForm.plz} onChange={(e) => setKontaktForm((f) => ({ ...f, plz: e.target.value }))} />
            <Select
              label="Kundentyp"
              name="kt"
              value={kontaktForm.kundentyp}
              onChange={(e) => setKontaktForm((f) => ({ ...f, kundentyp: e.target.value }))}
              options={[
                { value: 'privat', label: 'Privat' },
                { value: 'gewerbe', label: 'Gewerbe' },
                { value: 'hausverwaltung', label: 'Hausverwaltung' },
              ]}
            />
            <Select
              label="Kanal"
              name="kan"
              value={kontaktForm.kanal}
              onChange={(e) => setKontaktForm((f) => ({ ...f, kanal: e.target.value as LeadKanal }))}
              options={[
                { value: 'website', label: 'Website' },
                { value: 'telefon', label: 'Telefon' },
                { value: 'whatsapp', label: 'WhatsApp' },
                { value: 'email', label: 'E-Mail' },
                { value: 'vor_ort', label: 'Vor Ort' },
                { value: 'sonstiges', label: 'Sonstiges' },
              ]}
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-bw-border pt-4">
            <Button type="button" variant="secondary" onClick={() => setKontaktModal(false)}>
              Abbrechen
            </Button>
            <Button type="button" variant="primary" loading={pending} onClick={() => void saveKontaktModal()}>
              Speichern
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={projektModal} onClose={() => setProjektModal(false)} title="Projektdaten bearbeiten">
        <div className="space-y-4">
          <Select
            label="Situation"
            name="sit"
            value={projektForm.situation}
            onChange={(e) => setProjektForm((f) => ({ ...f, situation: e.target.value }))}
            options={[
              { value: '', label: 'Bitte wählen…' },
              ...(['zuhause_erneuern', 'reparatur', 'defekt', 'notfall', 'neu_bauen', 'betreuung'] as const).map((value) => ({
                value,
                label: SITUATION_LABELS[value] ?? value,
              })),
            ]}
          />
          <div>
            <span className="input-label">Bereiche / Gewerke</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {BEREICH_KEYS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setProjektForm((f) => ({ ...f, bereiche: { ...f.bereiche, [b]: !f.bereiche[b] } }))}
                  className={cn('chip', projektForm.bereiche[b] ? 'selected' : '')}
                >
                  {BEREICH_LABELS[b] ?? b}
                </button>
              ))}
            </div>
            {projektForm.bereiche.sonstiges ? (
              <input
                className="input mt-2"
                placeholder="Beschreiben…"
                value={projektForm.sonstigesText}
                onChange={(e) => setProjektForm((f) => ({ ...f, sonstigesText: e.target.value }))}
              />
            ) : null}
          </div>
          <div>
            <label className="input-label">Budget (optional)</label>
            <div className="relative">
              <input
                type="number"
                className="input pr-8"
                value={projektForm.budget}
                onChange={(e) => setProjektForm((f) => ({ ...f, budget: e.target.value }))}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-bw-text-muted">€</span>
            </div>
          </div>
          <div>
            <label className="input-label">Gewünschter Zeitraum (optional)</label>
            <div className="mb-2 flex gap-2">
              <button
                type="button"
                className={cn('btn btn-sm', projektForm.zeitraumTyp === 'tag' ? 'btn-primary' : 'btn-secondary')}
                onClick={() =>
                  setProjektForm((f) => ({ ...f, zeitraumTyp: f.zeitraumTyp === 'tag' ? null : 'tag' }))
                }
              >
                Einzeltag
              </button>
              <button
                type="button"
                className={cn('btn btn-sm', projektForm.zeitraumTyp === 'zeitraum' ? 'btn-primary' : 'btn-secondary')}
                onClick={() =>
                  setProjektForm((f) => ({ ...f, zeitraumTyp: f.zeitraumTyp === 'zeitraum' ? null : 'zeitraum' }))
                }
              >
                Zeitraum
              </button>
            </div>
            {projektForm.zeitraumTyp === 'tag' ? (
              <input
                type="date"
                className="input"
                value={projektForm.zeitraumVon}
                onChange={(e) => setProjektForm((f) => ({ ...f, zeitraumVon: e.target.value }))}
              />
            ) : null}
            {projektForm.zeitraumTyp === 'zeitraum' ? (
              <div className="form-grid-2 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="input-label">Von</label>
                  <input
                    type="date"
                    className="input"
                    value={projektForm.zeitraumVon}
                    onChange={(e) => setProjektForm((f) => ({ ...f, zeitraumVon: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="input-label">Bis</label>
                  <input
                    type="date"
                    className="input"
                    value={projektForm.zeitraumBis}
                    onChange={(e) => setProjektForm((f) => ({ ...f, zeitraumBis: e.target.value }))}
                    min={projektForm.zeitraumVon || undefined}
                  />
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex justify-end gap-2 border-t border-bw-border pt-4">
            <Button type="button" variant="secondary" onClick={() => setProjektModal(false)}>
              Abbrechen
            </Button>
            <Button type="button" variant="primary" loading={pending} onClick={() => void saveProjektModal()}>
              Speichern
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
