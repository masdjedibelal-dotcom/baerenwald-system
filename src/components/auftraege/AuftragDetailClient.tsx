'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { ArrowLeft, Euro, Eye, Receipt, Send } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { AuftragStatusBadge } from '@/components/ui/AuftragStatusBadge'
import {
  completeAuftragAbnahme,
  createFormularEintragUndEmail,
  startAuftragArbeit,
  setAuftragZurAbnahme,
  updateAuftragNotizen,
} from '@/app/(dashboard)/auftraege/actions'
import { AuftragDokumentationPanel } from '@/components/auftraege/AuftragDokumentationPanel'
import { AuftragKundenstatusSection } from '@/components/auftraege/AuftragKundenstatusSection'
import type {
  AuftragDetail,
  AuftragStatus,
  FormularEintrag,
  FormularFeld,
  FormularTemplate,
} from '@/lib/types'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { cn, formatDatum, formatDatumZeit, FORMULAR_PHASE_LABELS } from '@/lib/utils'
import { StatusActions } from '@/components/funnel/StatusActions'
import { toast } from 'sonner'

const STEPS: { status: AuftragStatus; label: string }[] = [
  { status: 'offen', label: 'Offen' },
  { status: 'in_arbeit', label: 'In Arbeit' },
  { status: 'abnahme', label: 'Abnahme' },
  { status: 'abgeschlossen', label: 'Abgeschlossen' },
]

function stepIndex(status: AuftragStatus): number {
  if (status === 'storniert') return -1
  const i = STEPS.findIndex((s) => s.status === status)
  return i >= 0 ? i : 0
}

function formatFeldwert(v: unknown): string {
  if (v == null) return '—'
  if (typeof v === 'boolean') return v ? 'Ja' : 'Nein'
  if (Array.isArray(v)) return v.join(', ')
  return String(v)
}

