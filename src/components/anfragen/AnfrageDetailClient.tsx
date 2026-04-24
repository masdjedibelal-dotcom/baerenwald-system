'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { ArrowLeft, CalendarPlus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { KanalBadge, LeadStatusBadge } from '@/components/ui/Badge'
import { TerminModal } from '@/components/anfragen/TerminModal'
import { VorOrtTermineTab, LeadNotizenListeTab, AngeboteListeTab } from '@/components/anfragen/AnfrageLeadTabsShared'
import { LeadVorOrtAufnahmeSection } from '@/components/anfragen/LeadVorOrtAufnahmeSection'
import { toast } from '@/components/ui/app-toast'
import {
  updateLeadKontakt,
  updateLeadNotizen,
  updateLeadProjekt,
  updateLeadStatus,
} from '@/app/(dashboard)/anfragen/actions'
import { StatusActions } from '@/components/funnel/StatusActions'
import type { KalenderTermin, LeadDetail, LeadKanal, LeadNotizRow, LeadStatus } from '@/lib/types'
import {
  BEREICH_LABELS,
  SITUATION_LABELS,
  STATUS_LABELS,
  anfragePreisDetailLabel,
  formatAnfragePreisAnzeige,
  formatDatum,
  formatDatumZeit,
  cn,
} from '@/lib/utils'
import {
  bereicheFuerAnzeige,
  bereicheMitLegacyGewerbeSituation,
  situationFuerAnzeige,
  situationOhneGewerbe,
} from '@/lib/lead-gewerbe-storage'

const BEREICH_KEYS = Object.keys(BEREICH_LABELS) as string[]

function formatLeadZeitraum(l: LeadDetail) {
  const von = l.zeitraum_von ? String(l.zeitraum_von).slice(0, 10) : ''
  const bis = l.zeitraum_bis ? String(l.zeitraum_bis).slice(0, 10) : ''
  if (von || bis) {
    const a = von ? new Date(von).toLocaleDateString('de') : ''
    const b = bis ? new Date(bis).toLocaleDateString('de') : ''
    if (a && b && von !== bis) return `${a} – ${b}`
    return a || b || '—'
  }
  return l.zeitraum?.trim() || '—'
}

const STATUS_FLOW: LeadStatus[] = [
  'neu',
  'kontaktiert',
  'angebot',
  'auftrag',
  'abgeschlossen',
]

function kundenName(lead: LeadDetail) {
  return lead.kunden?.name ?? lead.kontakt_name ?? 'Ohne Namen'
}

type AngebotKurz = {
  id: string
  status: string
  gesamt_fix?: number | null
  gesamt_min: number | null
  gesamt_max: number | null
  created_at: string
}

