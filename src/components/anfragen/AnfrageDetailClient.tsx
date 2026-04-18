'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react'
import { ArrowLeft, CalendarPlus, ClipboardList, FileText, X } from 'lucide-react'
import { FormularFelderRenderer } from '@/components/formulare/FormularFelderRenderer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { KanalBadge, LeadStatusBadge } from '@/components/ui/Badge'
import { toast } from 'sonner'
import {
  insertKalenderTermin,
  updateLeadNotizen,
  updateLeadStatus,
} from '@/app/(dashboard)/anfragen/actions'
import { StatusActions } from '@/components/funnel/StatusActions'
import type { FormularFeld, KalenderTermin, LeadDetail, LeadStatus, VorabFormular } from '@/lib/types'
import {
  BEREICH_LABELS,
  FORMULAR_PHASE_LABELS,
  SITUATION_LABELS,
  STATUS_LABELS,
  formatDatum,
  formatDatumZeit,
  formatPreis,
} from '@/lib/utils'
import { isVorOrtStruktur, type VorOrtFormDaten } from '@/lib/vorab-angebot-from-vorab'
import {
  FACHDETAILS_CONFIG,
  bereichMeta,
  fachdetailKeysForBereich,
  situationLabel,
} from '@/lib/vorab-formular-config'

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

function parseFelder(raw: unknown): FormularFeld[] {
  if (!Array.isArray(raw)) return []
  return raw as FormularFeld[]
}

function vorOrtBesuchDatum(v: VorabFormular, daten: VorOrtFormDaten): string {
  const raw = daten.abgeschlossen_am ?? v.updated_at ?? v.created_at
  return formatDatum(raw)
}

function fachdetailLabel(blockKey: string, value: string): string {
  const cfg = FACHDETAILS_CONFIG[blockKey]
  const o = cfg?.optionen.find((x) => x.value === value)
  return o?.label ?? value
}

function logistikHighlights(d: VorOrtFormDaten): string[] {
  const L = d.logistik
  const parts: string[] = []
  if (L.etage !== '' && L.etage != null) {
    parts.push(`${Number(L.etage)}. OG`)
    if (!L.aufzug && Number(L.etage) > 0) parts.push('kein Aufzug')
  }
  if (L.halteverbot) parts.push('Halteverbot nötig')
  if (L.schluesseluebergabe) parts.push('Schlüssel-Übergabe')
  return parts
}

function komplexitaetLabel(k: string): string {
  if (k === 'erhoeht') return 'Erhöht'
  if (k === 'komplex') return 'Komplex'
  return 'Standard'
}