export function AuftragDetailClient({
  detail: initial,
  templates,
}: {
  detail: AuftragDetail
  templates: FormularTemplate[]
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
  const [tab, setTab] = useState<'uebersicht' | 'formulare' | 'dokumentation' | 'punch'>('uebersicht')

  useEffect(() => {
    setDetail(initial)
    setNotizen(initial.notizen ?? '')
  }, [initial])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash === '#dokumentation') setTab('dokumentation')
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
  const pos = normalizeAngebotPositionen(detail.angebote?.positionen ?? [])
  const idx = stepIndex(detail.status)

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
        setTab('dokumentation')
        return
      }
      if (action === 'auftrag.mangel') {
        setTab('punch')
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

      <div className="mb-4 flex flex-wrap gap-2 border-b border-border pb-3">
        {(
          [
            ['uebersicht', 'Übersicht'],
            ['formulare', 'Formulare'],
            ['dokumentation', 'Dokumentation'],
            ['punch', 'Punch List'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'min-h-[40px] rounded-lg px-3 text-sm font-medium',
              tab === id ? 'bg-primary text-white' : 'border border-border text-ink hover:bg-canvas'
            )}
          >
            {label}
          </button>
        ))}
        <Link
          href={`/auftraege/${detail.id}/finanzen`}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-ink hover:bg-canvas"
        >
          <Euro className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          Finanzen
        </Link>
      </div>

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
            onClick={() => setTab('dokumentation')}
          >
            In der Dokumentation verwalten
          </button>
        </div>
      ) : null}

      {tab === 'uebersicht' ? (
        <>
      <AuftragKundenstatusSection detail={detail} onChanged={() => router.refresh()} />

      <section className="mb-6 rounded-lg border border-border bg-surface p-4 shadow-card">
        <h2 className="mb-3 text-sm font-semibold text-ink">Status</h2>
        {detail.status === 'storniert' ? (
          <p className="text-sm text-muted">Dieser Auftrag ist storniert.</p>
        ) : (
          <ol className="flex flex-wrap gap-2 text-xs md:flex-nowrap md:gap-0 md:text-sm">
            {STEPS.map((s, i) => (
              <li key={s.status} className="flex min-w-0 flex-1 items-center">
                <span
                  className={cn(
                    'flex min-h-[36px] min-w-0 flex-1 items-center justify-center rounded-lg px-2 py-1 text-center font-medium',
                    i <= idx ? 'bg-primary/15 text-primary' : 'bg-canvas text-muted'
                  )}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 ? (
                  <span className="hidden px-1 text-muted md:inline" aria-hidden>
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        )}

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
                onClick={() => setTab('dokumentation')}
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
      </section>

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

      {kunde ? (
        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold text-ink">Kundendaten</h2>
          <Card className="space-y-2 p-4 text-sm">
            <p className="font-medium text-ink">{kunde.name}</p>
            {kunde.email ? (
              <a className="text-primary underline" href={`mailto:${kunde.email}`}>
                {kunde.email}
              </a>
            ) : (
              <p className="text-muted">—</p>
            )}
            {kunde.telefon ? (
              <a className="text-primary underline" href={`tel:${kunde.telefon}`}>
                {kunde.telefon}
              </a>
            ) : (
              <p className="text-muted">—</p>
            )}
          </Card>
        </section>
      ) : null}

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


      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold text-ink">Positionen aus Angebot</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-card">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-canvas text-muted">
                <th className="px-3 py-2 font-medium">Gewerk</th>
                <th className="px-3 py-2 font-medium">Beschreibung</th>
                <th className="px-3 py-2 font-medium">Menge</th>
                <th className="px-3 py-2 font-medium">Einheit</th>
              </tr>
            </thead>
            <tbody>
              {pos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-muted">
                    Keine Positionen.
                  </td>
                </tr>
              ) : (
                pos.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{p.gewerk_name}</td>
                    <td className="px-3 py-2">{(p.beschreibung || p.leistung).trim()}</td>
                    <td className="px-3 py-2">{p.menge}</td>
                    <td className="px-3 py-2">{p.einheit}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {detail.kunde_id && pos.length > 0 ? (
          <div className="mt-3">
            <Link
              href={`/rechnungen/neu?auftrag_id=${detail.id}`}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white"
            >
              <Receipt className="h-4 w-4" aria-hidden />
              Rechnung erstellen
            </Link>
          </div>
        ) : null}
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold text-ink">Notizen</h2>
        <Textarea value={notizen} onChange={(e) => setNotizen(e.target.value)} rows={5} />
      </section>
        </>
      ) : null}

      {tab === 'formulare' ? (
      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold text-ink">Formulare</h2>
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
      </section>
      ) : null}

      {tab === 'dokumentation' ? (
        <AuftragDokumentationPanel detail={detail} onChanged={() => router.refresh()} />
      ) : null}

      {tab === 'punch' ? (
        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold text-ink">Punch List</h2>
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
        </section>
      ) : null}

      {formModal ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center"
          role="dialog"
          aria-modal
        >
          <Card className="max-h-[90vh] w-full max-w-lg overflow-auto p-4">
            <h3 className="text-lg font-semibold text-ink">Formular-Link senden</h3>
            <div className="mt-4 space-y-3">
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
          </Card>
        </div>
      ) : null}

      {viewEintrag ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center"
          role="dialog"
          aria-modal
        >
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-auto p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-semibold text-ink">
                {viewEintrag.formular_templates?.name ?? 'Formular'}
              </h3>
              <button
                type="button"
                className="min-h-[44px] min-w-[44px] rounded-lg text-muted hover:bg-canvas"
                onClick={() => setViewEintrag(null)}
              >
                ✕
              </button>
            </div>
            <p className="mt-1 text-sm text-muted">
              {viewEintrag.phase
                ? FORMULAR_PHASE_LABELS[viewEintrag.phase] ?? viewEintrag.phase
                : '—'}{' '}
              · {viewEintrag.handwerker?.name ?? '—'}
            </p>
            <div className="mt-4 space-y-2 border-t border-border pt-4">
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
          </Card>
        </div>
      ) : null}

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