export function AnfrageDetailClient({
  lead: initial,
  angeboteListe = [],
}: {
  lead: LeadDetail
  angeboteListe?: AngebotKurz[]
}) {
  const router = useRouter()
  const [lead, setLead] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [statusErr, setStatusErr] = useState<string | null>(null)
  const [notizen, setNotizen] = useState(initial.notizen ?? '')
  const notizenRef = useRef<HTMLTextAreaElement>(null)
  const notizenSaved = useRef(initial.notizen ?? '')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [notizSaving, setNotizSaving] = useState(false)
  const [terminOpen, setTerminOpen] = useState(false)

  type DetailTab = 'details' | 'vorort' | 'notizen' | 'aktiv' | 'angebot'
  const [tab, setTab] = useState<DetailTab>('details')
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
    setLead(initial)
    const n = initial.notizen ?? ''
    setNotizen(n)
    notizenSaved.current = n
  }, [initial])

  const history = [...(lead.leads_status_history ?? [])].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const setStatus = useCallback(
    (neu: LeadStatus) => {
      setStatusErr(null)
      startTransition(async () => {
        const res = await updateLeadStatus(lead.id, neu)
        if (!res.ok) {
          setStatusErr(res.message)
          toast.error(res.message)
          return
        }
        toast.success('Status aktualisiert')
        setLead((l) => ({ ...l, status: neu }))
        router.refresh()
      })
    },
    [lead.id, router]
  )

  useEffect(() => {
    if (notizen === notizenSaved.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void (async () => {
        const res = await updateLeadNotizen(lead.id, notizen)
        if (!res.ok) return
        notizenSaved.current = notizen
        router.refresh()
      })()
    }, 1000)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [notizen, lead.id, router])

  async function saveInterneNotiz() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    setNotizSaving(true)
    try {
      const res = await updateLeadNotizen(lead.id, notizen)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      notizenSaved.current = notizen
      toast.success('Gespeichert')
      setLead((l) => ({ ...l, notizen }))
      router.refresh()
    } finally {
      setNotizSaving(false)
    }
  }

  const leadStatusData = useMemo(() => {
    const fd = lead.funnel_daten
    const rec = typeof fd === 'object' && fd !== null ? (fd as Record<string, unknown>) : {}
    const angebotId = typeof rec.angebot_id === 'string' ? rec.angebot_id : undefined
    const auftragId = typeof rec.auftrag_id === 'string' ? rec.auftrag_id : undefined
    const angeboteArr = lead.angebote
    const firstAngebot =
      Array.isArray(angeboteArr) && angeboteArr[0]?.id ? angeboteArr[0].id : angebotId
    return {
      angebot_href: firstAngebot ? `/angebote/${firstAngebot}` : angebotId ? `/angebote/${angebotId}` : undefined,
      angebot_id: firstAngebot ?? angebotId,
      auftrag_href: auftragId ? `/auftraege/${auftragId}` : undefined,
      auftrag_id: auftragId,
      abgeschlossen_datum: lead.status === 'abgeschlossen' ? formatDatum(lead.updated_at) : undefined,
    }
  }, [lead.funnel_daten, lead.status, lead.updated_at, lead.angebote])

  const timelineSorted = useMemo(() => {
    const t = lead.lead_timeline ?? []
    return [...t].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [lead.lead_timeline])

  const notizenRows = useMemo(() => {
    const raw = lead.lead_notizen
    if (!Array.isArray(raw)) return [] as LeadNotizRow[]
    return [...raw].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [lead.lead_notizen])

  function openKontaktModal() {
    setKontaktForm({
      name: lead.kontakt_name ?? kundenName(lead),
      telefon: lead.kontakt_telefon ?? '',
      email: lead.kontakt_email ?? '',
      plz: lead.plz ?? '',
      kundentyp: lead.kundentyp ?? 'privat',
      kanal: lead.kanal,
    })
    setKontaktModal(true)
  }

  function openProjektModal() {
    const von = lead.zeitraum_von?.slice(0, 10) ?? ''
    const bis = lead.zeitraum_bis?.slice(0, 10) ?? ''
    let zt: 'tag' | 'zeitraum' | null = null
    if (von && !bis) zt = 'tag'
    else if (von && bis) zt = 'zeitraum'
    const bereicheMerged = bereicheFuerAnzeige(lead.bereiche, lead.situation)
    setProjektForm({
      situation: situationFuerAnzeige(lead.situation) ?? '',
      bereiche: Object.fromEntries(BEREICH_KEYS.map((k) => [k, bereicheMerged.includes(k)])),
      sonstigesText: lead.bereiche_sonstiges ?? '',
      budget: lead.budget_ca != null && lead.budget_ca > 0 ? String(lead.budget_ca) : '',
      zeitraumTyp: zt,
      zeitraumVon: von,
      zeitraumBis: bis,
    })
    setProjektModal(true)
  }

  async function saveKontaktModal() {
    startTransition(async () => {
      const r = await updateLeadKontakt(lead.id, {
        kontakt_name: kontaktForm.name,
        kontakt_telefon: kontaktForm.telefon,
        kontakt_email: kontaktForm.email,
        plz: kontaktForm.plz,
        kundentyp: kontaktForm.kundentyp,
        kanal: kontaktForm.kanal,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Gespeichert')
      setKontaktModal(false)
      setLead((l) => ({
        ...l,
        kontakt_name: kontaktForm.name.trim(),
        kontakt_telefon: kontaktForm.telefon.trim() || null,
        kontakt_email: kontaktForm.email.trim() || null,
        plz: kontaktForm.plz.trim() || null,
        kundentyp: kontaktForm.kundentyp,
        kanal: kontaktForm.kanal,
      }))
      router.refresh()
    })
  }

  async function saveProjektModal() {
    const bereicheList = bereicheMitLegacyGewerbeSituation(
      BEREICH_KEYS.filter((k) => projektForm.bereiche[k]),
      projektForm.situation || null
    )
    const budgetN =
      projektForm.budget.trim() === '' || Number.isNaN(Number(projektForm.budget))
        ? null
        : Number(projektForm.budget)
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
      const r = await updateLeadProjekt(lead.id, {
        situation: situationOhneGewerbe(projektForm.situation || null),
        bereiche: bereicheList.length ? bereicheList : null,
        bereiche_sonstiges: projektForm.bereiche.sonstiges ? projektForm.sonstigesText.trim() || null : null,
        budget_ca: budgetN,
        zeitraum_von: zVon,
        zeitraum_bis: zBis,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Gespeichert')
      setProjektModal(false)
      setLead((l) => ({
        ...l,
        situation: situationOhneGewerbe(projektForm.situation || null),
        bereiche: bereicheList.length ? bereicheList : null,
        bereiche_sonstiges: projektForm.bereiche.sonstiges ? projektForm.sonstigesText.trim() || null : null,
        budget_ca: budgetN,
        zeitraum_von: zVon,
        zeitraum_bis: zBis,
      }))
      router.refresh()
    })
  }

  const onStatusAction = useCallback(
    (action: string, payload?: unknown) => {
      const p = (payload ?? {}) as Record<string, unknown>
      if (action === 'navigate' && typeof p.href === 'string') {
        if (p.href.startsWith('/api/')) {
          window.open(p.href, '_blank', 'noopener,noreferrer')
          return
        }
        router.push(p.href)
        return
      }
      if (action === 'lead.kontakt') {
        setStatusErr(null)
        startTransition(async () => {
          const res = await updateLeadStatus(lead.id, 'kontaktiert')
          if (!res.ok) {
            setStatusErr(res.message)
            toast.error(res.message)
            return
          }
          toast.success('Status: kontaktiert')
          setLead((l) => ({ ...l, status: 'kontaktiert' }))
          setTerminOpen(true)
          router.refresh()
        })
        return
      }
      if (action === 'lead.vor_ort_termin') {
        setTerminOpen(true)
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
    [lead.id, router, setStatus]
  )

  return (
    <div className="space-y-6 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-6">
      <header className="sticky top-0 z-20 -mx-4 border-b border-border bg-canvas/95 px-4 py-3 backdrop-blur-sm md:-mx-8 md:px-8">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/anfragen"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border bg-surface text-ink hover:bg-canvas"
              aria-label="Zurück zur Übersicht"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="min-w-0 flex-1 text-xl font-semibold text-ink md:text-2xl">
              {kundenName(lead)}
            </h1>
            <LeadStatusBadge status={lead.status} />
            <select
              value={lead.status}
              onChange={(e) => setStatus(e.target.value as LeadStatus)}
              disabled={pending}
              className="min-h-[40px] rounded-md border border-border bg-surface px-2 text-sm text-ink"
              aria-label="Status ändern"
            >
              {(['neu', 'kontaktiert', 'angebot', 'auftrag', 'abgeschlossen', 'abgebrochen'] as const).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {statusErr ? (
        <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {statusErr}
        </p>
      ) : null}

      <div className="tabs border-b border-border -mx-4 px-2 md:-mx-8 md:px-8">
        {(
          [
            ['details', 'Details'],
            ['vorort', 'Vor-Ort'],
            ['notizen', 'Notizen'],
            ['aktiv', 'Aktivitäten'],
            ['angebot', 'Angebot'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" className={cn('tab', tab === id && 'active')} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'details' ? (
        <>
      <section aria-label="Status ändern">
        <h2 className="mb-2 text-sm font-semibold text-ink">Status ändern</h2>
        <div className="flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STATUS_FLOW.map((s) => (
            <Button
              key={s}
              type="button"
              variant={lead.status === s ? 'primary' : 'secondary'}
              size="sm"
              disabled={pending || lead.status === s}
              onClick={() => setStatus(s)}
              className="shrink-0"
            >
              {STATUS_LABELS[s]}
            </Button>
          ))}
          <Button
            type="button"
            variant={lead.status === 'abgebrochen' ? 'danger' : 'secondary'}
            size="sm"
            disabled={pending || lead.status === 'abgebrochen'}
            onClick={() => setStatus('abgebrochen')}
            className="shrink-0"
          >
            {STATUS_LABELS.abgebrochen}
          </Button>
        </div>
      </section>

      <Card>
        <h2 className="mb-3 text-base font-semibold text-ink">Kontakt</h2>
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-muted">Name</dt>
            <dd className="font-medium text-ink">
              {lead.kontakt_name ?? lead.kunden?.name ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted">E-Mail</dt>
            <dd className="font-medium">
              {lead.kontakt_email ? (
                <a
                  className="min-h-[44px] text-primary underline"
                  href={`mailto:${lead.kontakt_email}`}
                >
                  {lead.kontakt_email}
                </a>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Telefon</dt>
            <dd className="font-medium">
              {lead.kontakt_telefon ? (
                <a
                  className="min-h-[44px] text-primary underline"
                  href={`tel:${lead.kontakt_telefon.replace(/\s/g, '')}`}
                >
                  {lead.kontakt_telefon}
                </a>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted">PLZ</dt>
            <dd className="font-medium text-ink">{lead.plz ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">Kanal</dt>
            <dd className="pt-1">
              <KanalBadge kanal={lead.kanal} />
            </dd>
          </div>
          <div>
            <dt className="text-muted">Kundentyp</dt>
            <dd className="font-medium text-ink">{lead.kundentyp ?? '—'}</dd>
          </div>
        </dl>
        <div className="mt-3 flex justify-end">
          <button type="button" onClick={openKontaktModal} className="btn btn-ghost btn-sm">
            ✏️ Bearbeiten
          </button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-semibold text-ink">Anfrage-Details</h2>
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-muted">Situation</dt>
            <dd className="text-ink">
              {(() => {
                const s = situationFuerAnzeige(lead.situation)
                return s ? (SITUATION_LABELS[s] ?? s) : '—'
              })()}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Bereiche</dt>
            <dd className="flex flex-wrap gap-1 pt-1">
              {(() => {
                const list = bereicheFuerAnzeige(lead.bereiche, lead.situation)
                return list.length
                  ? list.map((b) => (
                      <span
                        key={b}
                        className="rounded-md bg-canvas px-2 py-1 text-xs text-ink"
                      >
                        {BEREICH_LABELS[b] ?? b}
                      </span>
                    ))
                  : '—'
              })()}
            </dd>
          </div>
          {lead.bereiche?.includes('sonstiges') && lead.bereiche_sonstiges?.trim() ? (
            <div>
              <dt className="text-muted">Sonstiges</dt>
              <dd className="whitespace-pre-wrap text-ink">{lead.bereiche_sonstiges}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted">{anfragePreisDetailLabel(lead.kanal)}</dt>
            <dd className="text-ink">
              {formatAnfragePreisAnzeige(
                lead.kanal,
                lead.budget_ca,
                lead.preis_min,
                lead.preis_max,
                lead.funnel_daten
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Zeitraum</dt>
            <dd className="text-ink">{formatLeadZeitraum(lead)}</dd>
          </div>
          <div>
            <dt className="text-muted">Eingegangen</dt>
            <dd className="text-ink">{formatDatumZeit(lead.created_at)}</dd>
          </div>
        </dl>
        <div className="mt-3 flex justify-end">
          <button type="button" onClick={openProjektModal} className="btn btn-ghost btn-sm">
            ✏️ Bearbeiten
          </button>
        </div>
      </Card>

      {lead.kontakt_nachricht ? (
        <Card>
          <h2 className="mb-2 text-base font-semibold text-ink">Nachricht</h2>
          <p className="whitespace-pre-wrap text-sm text-ink">
            {lead.kontakt_nachricht}
          </p>
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-3 text-base font-semibold text-ink">Aktionen</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => setTerminOpen(true)}
            className="w-full sm:w-auto"
          >
            <CalendarPlus className="h-5 w-5" aria-hidden />
            Termin anlegen
          </Button>
          <Link
            href={`/anfragen/${lead.id}/vorab`}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-base font-medium text-ink hover:bg-canvas sm:w-auto"
          >
            Vor-Ort Aufnahme
          </Link>
        </div>
      </Card>

        </>
      ) : tab === 'vorort' ? (
        <div className="space-y-8">
          <LeadVorOrtAufnahmeSection leadId={lead.id} vorabFormulare={lead.vorab_formulare} />
          <VorOrtTermineTab
            leadId={lead.id}
            termine={(lead.kalender_termine ?? []) as KalenderTermin[]}
            vorOrtNotiz={lead.vor_ort_notizen ?? ''}
            onReload={() => router.refresh()}
          />
        </div>
      ) : tab === 'notizen' ? (
        <div className="space-y-8">
          <Card>
            <h2 className="mb-2 text-base font-semibold text-ink">Interne Notiz</h2>
            <Textarea
              ref={notizenRef}
              id="notizen"
              name="notizen"
              aria-label="Interne Notiz"
              value={notizen}
              onChange={(e) => setNotizen(e.target.value)}
              rows={5}
            />
            <p className="mt-1 text-xs text-muted">
              Wird automatisch nach 1 Sek. Pause gespeichert — oder explizit mit dem Button unten.
            </p>
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                variant="primary"
                loading={notizSaving}
                onClick={() => void saveInterneNotiz()}
              >
                Speichern
              </Button>
            </div>
          </Card>
          <LeadNotizenListeTab leadId={lead.id} notizen={notizenRows} onReload={() => router.refresh()} />
        </div>
      ) : tab === 'aktiv' ? (
        <div className="space-y-6">
          <section aria-label="Timeline">
            <h2 className="mb-3 text-base font-semibold text-ink">Aktivitäten</h2>
            {timelineSorted.length === 0 ? (
              <p className="text-sm text-muted">Noch keine Timeline-Einträge.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {timelineSorted.map((ev) => (
                  <li key={ev.id} className="border-b border-border pb-2">
                    <p className="text-xs text-muted">{formatDatumZeit(ev.created_at)}</p>
                    <p className="font-medium text-ink">{ev.titel}</p>
                    {ev.beschreibung ? <p className="text-muted">{ev.beschreibung}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-label="Status-Historie">
            <h2 className="mb-3 text-base font-semibold text-ink">Status-Historie</h2>
            {history.length === 0 ? (
              <p className="text-sm text-muted">Noch keine Einträge.</p>
            ) : (
              <ol className="space-y-4 border-l border-border pl-4">
                {history.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                    <p className="text-xs text-muted">{formatDatumZeit(h.created_at)}</p>
                    <p className="text-sm text-ink">
                      {h.status_alt != null
                        ? `${STATUS_LABELS[h.status_alt]} → ${STATUS_LABELS[h.status_neu]}`
                        : STATUS_LABELS[h.status_neu]}
                    </p>
                    {h.notiz ? <p className="mt-1 text-sm text-muted">{h.notiz}</p> : null}
                    <p className="text-xs text-muted">{h.user_profiles?.name ?? 'System'}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      ) : (
        <AngeboteListeTab leadId={lead.id} angebote={angeboteListe} />
      )}

      <TerminModal
        open={terminOpen}
        onClose={() => setTerminOpen(false)}
        leadId={lead.id}
        kontaktEmail={lead.kontakt_email}
        kontaktName={kundenName(lead)}
        defaultPlz={lead.plz}
        leadStatus={lead.status}
        typFixed="besichtigung"
        onSaved={() => router.refresh()}
      />

      <Modal open={kontaktModal} onClose={() => setKontaktModal(false)} title="Kontaktdaten bearbeiten">
        <div className="space-y-4">
          <div className="form-grid-2 grid gap-3 md:grid-cols-2">
            <Input
              label="Name *"
              value={kontaktForm.name}
              onChange={(e) => setKontaktForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              label="Telefon"
              type="tel"
              value={kontaktForm.telefon}
              onChange={(e) => setKontaktForm((f) => ({ ...f, telefon: e.target.value }))}
            />
            <Input
              label="E-Mail"
              type="email"
              value={kontaktForm.email}
              onChange={(e) => setKontaktForm((f) => ({ ...f, email: e.target.value }))}
            />
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
          <div className="flex justify-end gap-2 border-t border-border pt-4">
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
              ...(['zuhause_erneuern', 'reparatur', 'defekt', 'notfall', 'neu_bauen', 'betreuung'] as const).map(
                (value) => ({
                  value,
                  label: SITUATION_LABELS[value] ?? value,
                })
              ),
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
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">€</span>
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
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={() => setProjektModal(false)}>
              Abbrechen
            </Button>
            <Button type="button" variant="primary" loading={pending} onClick={() => void saveProjektModal()}>
              Speichern
            </Button>
          </div>
        </div>
      </Modal>

      <StatusActions typ="lead" status={lead.status} id={lead.id} data={leadStatusData} onAction={onStatusAction} disabled={pending} />
    </div>
  )
}
