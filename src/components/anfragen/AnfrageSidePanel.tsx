'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { ChevronDown } from 'lucide-react'
import { SidePanel } from '@/components/ui/SidePanel'
import { LeadStatusBadge } from '@/components/ui/Badge'
import { AngebotStatusBadge } from '@/components/ui/AngebotStatusBadge'
import { StatusActions } from '@/components/funnel/StatusActions'
import { PropertyRow } from '@/components/ui/PropertyRow'
import { Textarea } from '@/components/ui/Textarea'
import { TerminModal } from '@/components/anfragen/TerminModal'
import { createClient } from '@/lib/supabase'
import { updateLeadNotizen, updateLeadStatus } from '@/app/(dashboard)/anfragen/actions'
import { toast } from '@/components/ui/app-toast'
import type { LeadDetail, LeadListAngebot, LeadStatus, LeadWithAngebote } from '@/lib/types'
import {
  BEREICH_LABELS,
  KANAL_LABELS,
  SITUATION_LABELS,
  STATUS_LABELS,
  formatBudget,
  formatDatum,
  formatDatumZeit,
  formatPreis,
} from '@/lib/utils'
import { cn } from '@/lib/utils'

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

type TabId = 'details' | 'aktiv' | 'angebot'

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
          angebote(id, status, gesamt_min, gesamt_max, positionen, created_at)
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
  }, [open, leadId])

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

  async function saveNotizen() {
    if (!leadId) return
    const res = await updateLeadNotizen(leadId, notizen)
    if (!res.ok) toast.error(res.message)
    else toast.success('Notiz gespeichert')
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

  const angebotFirst = useMemo(() => {
    const raw = detail?.angebote
    if (!Array.isArray(raw) || !raw.length) return null
    return [...raw].sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    )[0] as LeadListAngebot
  }, [detail?.angebote])

  if (!display && !loading) return null

  return (
    <>
      <SidePanel
        open={open}
        onClose={onClose}
        title={title || (loading ? '…' : '')}
        subtitle={subtitle}
        badge={display ? <LeadStatusBadge status={display.status} /> : null}
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
                      <Link href={`/anfragen/${display!.id}`} className="btn btn-secondary btn-sm mt-2 w-full">
                        ✏️ Bearbeiten
                      </Link>
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
                          display!.situation
                            ? SITUATION_LABELS[display!.situation] ?? display!.situation
                            : '—'
                        }
                        editable={false}
                      />
                      <div className="property-row">
                        <span className="property-label">Bereiche</span>
                        <span className="property-value flex flex-wrap gap-1">
                          {display!.bereiche?.length
                            ? display!.bereiche!.map((b) => (
                                <span key={b} className="badge rounded bg-bw-bg px-2 py-0.5 text-xs">
                                  {BEREICH_LABELS[b] ?? b}
                                </span>
                              ))
                            : '—'}
                        </span>
                      </div>
                      <PropertyRow
                        label="Budget"
                        value={formatBudget(display!.preis_min, display!.preis_max)}
                        editable={false}
                      />
                      <PropertyRow label="Zeitraum" value={display!.zeitraum ?? '—'} editable={false} />
                    </div>
                  ) : null}
                </div>

                <div className="accordion">
                  <div className="accordion-header">
                    <span className="accordion-title">Vor-Ort</span>
                  </div>
                  <div className="accordion-body">
                    {detail?.vorab_formulare?.length ? (
                      <p className="text-sm text-bw-text">Vor-Ort-Aufnahme vorhanden.</p>
                    ) : (
                      <div className="rounded-lg border border-dashed border-bw-border bg-bw-bg p-4 text-center text-sm text-bw-text-muted">
                        Noch keine Vor-Ort-Aufnahme
                        <Link
                          href={`/anfragen/${display!.id}/vorab`}
                          className="btn btn-primary btn-sm mt-3 inline-flex"
                        >
                          📋 Aufnehmen →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                <div className="accordion">
                  <div className="accordion-header">
                    <span className="accordion-title">Notizen</span>
                  </div>
                  <div className="accordion-body">
                    <Textarea
                      value={notizen}
                      onChange={(e) => setNotizen(e.target.value)}
                      onBlur={() => void saveNotizen()}
                      placeholder="Notiz hinzufügen…"
                      rows={4}
                    />
                  </div>
                </div>

                <div className="accordion">
                  <div className="accordion-header">
                    <span className="accordion-title">Angebot</span>
                  </div>
                  <div className="accordion-body">
                    {angebotFirst ? (
                      <div className="rounded-lg border border-bw-border p-3 text-sm">
                        <AngebotStatusBadge status={angebotFirst.status as never} />
                        <p className="mt-2">{formatPreis(angebotFirst.gesamt_min, angebotFirst.gesamt_max)}</p>
                        <Link
                          href={`/angebote/${angebotFirst.id}`}
                          className="btn btn-primary btn-sm mt-2 w-full"
                        >
                          → Angebot öffnen
                        </Link>
                      </div>
                    ) : (
                      <Link href={`/angebote/neu?lead_id=${display!.id}`} className="btn btn-primary btn-sm w-full">
                        + Angebot erstellen
                      </Link>
                    )}
                  </div>
                </div>
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

            {tab === 'angebot' ? (
              <div className="space-y-3">
                {angebotFirst ? (
                  <>
                    <AngebotStatusBadge status={angebotFirst.status as never} />
                    <p className="text-sm text-bw-text-muted">
                      Erstellt {formatDatum(angebotFirst.created_at ?? '')}
                    </p>
                    <p className="text-lg font-semibold">{formatPreis(angebotFirst.gesamt_min, angebotFirst.gesamt_max)}</p>
                    <div className="flex flex-col gap-2">
                      <Link href={`/angebote/${angebotFirst.id}`} className="btn btn-primary btn-sm">
                        Angebot öffnen →
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-bw-border p-4 text-center text-sm text-bw-text-muted">
                    Noch kein Angebot
                    <Link
                      href={`/angebote/neu?lead_id=${display!.id}`}
                      className="btn btn-primary btn-sm mt-3 inline-flex"
                    >
                      + Angebot erstellen
                    </Link>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="border-t border-bw-border p-4">
            <Link href={`/anfragen/${display?.id}`} className="btn btn-secondary btn-sm w-full">
              Vollständig öffnen →
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
          onSaved={() => {
            setDetail((d) => d)
            router.refresh()
          }}
        />
      ) : null}
    </>
  )
}