export function AnfrageDetailClient({ lead: initial }: { lead: LeadDetail }) {
  const router = useRouter()
  const [lead, setLead] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [statusErr, setStatusErr] = useState<string | null>(null)
  const [notizen, setNotizen] = useState(initial.notizen ?? '')
  const notizenRef = useRef<HTMLTextAreaElement>(null)
  const notizenSaved = useRef(initial.notizen ?? '')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [terminOpen, setTerminOpen] = useState(false)
  const [terminSaving, setTerminSaving] = useState(false)

  const [terminTitel, setTerminTitel] = useState('')
  const [terminDatum, setTerminDatum] = useState('')
  const [terminVon, setTerminVon] = useState('')
  const [terminBis, setTerminBis] = useState('')
  const [terminTyp, setTerminTyp] = useState<KalenderTermin['typ']>('besichtigung')
  const [terminAdresse, setTerminAdresse] = useState('')
  const [terminNotiz, setTerminNotiz] = useState('')

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

  const leadStatusData = useMemo(() => {
    const fd = lead.funnel_daten
    const rec = typeof fd === 'object' && fd !== null ? (fd as Record<string, unknown>) : {}
    const angebotId = typeof rec.angebot_id === 'string' ? rec.angebot_id : undefined
    const auftragId = typeof rec.auftrag_id === 'string' ? rec.auftrag_id : undefined
    return {
      angebot_href: angebotId ? `/angebote/${angebotId}` : undefined,
      angebot_id: angebotId,
      auftrag_href: auftragId ? `/auftraege/${auftragId}` : undefined,
      auftrag_id: auftragId,
      abgeschlossen_datum: lead.status === 'abgeschlossen' ? formatDatum(lead.updated_at) : undefined,
    }
  }, [lead.funnel_daten, lead.status, lead.updated_at])

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

  async function saveTermin(e: React.FormEvent) {
    e.preventDefault()
    setTerminSaving(true)
    const res = await insertKalenderTermin({
      lead_id: lead.id,
      titel: terminTitel.trim(),
      datum: terminDatum,
      uhrzeit_von: terminVon.trim() || null,
      uhrzeit_bis: terminBis.trim() || null,
      typ: terminTyp,
      adresse: terminAdresse.trim() || null,
      beschreibung: terminNotiz.trim() || null,
    })
    setTerminSaving(false)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    toast.success('Termin gespeichert')
    setTerminOpen(false)
    setTerminTitel('')
    setTerminDatum('')
    setTerminVon('')
    setTerminBis('')
    setTerminAdresse('')
    setTerminNotiz('')
    router.refresh()
  }

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
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => notizenRef.current?.focus()}
            >
              Bearbeiten
            </Button>
          </div>
        </div>
      </header>

      {statusErr ? (
        <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {statusErr}
        </p>
      ) : null}

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
        </dl>
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-semibold text-ink">Anfrage-Details</h2>
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-muted">Situation</dt>
            <dd className="text-ink">
              {lead.situation
                ? (SITUATION_LABELS[lead.situation] ?? lead.situation)
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Bereiche</dt>
            <dd className="flex flex-wrap gap-1 pt-1">
              {lead.bereiche?.length
                ? lead.bereiche.map((b) => (
                    <span
                      key={b}
                      className="rounded-md bg-canvas px-2 py-1 text-xs text-ink"
                    >
                      {BEREICH_LABELS[b] ?? b}
                    </span>
                  ))
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Preisindikation</dt>
            <dd className="text-ink">{formatPreis(lead.preis_min, lead.preis_max)}</dd>
          </div>
          <div>
            <dt className="text-muted">Zeitraum</dt>
            <dd className="text-ink">{lead.zeitraum ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">Kundentyp</dt>
            <dd className="text-ink">{lead.kundentyp ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">Eingegangen</dt>
            <dd className="text-ink">{formatDatumZeit(lead.created_at)}</dd>
          </div>
        </dl>
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
        <h2 className="mb-2 text-base font-semibold text-ink">Notizen</h2>
        <Textarea
          ref={notizenRef}
          id="notizen"
          name="notizen"
          aria-label="Notizen"
          value={notizen}
          onChange={(e) => setNotizen(e.target.value)}
          rows={5}
        />
        <p className="mt-1 text-xs text-muted">Wird automatisch nach 1 Sek. Pause gespeichert.</p>
      </Card>

      <section aria-label="Vor-Ort Aufnahme">
        <h2 className="mb-3 text-base font-semibold text-ink">Vor-Ort Aufnahme</h2>
        {(() => {
          const rows = lead.vorab_formulare ?? []
          const strukturRow = rows.find((v) => isVorOrtStruktur(v.daten))
          if (!strukturRow) {
            return (
              <div className="rounded-lg border border-dashed border-border bg-canvas/80 p-6 text-center">
                <ClipboardList className="mx-auto mb-3 h-10 w-10 text-muted" aria-hidden />
                <p className="text-sm text-muted">Noch keine Vor-Ort-Aufnahme</p>
                <Link
                  href={`/anfragen/${lead.id}/vorab`}
                  className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white"
                >
                  Jetzt aufnehmen
                </Link>
              </div>
            )
          }
          const daten = strukturRow.daten as VorOrtFormDaten
          const sit = daten.projekt.situation
            ? situationLabel(daten.projekt.situation)
            : '—'
          const bereicheTxt = daten.projekt.bereiche
            .map((b) => bereichMeta(b)?.label ?? BEREICH_LABELS[b] ?? b)
            .join(', ')
          const kalkAbw =
            daten.kalkulation.kalk_min !== '' &&
            daten.kalkulation.kalk_max !== '' &&
            !Number.isNaN(Number(daten.kalkulation.kalk_min)) &&
            !Number.isNaN(Number(daten.kalkulation.kalk_max))
          const logistik = logistikHighlights(daten)
          return (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="font-semibold text-emerald-900">✓ Vor-Ort Aufnahme</p>
                <p className="text-xs text-emerald-800">
                  Besuch / Stand: {vorOrtBesuchDatum(strukturRow, daten)}
                </p>
              </div>
              <div className="space-y-3 p-4 text-sm text-ink">
                <div>
                  <span className="text-muted">Situation: </span>
                  {sit}
                </div>
                <div>
                  <span className="text-muted">Bereiche: </span>
                  {bereicheTxt || '—'}
                </div>
                <div>
                  <span className="text-muted">Fachdetails: </span>
                  <ul className="mt-1 list-inside list-disc text-ink">
                    {daten.projekt.bereiche.flatMap((bereich) => {
                      const situation = daten.projekt.situation
                      const blockKeys = fachdetailKeysForBereich(bereich, situation)
                      const items: ReactNode[] = []
                      for (const blockKey of blockKeys) {
                        const storageKey =
                          blockKey === 'elektro_kaputt' ? 'elektrik' : blockKey
                        const val = daten.fachdetails[storageKey]
                        if (!val) continue
                        items.push(
                          <li key={`${bereich}-${blockKey}`}>
                            {bereichMeta(bereich)?.label ?? bereich}:{' '}
                            {fachdetailLabel(blockKey, val)}
                          </li>
                        )
                      }
                      return items
                    })}
                  </ul>
                </div>
                <div>
                  <span className="text-muted">Größen: </span>
                  <ul className="mt-1 list-inside list-disc">
                    {daten.projekt.bereiche.map((b) => {
                      const g = daten.groessen[b]
                      if (g === '' || g == null) return null
                      return (
                        <li key={b}>
                          {bereichMeta(b)?.label ?? b}: {String(g)}
                        </li>
                      )
                    })}
                  </ul>
                </div>
                {kalkAbw ? (
                  <div>
                    <span className="text-muted">Angepasste Kalkulation: </span>
                    {formatPreis(
                      Number(daten.kalkulation.kalk_min),
                      Number(daten.kalkulation.kalk_max)
                    )}
                  </div>
                ) : null}
                {logistik.length > 0 ? (
                  <div>
                    <span className="text-muted">Logistik: </span>
                    {logistik.join(' · ')}
                  </div>
                ) : null}
                <p>
                  <span className="rounded-full bg-canvas px-2 py-1 text-xs font-medium text-ink">
                    Komplexität: {komplexitaetLabel(daten.kalkulation.komplexitaet || 'standard')}
                  </span>
                </p>
                <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                  <Link
                    href={`/anfragen/${lead.id}/vorab`}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-ink"
                  >
                    Bearbeiten
                  </Link>
                  <Link
                    href={`/angebote/neu?lead_id=${lead.id}`}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white"
                  >
                    Angebot erstellen
                  </Link>
                </div>
              </div>
            </Card>
          )
        })()}
        {lead.vorab_formulare?.some((v) => !isVorOrtStruktur(v.daten)) ? (
          <div className="mt-4 space-y-4">
            <h3 className="text-sm font-semibold text-muted">Weitere Vorab-Formulare (Legacy)</h3>
            {lead.vorab_formulare
              ?.filter((v) => !isVorOrtStruktur(v.daten))
              .map((v) => {
                const tpl = v.formular_templates
                const felder = tpl?.felder ? parseFelder(tpl.felder as unknown) : []
                const daten = (v.daten ?? {}) as Record<string, unknown>
                return (
                  <Card key={v.id} className="p-4">
                    <p className="text-sm font-medium text-ink">{tpl?.name ?? 'Formular'}</p>
                    <p className="text-xs text-muted">
                      {tpl?.phase ? (FORMULAR_PHASE_LABELS[tpl.phase] ?? tpl.phase) : null}
                      {v.created_at ? ` · ${formatDatumZeit(v.created_at)}` : null}
                    </p>
                    {felder.length > 0 ? (
                      <div className="mt-4">
                        <FormularFelderRenderer felder={felder} daten={daten} readonly />
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted">Keine Felddefinition.</p>
                    )}
                  </Card>
                )
              })}
          </div>
        ) : null}
      </section>

      <Card>
        <h2 className="mb-3 text-base font-semibold text-ink">Aktionen</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href={`/angebote/neu?lead_id=${lead.id}`}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-white transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto"
          >
            <FileText className="h-5 w-5" aria-hidden />
            Angebot erstellen
          </Link>
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
                {h.notiz ? (
                  <p className="mt-1 text-sm text-muted">{h.notiz}</p>
                ) : null}
                <p className="text-xs text-muted">
                  {h.user_profiles?.name ?? 'System'}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {terminOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="termin-title"
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-lg border border-border bg-surface p-4 shadow-card"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="termin-title" className="text-lg font-semibold text-ink">
                Termin anlegen
              </h2>
              <button
                type="button"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted hover:bg-canvas"
                onClick={() => setTerminOpen(false)}
                aria-label="Schließen"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={saveTermin} className="space-y-4">
              <Input
                label="Titel"
                value={terminTitel}
                onChange={(e) => setTerminTitel(e.target.value)}
                required
              />
              <Input
                type="date"
                label="Datum"
                value={terminDatum}
                onChange={(e) => setTerminDatum(e.target.value)}
                required
              />
              <Input
                type="time"
                label="Uhrzeit von"
                value={terminVon}
                onChange={(e) => setTerminVon(e.target.value)}
              />
              <Input
                type="time"
                label="Uhrzeit bis"
                value={terminBis}
                onChange={(e) => setTerminBis(e.target.value)}
              />
              <Select
                name="termin_typ"
                label="Typ"
                value={terminTyp}
                onChange={(e) => setTerminTyp(e.target.value as KalenderTermin['typ'])}
                options={[
                  { value: 'besichtigung', label: 'Besichtigung' },
                  { value: 'beginn', label: 'Beginn' },
                  { value: 'abnahme', label: 'Abnahme' },
                  { value: 'sonstiges', label: 'Sonstiges' },
                ]}
              />
              <Input
                label="Adresse"
                value={terminAdresse}
                onChange={(e) => setTerminAdresse(e.target.value)}
              />
              <Textarea
                label="Notizen"
                value={terminNotiz}
                onChange={(e) => setTerminNotiz(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="primary" loading={terminSaving} className="flex-1">
                  Speichern
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setTerminOpen(false)}
                >
                  Abbrechen
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <StatusActions typ="lead" status={lead.status} id={lead.id} data={leadStatusData} onAction={onStatusAction} disabled={pending} />
    </div>
  )
}
