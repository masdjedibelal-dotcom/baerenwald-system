'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { ArrowLeft, Calendar, Copy, Download, Edit3, Pencil, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { AngebotStatusBadge } from '@/components/ui/AngebotStatusBadge'
import {
  acceptHandwerker,
  createAuftragFromAngebot,
  type HandwerkerGewerkListeEintrag,
  listHandwerkerFuerGewerk,
  markKundeAkzeptiert,
  planNachfassenTerminFuerAngebot,
  recordKundeAbgelehntMitDetails,
  replaceAngebotHandwerkerUndSenden,
  schliesseLeadNachAngebotVerlust,
  updateAngebotNotizen,
  deleteAngebot,
} from '@/app/(dashboard)/angebote/actions'
import {
  KUNDE_ABLEHNUNG_GRUND_LABELS,
  KUNDE_ABLEHNUNG_GRUND_VALUES,
  labelHandwerkerAblehnung,
  labelKundeAblehnung,
  type KundeAblehnungGrund,
} from '@/lib/angebote/ablehnung-labels'
import type { AngebotDetail, AngebotHandwerkerRow, AngebotStatus } from '@/lib/types'
import { normalizeAngebotPositionen, summenAusPositionen } from '@/lib/angebot-positionen'
import { defaultFirmenEinstellungen } from '@/lib/einstellungen-keys'
import { cn, formatDatum, formatPreis } from '@/lib/utils'
import { AngebotVersandSection } from '@/components/angebote/AngebotVersandSection'
import { StatusActions } from '@/components/funnel/StatusActions'
import { toast } from '@/components/ui/app-toast'

const STEPS: { status: AngebotStatus; label: string }[] = [
  { status: 'entwurf', label: 'Entwurf' },
  { status: 'gesendet_handwerker', label: 'Gesendet HW' },
  { status: 'handwerker_akzeptiert', label: 'HW akzeptiert' },
  { status: 'gesendet_kunde', label: 'Gesendet Kunde' },
  { status: 'kunde_akzeptiert', label: 'Kunde akzeptiert' },
]

function stepIndex(status: AngebotStatus): number {
  if (status === 'abgelehnt') return -1
  const i = STEPS.findIndex((s) => s.status === status)
  return i >= 0 ? i : 0
}

