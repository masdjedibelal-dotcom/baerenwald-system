'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react'
import { ArrowLeft, Eye, Receipt, Send } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Accordion } from '@/components/ui/Accordion'
import { Input } from '@/components/ui/Input'
import { AuftragPositionenTab } from '@/components/auftraege/AuftragPositionenTab'
import { AuftragFinanzenClient } from '@/components/auftraege/AuftragFinanzenClient'
import type { AuftragFinanzenClientPayload } from '@/app/(dashboard)/auftraege/load-auftrag-finanzen-client-props'
import { AuftragStatusBadge } from '@/components/ui/AuftragStatusBadge'
import {
  completeAuftragAbnahme,
  createFormularEintragUndEmail,
  startAuftragArbeit,
  setAuftragZurAbnahme,
  updateAuftragFortschrittManual,
  updateAuftragNotizen,
  updateAuftragProjektFelder,
  updateAuftragStatusFromUi,
} from '@/app/(dashboard)/auftraege/actions'
import { ensureKundenTokenAction } from '@/app/(dashboard)/auftraege/kunden-status-actions'
import { AuftragDokumentationPanel } from '@/components/auftraege/AuftragDokumentationPanel'
import { projektUrlFromToken } from '@/lib/projekt/kunden-token'
import { MailUebersicht } from '@/components/auftraege/MailUebersicht'
import type { EmailLogRow } from '@/app/(dashboard)/auftraege/actions'
import type {
  AuftragDetail,
  AuftragStatus,
  FormularEintrag,
  FormularFeld,
  FormularTemplate,
  Preisliste,
} from '@/lib/types'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { cn, formatDatum, formatDatumZeit, formatPreis, FORMULAR_PHASE_LABELS } from '@/lib/utils'
import { StatusActions } from '@/components/funnel/StatusActions'
import { toast } from '@/components/ui/app-toast'
import { Modal } from '@/components/ui/Modal'

function formatFeldwert(v: unknown): string {
  if (v == null) return '—'
  if (typeof v === 'boolean') return v ? 'Ja' : 'Nein'
  if (Array.isArray(v)) return v.join(', ')
  return String(v)
}

function PropRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border py-2 text-sm last:border-0">
      <span className="shrink-0 text-muted">{label}</span>
      <div className="min-w-0 text-right font-medium text-ink">{children}</div>
    </div>
  )
}

type GewerkOpt = { id: string; name: string; slug: string }

export function AuftragDetailClient({
  detail: initial,
  templates,
  emailLog = [],
  finanzenPayload = null,
  gewerke = [],
  preislisten = [],
}: {
  detail: AuftragDetail
  templates: FormularTemplate[]
  emailLog?: EmailLogRow[]
  finanzenPayload?: AuftragFinanzenClientPayload | null
  gewerke?: GewerkOpt[]
  preislisten?: Preisliste[]
}) {
  const router = useRouter()
  const [detail, setDetail] = useState(initial)
  const [notizen, setNotizen] = useState(initial.notizen ?? '')
  const [err, setErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [formModal, setFormModal] = useState<{
    gewerkId: string
    handwerkerId: string
    email: string
    templateId: string
    phase: 'vorab' | 'update' | 'abnahme'
  } | null>(null)
  const [viewEintrag, setViewEintrag] = useState<FormularEintrag | null>(null)
  const [rtab, setRtab] = useState<'uebersicht' | 'positionen' | 'dokumentation' | 'finanzen'>('uebersicht')
  const [projektModal, setProjektModal] = useState(false)
  const [projektTitel, setProjektTitel] = useState('')
  const [projektStart, setProjektStart] = useState('')
  const [projektEnde, setProjektEnde] = useState('')
  const [fortSlider, setFortSlider] = useState(initial.fortschritt ?? 0)

  useEffect(() => {
    setDetail(initial)
    setNotizen(initial.notizen ?? '')
    setProjektTitel(initial.titel ?? '')
    setProjektStart(initial.start_datum?.slice(0, 10) ?? '')
    setProjektEnde(initial.end_datum?.slice(0, 10) ?? '')
    setFortSlider(initial.fortschritt ?? 0)
  }, [initial])

  useEffect(() => {
    setFortSlider(detail.fortschritt ?? 0)
  }, [detail.fortschritt])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash === '#dokumentation') setRtab('dokumentation')
  }, [])

  const flushNotizen = useCallback(async () => {
    const r = await updateAuftragNotizen(detail.id, notizen)
    if (!r.ok) setErr(r.message)
  }, [detail.id, notizen])

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void flushNotizen()
    }, 650)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [notizen, flushNotizen])

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    setErr(null)
    startTransition(async () => {
      const r = await fn()
      if (!r.ok) setErr('message' in r ? (r.message ?? 'Fehler') : 'Fehler')
      else router.refresh()
    })
  }

  const kunde = detail.kunden
  const name = kunde?.name ?? 'Auftrag'
  const angebotPos = useMemo(
    () => normalizeAngebotPositionen(detail.angebote?.positionen ?? []),
    [detail.angebote?.positionen]
  )
  const hasPos = (detail.auftrag_positionen?.length ?? 0) > 0 || angebotPos.length > 0

  const projektUrl = useMemo(() => {
    const t = detail.kunden_token?.trim()
    return t ? projektUrlFromToken(t) : ''
  }, [detail.kunden_token])

  const filteredTemplates = formModal
    ? templates.filter(
        (t) => !t.gewerk_id || t.gewerk_id === formModal.gewerkId
      )
    : []

  const openFormModal = (gewerkId: string, handwerkerId: string, email: string) => {
    const first = templates.find((t) => !t.gewerk_id || t.gewerk_id === gewerkId)
    setFormModal({
      gewerkId,
      handwerkerId,
      email: email ?? '',
      templateId: first?.id ?? '',
      phase: 'vorab',
    })
  }

  const statusActionData = useMemo(() => {
    const punches = detail.punch_list ?? []
    const offen = punches.filter((p) => {
      const s = String(p.status ?? '').toLowerCase()
      return s !== 'behoben' && s !== 'akzeptiert'
    })
    const alle_maengel_behoben = punches.length === 0 || offen.length === 0
    return {
      abnahme_protokoll_url: detail.abnahme_protokoll_url ?? undefined,
      alle_maengel_behoben,
    }
  }, [detail.punch_list, detail.abnahme_protokoll_url])

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
      if (action === 'auftrag.start_arbeit') {
        run(() => startAuftragArbeit(detail.id))
        return
      }
      if (action === 'auftrag.zur_abnahme') {
        run(() => setAuftragZurAbnahme(detail.id))
        return
      }
      if (action === 'auftrag.abnahme_abschliessen') {
        run(() => completeAuftragAbnahme(detail.id))
        return
      }
      if (action === 'auftrag.formular_hw') {
        const z = (detail.auftrag_handwerker ?? [])[0]
        if (!z?.handwerker_id || !z.gewerk_id) {
          toast.message('Kein Handwerker', { description: 'Bitte zuerst Gewerke zuordnen.' })
          return
        }
        openFormModal(z.gewerk_id, z.handwerker_id, z.handwerker?.email ?? '')
        return
      }
      if (action === 'auftrag.protokoll') {
        window.open(`/api/auftraege/${detail.id}/protokoll`, '_blank', 'noopener,noreferrer')
        return
      }
      if (action === 'auftrag.nachtrag') {
        setRtab('dokumentation')
        return
      }
      if (action === 'auftrag.mangel') {
        setRtab('dokumentation')
        return
      }
      if (action === 'auftrag.mail_kunde' || action === 'auftrag.abnahme_mail' || action === 'auftrag.termin') {
        toast.message('Kalender & E-Mail', { description: 'Bitte Kalender bzw. bestehende Formular-/Mail-Funktion nutzen.' })
      }
      if (action === 'auftrag.bewertung') {
        toast.message('Bewertung', { description: 'Google-Link in den Einstellungen hinterlegen (NEXT_PUBLIC_GOOGLE_BEWERTUNG_URL).' })
      }
    },
    [detail.id, detail.auftrag_handwerker, router]
  )

  const copyKundenlink = useCallback(() => {
    if (projektUrl) {
      void navigator.clipboard.writeText(projektUrl).then(
        () => toast.success('Link kopiert'),
        () => toast.error('Kopieren nicht möglich')
      )
      return
    }
    void (async () => {
      const r = await ensureKundenTokenAction(detail.id)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      try {
        await navigator.clipboard.writeText(r.url)
        toast.success('Link kopiert')
        router.refresh()
      } catch {
        toast.error('Kopieren nicht möglich')
      }
    })()
  }, [detail.id, projektUrl, router])

  const submitFormular = () => {
    if (!formModal || !formModal.templateId || !formModal.email.trim()) {
      setErr('Template und E-Mail ausfüllen.')
      return
    }
    setErr(null)
    startTransition(async () => {
      const r = await createFormularEintragUndEmail({
        auftragId: detail.id,
        handwerkerId: formModal.handwerkerId,
        gewerkId: formModal.gewerkId,
        templateId: formModal.templateId,
        phase: formModal.phase,
        handwerkerEmail: formModal.email.trim(),
      })
      if (!r.ok) setErr(r.message ?? 'Fehler')
      else {
        setFormModal(null)
        router.refresh()
      }
    })
  }

  return (
    <div className="pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-0">
      <PageHeader
        title={
          <span className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-3">
            <Link
              href="/auftraege"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Zurück
            </Link>
            <span className="min-w-0 truncate text-xl font-semibold md:text-2xl">{name}</span>
          </span>
        }
        action={<AuftragStatusBadge status={detail.status} />}
      />

      {err ? (
        <p className="mb-3 rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {err}
        </p>
      ) : null}

      {detail.status === 'offen' && !(detail.vor_baubeginn_protokolle?.length) ? (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950">
          <p className="font-semibold">⚠️ Vor-Baubeginn Protokoll fehlt noch</p>
          <p className="mt-1 text-xs">
            Dokumentieren Sie den Zustand der Baustelle vor dem ersten Einsatz — schützt vor Haftung für Vorschäden.
          </p>
          <Link
            href={`/auftraege/${detail.id}/vor-baubeginn`}
            className="mt-2 inline-flex min-h-[40px] items-center rounded-lg bg-primary px-3 text-sm font-medium text-white"
          >
            Jetzt aufnehmen
          </Link>
        </div>
      ) : null}

      {(detail.baustopps ?? []).some((b) => !b.ende_datum) ? (
        <div className="mb-4 rounded-lg border border-orange-300 bg-orange-50 px-3 py-3 text-sm text-orange-950">
          <p className="font-semibold">🌧️ Baustopp aktiv</p>
          <p className="mt-1 text-xs">
            {(detail.baustopps ?? []).find((b) => !b.ende_datum)?.grund ?? ''}
          </p>
          <button
            type="button"
            className="mt-2 text-sm font-medium text-primary underline"
            onClick={() => setRtab('dokumentation')}
          >
            In der Dokumentation verwalten
          </button>
        </div>
      ) : null}

      <div className="lg:grid lg:grid-cols-[minmax(0,300px)_1fr] lg:items-start lg:gap-8">
        <aside className="mb-8 space-y-3 lg:mb-0">
          <Accordion title="Fortschritt" defaultOpen>
            <ProgressBar
              value={detail.fortschritt ?? 0}
              label={`Fortschritt: ${detail.fortschritt ?? 0}%`}
            />
            {detail.status === 'storniert' ? (
              <p className="mt-3 text-sm text-muted">Status: storniert</p>
            ) : (
              <select
                value={detail.status}
                onChange={(e) => {
                  const s = e.target.value as AuftragStatus
                  run(() => updateAuftragStatusFromUi(detail.id, s))
                }}
                className="input mt-3 w-full"
              >
                <option value="offen">Offen</option>
                <option value="in_arbeit">In Arbeit</option>
                <option value="abnahme">Abnahme</option>
                <option value="abgeschlossen">Abgeschlossen</option>
              </select>
            )}
            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium text-muted">Fortschritt manuell (0–100%)</label>
              <input
                type="range"
                min={0}
                max={100}
                value={fortSlider}
                disabled={detail.status === 'storniert'}
                onChange={(e) => setFortSlider(Number(e.target.value))}
                onPointerUp={(e) => {
                  const v = Number((e.target as HTMLInputElement).value)
                  run(() => updateAuftragFortschrittManual(detail.id, v))
                }}
                className="w-full"
              />
            </div>
            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
              {detail.status === 'offen' ? (
                <Button
                  variant="primary"
                  loading={pending}
                  onClick={() => run(() => startAuftragArbeit(detail.id))}
                >
                  Arbeiten starten
                </Button>
              ) : null}
              {detail.status === 'in_arbeit' ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    className="border-orange-300 bg-orange-50 text-orange-950 hover:bg-orange-100"
                    onClick={() => setRtab('dokumentation')}
                  >
                    🌧️ Baustopp melden
                  </Button>
                  <Button
                    variant="primary"
                    loading={pending}
                    onClick={() => run(() => setAuftragZurAbnahme(detail.id))}
                  >
                    Zur Abnahme
                  </Button>
                </>
              ) : null}
              {detail.status === 'abnahme' ? (
                <Button
                  variant="primary"
                  loading={pending}
                  onClick={() => run(() => completeAuftragAbnahme(detail.id))}
                >
                  Abnahme abschließen
                </Button>
              ) : null}
            </div>
          </Accordion>

          <Accordion title="Kunde" defaultOpen>
            {kunde ? (
              <div className="space-y-0">
                <PropRow label="Name">
                  {kunde.id ? (
                    <Link href={`/kunden/${kunde.id}`} className="text-primary underline">
                      {kunde.name}
                    </Link>
                  ) : (
                    kunde.name
                  )}
                </PropRow>
                <PropRow label="Telefon">
                  {kunde.telefon ? (
                    <a className="text-primary underline" href={`tel:${kunde.telefon}`}>
                      {kunde.telefon}
                    </a>
                  ) : (
                    '—'
                  )}
                </PropRow>
                <PropRow label="E-Mail">
                  {kunde.email ? (
                    <a className="text-primary underline" href={`mailto:${kunde.email}`}>
                      {kunde.email}
                    </a>
                  ) : (
                    '—'
                  )}
                </PropRow>
                <PropRow label="Adresse">
                  {[kunde.adresse, kunde.plz, kunde.ort].filter(Boolean).join(', ') || '—'}
                </PropRow>
              </div>
            ) : (
              <p className="text-sm text-muted">Kein Kunde verknüpft.</p>
            )}
          </Accordion>

          <Accordion title="Projekt">
            <div className="space-y-0">
              <PropRow label="Titel">{detail.titel?.trim() || '—'}</PropRow>
              <PropRow label="Start">
                {detail.start_datum ? formatDatum(detail.start_datum) : '—'}
              </PropRow>
              <PropRow label="Ende (geplant)">
                {detail.end_datum ? formatDatum(detail.end_datum) : '—'}
              </PropRow>
              <PropRow label="Betreuer">
                {detail.betreuer_id ? <span className="font-mono text-xs">{detail.betreuer_id.slice(0, 8)}…</span> : '—'}
              </PropRow>
            </div>
            <Button type="button" variant="secondary" className="mt-3 w-full" onClick={() => setProjektModal(true)}>
              Bearbeiten
            </Button>
          </Accordion>

          {detail.angebote ? (
            <Accordion title="Angebot">
              <p className="text-sm font-semibold text-ink">
                {formatPreis(
                  detail.angebote.gesamt_fix,
                  detail.angebote.gesamt_min,
                  detail.angebote.gesamt_max
                )}
              </p>
              <p className="mt-2 text-xs text-muted">Status: {detail.angebote.status}</p>
              {detail.angebot_id ? (
                <Link
                  href={`/angebote/${detail.angebot_id}`}
                  className="mt-3 inline-block text-sm font-medium text-primary underline"
                >
                  Zum Angebot →
                </Link>
              ) : null}
            </Accordion>
          ) : null}

          <Accordion title="Kunden-Link">
            <Button type="button" variant="secondary" className="w-full" onClick={copyKundenlink}>
              Link kopieren
            </Button>
            <p className="mt-2 text-xs text-muted">
              Aufrufe: {detail.kunden_seite_aufrufe ?? 0}
              {projektUrl ? (
                <>
                  <br />
                  <span className="break-all">{projektUrl}</span>
                </>
              ) : null}
            </p>
          </Accordion>
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap gap-2 border-b border-border pb-3">
            {(
              [
                ['uebersicht', 'Übersicht'],
                ['positionen', 'Positionen'],
                ['dokumentation', 'Dokumentation'],
                ['finanzen', 'Finanzen'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setRtab(id)}
                className={cn(
                  'min-h-[40px] rounded-lg px-3 text-sm font-medium',
                  rtab === id ? 'bg-primary text-white' : 'border border-border text-ink hover:bg-canvas'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {rtab === 'uebersicht' ? (
            <>
              <MailUebersicht detail={detail} emailLog={emailLog} onChanged={() => router.refresh()} />

      {(detail.vor_baubeginn_protokolle ?? []).length > 0 ? (
        <section className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
          <h2 className="mb-2 text-lg font-semibold text-emerald-950">✓ Vor-Baubeginn Protokoll</h2>
          {(() => {
            const vb = [...(detail.vor_baubeginn_protokolle ?? [])].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0]
            if (!vb) return null
            const n = (vb.foto_urls ?? []).length
            return (
              <div className="text-sm text-ink">
                <p>
                  Datum {formatDatum(vb.datum)} · {n} Foto{n === 1 ? '' : 's'}
                </p>
                {vb.vorhandene_schaeden ? (
                  <p className="mt-2 text-muted">Vorhandene Schäden: {vb.vorhandene_schaeden}</p>
                ) : null}
                {(vb.foto_urls ?? []).length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(vb.foto_urls ?? []).map((url) => (
                      <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block h-16 w-16">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="h-16 w-16 rounded object-cover" />
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })()}
        </section>
      ) : null}

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold text-ink">Meilensteine</h2>
        {(detail.auftrag_milestones ?? []).length === 0 ? (
          <p className="text-sm text-muted">Keine Meilensteine.</p>
        ) : (
          <div className="space-y-2">
            {(detail.auftrag_milestones ?? []).map((m) => (
              <Card key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <span className="font-medium text-ink">{m.titel}</span>
                <span className="text-xs text-muted">
                  {m.erledigt
                    ? `Erledigt${m.erledigt_at ? ` · ${formatDatumZeit(m.erledigt_at)}` : ''}`
                    : 'Offen'}
                </span>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold text-ink">Timeline</h2>
        <Card className="divide-y divide-border p-0">
          {(detail.auftrag_timeline ?? []).length === 0 ? (
            <p className="p-4 text-sm text-muted">Keine Einträge.</p>
          ) : (
            (detail.auftrag_timeline ?? []).slice(0, 25).map((ev) => (
              <div key={ev.id} className="px-4 py-3 text-sm">
                <p className="font-medium text-ink">{ev.titel}</p>
                <p className="text-xs text-muted">{formatDatumZeit(ev.created_at)}</p>
                {ev.beschreibung ? <p className="mt-1 text-muted">{ev.beschreibung}</p> : null}
              </div>
            ))
          )}
        </Card>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold text-ink">Gewerke &amp; Handwerker</h2>
        <div className="space-y-3">
          {(detail.auftrag_handwerker ?? []).length === 0 ? (
            <p className="text-sm text-muted">Keine Zuordnungen.</p>
          ) : (
            (detail.auftrag_handwerker ?? []).map((z) => (
              <Card key={z.id} className="flex flex-col gap-3 p-4 text-sm md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-ink">{z.gewerke?.name ?? 'Gewerk'}</p>
                  <p className="text-ink">{z.handwerker?.name ?? '—'}</p>
                  {z.handwerker?.telefon ? (
                    <a className="text-primary underline" href={`tel:${z.handwerker.telefon}`}>
                      {z.handwerker.telefon}
                    </a>
                  ) : null}
                  <p className="mt-1 text-xs text-muted">Status: {z.status ?? '—'}</p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    openFormModal(
                      z.gewerk_id,
                      z.handwerker_id,
                      z.handwerker?.email ?? ''
                    )
                  }
                >
                  <Send className="mr-2 inline h-4 w-4" aria-hidden />
                  Formular senden
                </Button>
              </Card>
            ))
          )}
        </div>
      </section>

      <section className="mb-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink">Termine</h2>
          <Link
            href={`/kalender?auftrag_id=${detail.id}`}
            className="inline-flex min-h-[44px] items-center rounded-lg border border-border px-3 text-sm font-medium text-primary hover:bg-canvas"
          >
            Termin hinzufügen
          </Link>
        </div>
        <Card className="divide-y divide-border p-0">
          {(detail.kalender_termine ?? []).length === 0 ? (
            <p className="p-4 text-sm text-muted">Keine Termine.</p>
          ) : (
            (detail.kalender_termine ?? []).map((t) => (
              <div key={t.id} className="px-4 py-3 text-sm">
                <p className="font-medium text-ink">{t.titel}</p>
                <p className="text-muted">
                  {formatDatum(t.datum)}
                  {t.uhrzeit_von ? ` · ${t.uhrzeit_von}` : ''}
                </p>
              </div>
            ))
          )}
        </Card>
      </section>

      {detail.kunde_id && hasPos ? (
        <div className="mb-6">
          <Link
            href={`/rechnungen/neu?auftrag_id=${detail.id}`}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white"
          >
            <Receipt className="h-4 w-4" aria-hidden />
            Rechnung erstellen
          </Link>
        </div>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold text-ink">Notizen</h2>
        <Textarea value={notizen} onChange={(e) => setNotizen(e.target.value)} rows={5} />
      </section>
            </>
          ) : null}

          {rtab === 'positionen' ? (
            <AuftragPositionenTab
              auftragId={detail.id}
              positionen={detail.auftrag_positionen ?? []}
              gewerke={gewerke}
              preislisten={preislisten}
              handwerkerRows={detail.auftrag_handwerker ?? []}
              onChanged={() => router.refresh()}
            />
          ) : null}

          {rtab === 'dokumentation' ? (
            <div className="space-y-4 pb-8">
              <Accordion title="Handwerker-Formulare" defaultOpen>
                <div className="grid gap-3 md:grid-cols-2">
                  {(detail.formular_eintraege ?? []).length === 0 ? (
                    <p className="text-sm text-muted">Noch keine Formular-Einträge.</p>
                  ) : (
                    (detail.formular_eintraege ?? []).map((e) => (
                      <Card key={e.id} className="space-y-2 p-4 text-sm">
                        <p className="font-medium text-ink">{e.formular_templates?.name ?? 'Formular'}</p>
                        <p className="text-xs text-muted">
                          {e.phase ? FORMULAR_PHASE_LABELS[e.phase] ?? e.phase : '—'} ·{' '}
                          {e.handwerker?.name ?? '—'}
                        </p>
                        <p className="text-xs text-muted">
                          {e.submitted_at
                            ? `Eingegangen: ${formatDatumZeit(e.submitted_at)}`
                            : e.gespeichert_at
                              ? `Zuletzt gespeichert: ${formatDatumZeit(e.gespeichert_at)}`
                              : 'Entwurf'}
                        </p>
                        <Button type="button" variant="ghost" onClick={() => setViewEintrag(e)}>
                          <Eye className="mr-2 inline h-4 w-4" aria-hidden />
                          Anzeigen
                        </Button>
                      </Card>
                    ))
                  )}
                </div>
              </Accordion>

              <Accordion title="Punch List">
                {(detail.punch_list ?? []).length === 0 ? (
                  <p className="text-sm text-muted">Keine Einträge.</p>
                ) : (
                  <div className="space-y-2">
                    {(detail.punch_list ?? []).map((p) => (
                      <Card key={p.id} className="p-3 text-sm">
                        <p className="font-medium">{p.gewerke?.name ?? 'Gewerk'}</p>
                        <p className="text-muted">{p.beschreibung}</p>
                        <p className="text-xs text-muted">Status: {p.status}</p>
                      </Card>
                    ))}
                  </div>
                )}
              </Accordion>

              <AuftragDokumentationPanel detail={detail} onChanged={() => router.refresh()} />
            </div>
          ) : null}

          {rtab === 'finanzen' ? (
            <div className="pb-8">
              {finanzenPayload ? (
                <AuftragFinanzenClient auftragId={detail.id} {...finanzenPayload} />
              ) : (
                <p className="text-sm text-muted">
                  <Link href={`/auftraege/${detail.id}/finanzen`} className="text-primary underline">
                    Finanzen-Seite öffnen
                  </Link>
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <Modal
        open={projektModal}
        onClose={() => setProjektModal(false)}
        title="Projekt bearbeiten"
        size="md"
      >
        <div className="space-y-3">
          <Input label="Titel" value={projektTitel} onChange={(e) => setProjektTitel(e.target.value)} />
          <Input
            label="Start (Datum)"
            type="date"
            value={projektStart}
            onChange={(e) => setProjektStart(e.target.value)}
          />
          <Input
            label="Ende (Datum)"
            type="date"
            value={projektEnde}
            onChange={(e) => setProjektEnde(e.target.value)}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setProjektModal(false)}>
            Abbrechen
          </Button>
          <Button
            variant="primary"
            loading={pending}
            onClick={() =>
              run(async () => {
                const r = await updateAuftragProjektFelder(detail.id, {
                  titel: projektTitel,
                  start_datum: projektStart || null,
                  end_datum: projektEnde || null,
                })
                if (r.ok) setProjektModal(false)
                return r
              })
            }
          >
            Speichern
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!formModal}
        onClose={() => setFormModal(null)}
        title="Formular-Link senden"
        size="md"
      >
        {formModal ? (
          <>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="font-medium text-ink">Template</span>
                <select
                  value={formModal.templateId}
                  onChange={(e) =>
                    setFormModal((m) => (m ? { ...m, templateId: e.target.value } : m))
                  }
                  className="mt-1 w-full min-h-[44px] rounded-lg border border-border bg-surface px-3"
                >
                  <option value="">Bitte wählen</option>
                  {filteredTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-ink">Phase</span>
                <select
                  value={formModal.phase}
                  onChange={(e) =>
                    setFormModal((m) =>
                      m
                        ? {
                            ...m,
                            phase: e.target.value as 'vorab' | 'update' | 'abnahme',
                          }
                        : m
                    )
                  }
                  className="mt-1 w-full min-h-[44px] rounded-lg border border-border bg-surface px-3"
                >
                  <option value="vorab">Vorab</option>
                  <option value="update">Update</option>
                  <option value="abnahme">Abnahme</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-ink">Handwerker-E-Mail</span>
                <input
                  type="email"
                  value={formModal.email}
                  onChange={(e) =>
                    setFormModal((m) => (m ? { ...m, email: e.target.value } : m))
                  }
                  className="mt-1 w-full min-h-[44px] rounded-lg border border-border bg-surface px-3"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setFormModal(null)}>
                Abbrechen
              </Button>
              <Button variant="primary" loading={pending} onClick={submitFormular}>
                Formular-Link senden
              </Button>
            </div>
          </>
        ) : null}
      </Modal>

      <Modal
        open={!!viewEintrag}
        onClose={() => setViewEintrag(null)}
        title={viewEintrag?.formular_templates?.name ?? 'Formular'}
        size="lg"
      >
        {viewEintrag ? (
          <>
            <p className="-mt-1 mb-4 text-sm text-muted">
              {viewEintrag.phase
                ? FORMULAR_PHASE_LABELS[viewEintrag.phase] ?? viewEintrag.phase
                : '—'}{' '}
              · {viewEintrag.handwerker?.name ?? '—'}
            </p>
            <div className="max-h-[55vh] space-y-2 overflow-y-auto border-t border-border pt-4">
              {(viewEintrag.formular_templates?.felder ?? []).map((f: FormularFeld) => (
                <div key={f.id} className="text-sm">
                  <p className="font-medium text-ink">
                    {f.label}
                    {f.pflicht ? ' *' : ''}
                  </p>
                  <p className="text-muted">{formatFeldwert(viewEintrag.daten?.[f.id])}</p>
                </div>
              ))}
            </div>
            {(viewEintrag.foto_urls ?? []).length > 0 ? (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-ink">Fotos</p>
                <div className="flex flex-wrap gap-2">
                  {(viewEintrag.foto_urls ?? []).map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-[120px]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-24 w-full rounded object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
            {viewEintrag.bemerkungen ? (
              <div className="mt-4 text-sm">
                <p className="font-medium text-ink">Zusätzliche Bemerkungen</p>
                <p className="text-muted">{viewEintrag.bemerkungen}</p>
              </div>
            ) : null}
          </>
        ) : null}
      </Modal>

      <StatusActions
        typ="auftrag"
        status={detail.status}
        id={detail.id}
        data={statusActionData}
        onAction={onStatusAction}
        disabled={pending}
      />
    </div>
  )
}