function addDaysYmd(ymd: string, n: number): string {
  const d = new Date(ymd.includes('T') ? ymd : `${ymd}T12:00:00`)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Pro Gewerk: abgelehnt, aber noch niemand akzeptiert (ohne Status „ersetzt“) */
function gewerkeMitAbgelehntOhneAkzeptiert(zuweisungen: AngebotHandwerkerRow[] | null | undefined) {
  const list = (zuweisungen ?? []).filter((z) => z.status !== 'ersetzt')
  const byGew = new Map<string, { name: string; accepted: boolean; rejected: boolean }>()
  for (const z of list) {
    const gid = z.gewerk_id
    const gname = z.gewerke?.name ?? 'Gewerk'
    const cur = byGew.get(gid) ?? { name: gname, accepted: false, rejected: false }
    if (z.status === 'akzeptiert') cur.accepted = true
    if (z.status === 'abgelehnt') cur.rejected = true
    byGew.set(gid, cur)
  }
  return Array.from(byGew.entries())
    .filter(([, v]) => v.rejected && !v.accepted)
    .map(([gewerk_id, v]) => ({ gewerk_id, gewerk_name: v.name }))
}

export function AngebotDetailClient({ detail: initial }: { detail: AngebotDetail }) {
  const router = useRouter()
  const [detail, setDetail] = useState(initial)
  const [notizen, setNotizen] = useState(initial.notizen ?? '')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [kundeAbModalOpen, setKundeAbModalOpen] = useState(false)
  const [kAbGrund, setKAbGrund] = useState<KundeAblehnungGrund | ''>('')
  const [kAbKonkurrenz, setKAbKonkurrenz] = useState('')
  const [kAbNotiz, setKAbNotiz] = useState('')

  const [nachfassenModalOpen, setNachfassenModalOpen] = useState(false)
  const [nachfassenDatum, setNachfassenDatum] = useState(() =>
    addDaysYmd(new Date().toISOString().slice(0, 10), 14)
  )

  const [replaceModal, setReplaceModal] = useState<{
    zuweisungId: string
    gewerkId: string
    gewerkName: string
  } | null>(null)
  const [replaceHwList, setReplaceHwList] = useState<HandwerkerGewerkListeEintrag[]>([])
  const [replaceSelectedId, setReplaceSelectedId] = useState<string | null>(null)
  const [replaceListErr, setReplaceListErr] = useState<string | null>(null)

  const [auftragModalOpen, setAuftragModalOpen] = useState(false)
  const [aufStart, setAufStart] = useState(() =>
    addDaysYmd(new Date().toISOString().slice(0, 10), 7)
  )
  const [aufEnde, setAufEnde] = useState(() =>
    addDaysYmd(addDaysYmd(new Date().toISOString().slice(0, 10), 7), 14)
  )
  const [aufNotizen, setAufNotizen] = useState('')
  const [aufMailKunde, setAufMailKunde] = useState(true)
  const [aufMailHw, setAufMailHw] = useState(true)

  useEffect(() => {
    setDetail(initial)
    setNotizen(initial.notizen ?? '')
  }, [initial])

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh()
    }, 30_000)
    return () => clearInterval(id)
  }, [router])

  const kunde = detail.kunden
  const name = kunde?.name ?? 'Ohne Kunde'

  const flushNotizen = useCallback(async () => {
    const r = await updateAngebotNotizen(detail.id, notizen)
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

  const run = (fn: () => Promise<{ ok: boolean; message?: string } | { ok: true; auftragId?: string }>) => {
    setErr(null)
    setMsg(null)
    startTransition(async () => {
      const r = await fn()
      if (!r.ok) {
        setErr('message' in r ? (r.message ?? 'Fehler') : 'Fehler')
        return
      }
      if ('auftragId' in r && r.auftragId) {
        router.push(`/auftraege/${r.auftragId}`)
        return
      }
      setMsg('Gespeichert.')
      router.refresh()
    })
  }

  const loadReplaceListe = useCallback(
    async (gewerkId: string) => {
      setReplaceListErr(null)
      setReplaceHwList([])
      setReplaceSelectedId(null)
      const r = await listHandwerkerFuerGewerk(gewerkId)
      if (!r.ok) {
        setReplaceListErr(r.message)
        return
      }
      setReplaceHwList(r.handwerker)
    },
    []
  )

  useEffect(() => {
    if (!replaceModal) return
    void loadReplaceListe(replaceModal.gewerkId)
  }, [replaceModal, loadReplaceListe])

  const gewerkWarnungen = gewerkeMitAbgelehntOhneAkzeptiert(detail.angebot_handwerker)

  const statusActionData = useMemo(() => {
    const ah = detail.angebot_handwerker ?? []
    const byGew = new Map<string, Set<string>>()
    for (const z of ah) {
      if ((z.status ?? '').toLowerCase() === 'ersetzt') continue
      const s = (z.status ?? 'ausstehend').toLowerCase()
      const set = byGew.get(z.gewerk_id) ?? new Set()
      set.add(s)
      byGew.set(z.gewerk_id, set)
    }
    let hw_gesamt = 0
    let hw_angenommen = 0
    byGew.forEach((set) => {
      hw_gesamt++
      if (set.has('akzeptiert')) hw_angenommen++
    })
    const ablehnungLabel =
      detail.ablehnung_grund != null
        ? labelKundeAblehnung(detail.ablehnung_grund as KundeAblehnungGrund)
        : ''
    return {
      hw_angenommen,
      hw_gesamt: Math.max(hw_gesamt, 1),
      hw_hat_abgelehnt: gewerkWarnungen.length > 0,
      hat_auftrag: detail.leads?.status === 'auftrag',
      ablehnung_grund: ablehnungLabel || detail.ablehnung_notiz?.trim() || undefined,
    }
  }, [detail.angebot_handwerker, detail.leads?.status, detail.ablehnung_grund, detail.ablehnung_notiz, gewerkWarnungen])

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
      if (action === 'angebot.send_handwerker') {
        document.getElementById('angebot-versand-handwerker')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        toast.message('Handwerker anfragen', { description: 'Bitte im Bereich „Versand“ alle Gewerke per Mail informieren.' })
        return
      }
      if (action === 'angebot.send_kunde') {
        document.getElementById('angebot-versand-kunde')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        toast.message('Versand an Kundin', { description: 'Hier können Sie das Angebot per E-Mail senden.' })
        return
      }
      if (action === 'angebot.hw_akzeptiert') {
        startTransition(async () => {
          await acceptHandwerker(detail.id)
          router.refresh()
        })
        return
      }
      if (action === 'angebot.mark_kunde_akzeptiert') {
        startTransition(async () => {
          await markKundeAkzeptiert(detail.id)
          router.refresh()
        })
        return
      }
      if (action === 'auftrag.create_modal') {
        const s = addDaysYmd(new Date().toISOString().slice(0, 10), 7)
        setAufStart(s)
        setAufEnde(addDaysYmd(s, 14))
        setAufNotizen('')
        setAufMailKunde(true)
        setAufMailHw(true)
        setAuftragModalOpen(true)
        return
      }
      if (action === 'angebot.kunde_abgelehnt') {
        setKAbGrund('')
        setKAbKonkurrenz('')
        setKAbNotiz('')
        setKundeAbModalOpen(true)
        return
      }
      if (action === 'angebot.nachfassen') {
        setNachfassenModalOpen(true)
        return
      }
      if (action === 'angebot.add_handwerker') {
        const g = gewerkWarnungen[0]
        if (!g) {
          document.getElementById('angebot-versand-handwerker')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          return
        }
        const z = (detail.angebot_handwerker ?? []).find(
          (x) => x.gewerk_id === g.gewerk_id && (x.status ?? '').toLowerCase() === 'abgelehnt'
        )
        if (z) {
          setReplaceModal({
            zuweisungId: z.id,
            gewerkId: g.gewerk_id,
            gewerkName: g.gewerk_name,
          })
          setReplaceSelectedId(null)
        }
        return
      }
      if (action === 'angebot.loeschen') {
        if (!window.confirm('Angebot wirklich löschen?')) return
        startTransition(async () => {
          const r = await deleteAngebot(detail.id)
          if ('error' in r) {
            toast.error(r.error)
            return
          }
          toast.success('Angebot gelöscht')
          router.push(detail.lead_id ? `/anfragen/${detail.lead_id}` : '/angebote')
          router.refresh()
        })
      }
    },
    [detail.angebot_handwerker, detail.id, gewerkWarnungen, router]
  )

  const idx = stepIndex(detail.status)
  const pos = normalizeAngebotPositionen(detail.positionen ?? [])
  const summen = summenAusPositionen(pos, 19)
  const min = detail.gesamt_min ?? summen.nettoMin
  const max = detail.gesamt_max ?? summen.nettoMax
  const firmDef = defaultFirmenEinstellungen()
  const gueltigTage = Math.max(1, parseInt(firmDef.angebot_gueltig_tage, 10) || 30)
  const gueltigBis = new Date(Date.now() + gueltigTage * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE')

  return (
    <div className="pb-6">
      <PageHeader
        title={
          <span className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-3">
            <Link
              href={detail.lead_id ? `/anfragen/${detail.lead_id}` : '/anfragen'}
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-bw-link"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Zurück
            </Link>
            <span className="min-w-0 truncate text-xl font-semibold md:text-2xl">{name}</span>
          </span>
        }
        action={<AngebotStatusBadge status={detail.status} />}
      />

      {err ? (
        <p className="mb-3 rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="mb-3 text-sm text-muted" role="status">
          {msg}
        </p>
      ) : null}

      <StatusActions
        typ="angebot"
        status={detail.status}
        id={detail.id}
        data={statusActionData}
        onAction={onStatusAction}
        disabled={pending}
        layout="inline"
      />

      {gewerkWarnungen.length > 0 && detail.status !== 'abgelehnt' ? (
        <div className="mb-4 space-y-2">
          {gewerkWarnungen.map((g) => (
            <div
              key={g.gewerk_id}
              className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"
            >
              <p>
                <span className="font-semibold">⚠️ {g.gewerk_name}</span> — kein Handwerker
                bestätigt.
              </p>
              <Button
                type="button"
                variant="secondary"
                className="shrink-0"
                onClick={() => {
                  const z = (detail.angebot_handwerker ?? []).find(
                    (x) =>
                      x.gewerk_id === g.gewerk_id &&
                      x.status === 'abgelehnt'
                  )
                  if (z) {
                    setReplaceModal({
                      zuweisungId: z.id,
                      gewerkId: g.gewerk_id,
                      gewerkName: g.gewerk_name,
                    })
                    setReplaceSelectedId(null)
                  }
                }}
              >
                Anderen Handwerker auswählen
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <section className="mb-6 rounded-lg border border-border bg-surface p-4 shadow-card">
        <h2 className="mb-3 text-sm font-semibold text-ink">Status</h2>
        {detail.status === 'abgelehnt' ? (
          <div className="space-y-1 text-sm text-muted">
            <p>Dieses Angebot wurde abgelehnt.</p>
            {detail.ablehnung_grund ? (
              <p>
                <span className="font-medium text-ink">Grund:</span>{' '}
                {labelKundeAblehnung(detail.ablehnung_grund)}
                {detail.ablehnung_konkurrenz_preis != null ? (
                  <span>
                    {' '}
                    · Konkurrenz: {Number(detail.ablehnung_konkurrenz_preis).toLocaleString('de-DE')} €
                  </span>
                ) : null}
              </p>
            ) : null}
            {detail.ablehnung_notiz?.trim() ? (
              <p className="text-xs">Details: {detail.ablehnung_notiz.trim()}</p>
            ) : null}
          </div>
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

      </section>

      {detail.status === 'abgelehnt' && detail.ablehnung_grund ? (
        <section className="mb-6 grid gap-3 md:grid-cols-3">
          <Card className="flex flex-col gap-3 p-4">
            <Edit3 className="h-8 w-8 text-primary" aria-hidden />
            <h3 className="font-semibold text-ink">Angebot überarbeiten</h3>
            <p className="text-sm text-muted">
              Preis oder Leistungen anpassen und neu senden.
            </p>
            <Link
              href={`/angebote/neu?kopie_von=${detail.id}`}
              className="mt-auto inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white"
            >
              Angebot kopieren
            </Link>
          </Card>
          <Card className="flex flex-col gap-3 p-4">
            <Calendar className="h-8 w-8 text-primary" aria-hidden />
            <h3 className="font-semibold text-ink">Später nachfassen</h3>
            <p className="text-sm text-muted">
              Termin setzen, um in einigen Tagen erneut zu kontaktieren.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-auto min-h-[44px]"
              onClick={() => {
                setNachfassenDatum(addDaysYmd(new Date().toISOString().slice(0, 10), 14))
                setNachfassenModalOpen(true)
              }}
            >
              Erinnerung anlegen
            </Button>
          </Card>
          <Card className="flex flex-col gap-3 p-4">
            <X className="h-8 w-8 text-danger" aria-hidden />
            <h3 className="font-semibold text-ink">Als verloren markieren</h3>
            <p className="text-sm text-muted">Lead abschließen und archivieren.</p>
            <Button
              type="button"
              variant="danger"
              className="mt-auto min-h-[44px]"
              loading={pending}
              onClick={() => run(() => schliesseLeadNachAngebotVerlust(detail.id))}
            >
              Lead schließen
            </Button>
          </Card>
        </section>
      ) : null}

      <AngebotVersandSection
        detail={detail}
        bruttoMin={summen.bruttoMin}
        bruttoMax={summen.bruttoMax}
        positionen={pos}
        gueltigBis={gueltigBis}
      />

      {kunde ? (
        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold text-ink">Kunde</h2>
          <Card className="space-y-1 p-4 text-sm">
            <p className="font-medium text-ink">{kunde.name}</p>
            <p className="text-muted">{kunde.email ?? '—'}</p>
            <p className="text-muted">{kunde.telefon ?? '—'}</p>
          </Card>
        </section>
      ) : null}

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold text-ink">Positionen</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-card">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-canvas text-muted">
                <th className="px-3 py-2 font-medium">Gewerk</th>
                <th className="px-3 py-2 font-medium">Beschreibung</th>
                <th className="px-3 py-2 font-medium">Menge</th>
                <th className="px-3 py-2 font-medium">Lohn netto</th>
                <th className="px-3 py-2 font-medium">Material netto</th>
                <th className="px-3 py-2 font-medium">Zeile netto</th>
              </tr>
            </thead>
            <tbody>
              {pos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-muted">
                    Keine Positionen.
                  </td>
                </tr>
              ) : (
                pos.map((p) => {
                  const m = p.menge || 1
                  const lZeile = p.lohn_netto * m
                  const matZeile = p.material_netto * m
                  const z = (p.lohn_netto + p.material_netto) * m
                  return (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">{p.gewerk_name}</td>
                      <td className="px-3 py-2">
                        {(p.beschreibung || p.leistung).trim()}
                        {p.notiz_extern ? (
                          <span className="mt-1 block text-xs text-muted">{p.notiz_extern}</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        {p.menge} {p.einheit}
                      </td>
                      <td className="px-3 py-2">{formatPreis(undefined, lZeile, lZeile)}</td>
                      <td className="px-3 py-2">{formatPreis(undefined, matZeile, matZeile)}</td>
                      <td className="px-3 py-2">{formatPreis(undefined, z, z)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 space-y-1 rounded-lg bg-canvas p-3 text-sm">
          <p>
            Lohn gesamt: {formatPreis(undefined, summen.lohnZeileMin, summen.lohnZeileMax)}
          </p>
          <p>
            Material gesamt: {formatPreis(undefined, summen.materialZeileMin, summen.materialZeileMax)}
          </p>
          <p className="font-semibold">
            Netto: {formatPreis(undefined, summen.nettoMin, summen.nettoMax)} · MwSt 19%:{' '}
            {formatPreis(undefined, summen.mwstBetragMin, summen.mwstBetragMax)} · Brutto:{' '}
            {formatPreis(undefined, summen.bruttoMin, summen.bruttoMax)}
          </p>
          <p className="text-xs text-muted">
            Intern — Einkauf: {formatPreis(undefined, summen.einkaufZeileMin, summen.einkaufZeileMax)} · Marge:{' '}
            {formatPreis(undefined, summen.margeMin, summen.margeMax)}
          </p>
        </div>
        <p className="mt-2 text-sm text-muted">
          Gespeichert (DB): {formatPreis(detail.gesamt_fix ?? null, min, max)}
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold text-ink">Handwerker</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {(detail.angebot_handwerker ?? []).length === 0 ? (
            <p className="text-sm text-muted">Keine Handwerker zugewiesen.</p>
          ) : (
            (detail.angebot_handwerker ?? []).map((z) => {
              const abgelehnt = z.status === 'abgelehnt'
              const grundLabel = labelHandwerkerAblehnung(z.ablehnung_grund ?? null)
              return (
                <Card
                  key={z.id}
                  className={cn(
                    'space-y-2 p-4 text-sm',
                    abgelehnt && 'border-danger/50 bg-danger/5'
                  )}
                >
                  <p className="font-medium text-ink">{z.gewerke?.name ?? 'Gewerk'}</p>
                  <p className="text-ink">{z.handwerker?.name ?? '—'}</p>
                  <p className="text-muted">{z.handwerker?.email ?? '—'}</p>
                  <p className="text-muted">
                    {z.handwerker?.telefon ? (
                      <a href={`tel:${String(z.handwerker.telefon).replace(/\s/g, '')}`} className="text-primary underline">
                        {z.handwerker.telefon}
                      </a>
                    ) : (
                      '—'
                    )}
                  </p>
                  {z.aufgabe_notiz ? (
                    <p className="text-xs text-muted">{z.aufgabe_notiz}</p>
                  ) : null}
                  {abgelehnt ? (
                    <p className="text-xs font-medium text-danger">
                      Ablehnung: {grundLabel}
                      {z.antwort_notiz?.trim() ? ` — ${z.antwort_notiz.trim()}` : ''}
                    </p>
                  ) : null}
                  {z.status ? (
                    <span className="inline-block rounded-md bg-canvas px-2 py-0.5 text-xs text-muted">
                      {z.status}
                    </span>
                  ) : null}
                </Card>
              )
            })
          )}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold text-ink">Aktionen</h2>
        <div className="flex flex-wrap gap-2">
          {detail.pdf_url ? (
            <a
              href={detail.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-ink hover:bg-canvas"
            >
              <Download className="h-4 w-4" aria-hidden />
              PDF herunterladen
            </a>
          ) : (
            <a
              href={`/api/angebote/${detail.id}/pdf`}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-ink hover:bg-canvas"
            >
              <Download className="h-4 w-4" aria-hidden />
              PDF erzeugen & laden
            </a>
          )}
          {detail.status === 'entwurf' ? (
            <Link
              href={`/angebote/neu?angebot_id=${detail.id}`}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-ink hover:bg-canvas"
            >
              <Pencil className="h-4 w-4" aria-hidden />
              Angebot bearbeiten
            </Link>
          ) : null}
          <Link
            href="/kalender"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-border px-4 text-sm font-medium text-ink hover:bg-canvas"
          >
            Termin anlegen
          </Link>
          <Link
            href={`/angebote/neu?kopie_von=${detail.id}`}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-ink hover:bg-canvas"
          >
            <Copy className="h-4 w-4" aria-hidden />
            Angebot kopieren
          </Link>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold text-ink">Notizen</h2>
        <Textarea
          value={notizen}
          onChange={(e) => setNotizen(e.target.value)}
          rows={5}
          placeholder="Interne Notizen (werden automatisch gespeichert)…"
        />
        <p className="mt-1 text-xs text-muted">Erstellt: {formatDatum(detail.created_at)}</p>
      </section>

      <Modal
        open={kundeAbModalOpen}
        onClose={() => setKundeAbModalOpen(false)}
        title="Kunde hat abgelehnt"
        size="lg"
        footer={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setKundeAbModalOpen(false)}
              disabled={pending}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={pending}
              onClick={() => {
                if (!kAbGrund) {
                  setErr('Bitte einen Ablehnungsgrund wählen.')
                  return
                }
                const kp = kAbKonkurrenz.trim().replace(',', '.')
                const konk =
                  kp === '' || Number.isNaN(parseFloat(kp)) ? null : Math.round(parseFloat(kp) * 100) / 100
                setKundeAbModalOpen(false)
                run(() =>
                  recordKundeAbgelehntMitDetails(detail.id, {
                    grund: kAbGrund,
                    konkurrenz_preis_eur: konk,
                    notiz: kAbNotiz.trim() || null,
                  })
                )
              }}
            >
              Speichern
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">Warum hat der Kunde abgelehnt? (Pflichtfeld)</p>
        <div className="mt-4 space-y-4">
          <Select
            label="Grund"
            name="k_ab_grund"
            value={kAbGrund}
            onChange={(e) => setKAbGrund(e.target.value as KundeAblehnungGrund | '')}
            options={[
              { value: '', label: 'Grund wählen' },
              ...KUNDE_ABLEHNUNG_GRUND_VALUES.map((v) => ({
                value: v,
                label: KUNDE_ABLEHNUNG_GRUND_LABELS[v],
              })),
            ]}
          />
          <div>
            <label className="mb-1 block text-base font-medium text-ink">
              Konkurrenz-Angebot (optional)
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                step={100}
                value={kAbKonkurrenz}
                onChange={(e) => setKAbKonkurrenz(e.target.value)}
                placeholder="0"
                className="flex-1"
              />
              <span className="text-muted">€</span>
            </div>
          </div>
          <Textarea
            label="Weitere Details (optional)"
            value={kAbNotiz}
            onChange={(e) => setKAbNotiz(e.target.value)}
            rows={3}
          />
        </div>
      </Modal>

      <Modal
        open={nachfassenModalOpen}
        onClose={() => setNachfassenModalOpen(false)}
        title="Erinnerung anlegen"
        footer={
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setNachfassenModalOpen(false)}>
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={pending}
              onClick={() => {
                setErr(null)
                startTransition(async () => {
                  const r = await planNachfassenTerminFuerAngebot({
                    angebotId: detail.id,
                    datum: nachfassenDatum,
                  })
                  if (!r.ok) {
                    setErr(r.message)
                    return
                  }
                  setNachfassenModalOpen(false)
                  setMsg('Kalender-Termin angelegt.')
                  router.refresh()
                })
              }}
            >
              Speichern
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">Voreinstellung: +14 Tage</p>
        <div className="mt-4">
          <Input
            label="Datum"
            type="date"
            value={nachfassenDatum}
            onChange={(e) => setNachfassenDatum(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(replaceModal)}
        onClose={() => setReplaceModal(null)}
        title={replaceModal ? `${replaceModal.gewerkName} — neuen Handwerker wählen` : 'Handwerker wählen'}
        size="lg"
        footer={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setReplaceModal(null)}>
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={pending}
              disabled={!replaceSelectedId}
              onClick={() => {
                if (!replaceSelectedId || !replaceModal) return
                const alteId = replaceModal.zuweisungId
                const neueId = replaceSelectedId
                setReplaceModal(null)
                run(() =>
                  replaceAngebotHandwerkerUndSenden({
                    angebotId: detail.id,
                    alteZuweisungId: alteId,
                    neuerHandwerkerId: neueId,
                  })
                )
              }}
            >
              Auswählen und anfragen
            </Button>
          </div>
        }
      >
        {replaceListErr ? <p className="mb-2 text-sm text-danger">{replaceListErr}</p> : null}
        <ul className="max-h-[55vh] space-y-3 overflow-y-auto">
          {replaceHwList.map((h) => (
            <li key={h.id}>
              <label className="flex cursor-pointer gap-3 rounded-lg border border-border p-3 hover:bg-canvas">
                <input
                  type="radio"
                  name="replace-hw"
                  className="mt-1"
                  checked={replaceSelectedId === h.id}
                  onChange={() => setReplaceSelectedId(h.id)}
                />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium text-ink">
                    {h.name}
                    {h.firma ? <span className="text-muted"> · {h.firma}</span> : null}
                  </p>
                  {h.telefon ? (
                    <a href={`tel:${h.telefon.replace(/\s/g, '')}`} className="text-primary underline">
                      {h.telefon}
                    </a>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                  <p className="text-xs text-muted">
                    Letzter Einsatz: {h.letzter_einsatz ? formatDatum(h.letzter_einsatz) : '—'}
                  </p>
                  <span
                    className={cn(
                      'mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium',
                      h.verfuegbar ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-950'
                    )}
                  >
                    {h.verfuegbar ? 'Aktuell verfügbar' : 'Mit laufenden Aufträgen'}
                  </span>
                </div>
              </label>
            </li>
          ))}
        </ul>
      </Modal>

      <Modal
        open={auftragModalOpen}
        onClose={() => setAuftragModalOpen(false)}
        title="Auftrag erstellen"
        size="lg"
        footer={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setAuftragModalOpen(false)}>
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={pending}
              onClick={() => {
                setAuftragModalOpen(false)
                run(() =>
                  createAuftragFromAngebot(detail.id, {
                    start_datum: aufStart,
                    end_datum: aufEnde,
                    notizen: aufNotizen.trim() || null,
                    send_kunden_email: aufMailKunde,
                    send_handwerker_email: aufMailHw,
                  })
                )
              }}
            >
              Auftrag erstellen
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm">
          <p>
            <span className="text-muted">Kunde:</span>{' '}
            <span className="font-medium text-ink">{kunde?.name ?? '—'}</span>
          </p>
          <p>
            <span className="text-muted">Gewerke:</span>{' '}
            <span className="font-medium text-ink">
              {Array.from(new Set(pos.map((p) => p.gewerk_name))).join(', ') || '—'}
            </span>
          </p>
          <div className="rounded-lg border border-border bg-canvas/40 p-3">
            <p className="text-xs font-semibold uppercase text-muted">Handwerker (akzeptiert)</p>
            <ul className="mt-2 space-y-1">
              {(detail.angebot_handwerker ?? [])
                .filter((z) => z.status === 'akzeptiert')
                .map((z) => (
                  <li key={z.id}>
                    {z.gewerke?.name ?? 'Gewerk'}: {z.handwerker?.name ?? '—'}
                  </li>
                ))}
            </ul>
          </div>
          <Input
            label="Start-Datum"
            type="date"
            required
            value={aufStart}
            onChange={(e) => {
              const v = e.target.value
              setAufStart(v)
              setAufEnde(addDaysYmd(v, 14))
            }}
          />
          <Input
            label="Geschätztes End-Datum"
            type="date"
            value={aufEnde}
            onChange={(e) => setAufEnde(e.target.value)}
          />
          <Textarea
            label="Interne Notizen"
            value={aufNotizen}
            onChange={(e) => setAufNotizen(e.target.value)}
            rows={3}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={aufMailKunde} onChange={(e) => setAufMailKunde(e.target.checked)} />
            Auftragsbestätigung an Kundin senden
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={aufMailHw} onChange={(e) => setAufMailHw(e.target.checked)} />
            Info an alle Handwerker senden
          </label>
        </div>
      </Modal>

    </div>
  )
}
