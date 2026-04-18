'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, FileText, Inbox, RefreshCw, Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatTile } from '@/components/dashboard/StatTile'
import { Card } from '@/components/ui/Card'
import { LeadStatusBadge } from '@/components/ui/Badge'
import { toast } from 'sonner'
import { meilensteinVorlagenFuerKunde } from '@/lib/auftraege/milestone-mail-templates'
import type { Kunde, Lead, LeadStatus } from '@/lib/types'

export type DashboardWarnung = {
  angebot_id?: string
  auftrag_id?: string
  eintrag_id?: string
  kunde: string
  typ:
    | 'handwerker_abgelehnt'
    | 'keine_antwort_kunde'
    | 'keine_antwort_handwerker'
    | 'behinderung'
    | 'baustopp_aktiv'
  gewerk_name?: string | null
  handwerker_name?: string | null
  zuweisung_id?: string | null
  behinderung_grund?: string | null
  behinderung_verzug_tage?: number | null
  kunde_email?: string | null
  baustopp_typ?: string | null
  baustopp_grund?: string | null
}

export type DashboardStatistik = {
  conversionProzent: number | null
  ablehnungTop: { grund: string; anzahl: number }[]
}

export type DashboardInitial = {
  neueHeute: number
  offeneAngebote: number
  aktiveAuftraege: number
  termineWoche: number
  letzteAnfragen: Pick<Lead, 'id' | 'kontakt_name' | 'status' | 'situation' | 'plz' | 'created_at'>[]
  warnungen: DashboardWarnung[]
  statistik: DashboardStatistik
  /** Anzahl Einträge gemäß Datenschutz-Fristen (Aufschübe berücksichtigt). */
  datenschutzFaellig: number
}

function startOfTodayIso() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function weekRangeIso() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(mon.getDate() + diff)
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(sun.getDate() + 6)
  return { from: mon.toISOString().slice(0, 10), to: sun.toISOString().slice(0, 10) }
}

export function DashboardHomeClient({ initial }: { initial: DashboardInitial }) {
  const [data, setData] = useState(initial)
  const [resendBusy, setResendBusy] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const supabase = createClient()
    const t0 = startOfTodayIso()
    const { from: wFrom, to: wTo } = weekRangeIso()

    const [
      { count: neueHeute },
      { count: offeneAngebote },
      { count: aktiveAuftraege },
      { count: termineWoche },
      { data: leadsData },
    ] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', t0),
      supabase
        .from('angebote')
        .select('id', { count: 'exact', head: true })
        .not('status', 'eq', 'abgelehnt')
        .not('status', 'eq', 'kunde_akzeptiert'),
      supabase
        .from('auftraege')
        .select('id', { count: 'exact', head: true })
        .not('status', 'eq', 'abgeschlossen')
        .not('status', 'eq', 'storniert'),
      supabase
        .from('kalender_termine')
        .select('id', { count: 'exact', head: true })
        .gte('datum', wFrom)
        .lte('datum', wTo)
        .eq('erledigt', false),
      supabase
        .from('leads')
        .select('id, kontakt_name, status, situation, plz, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    setData((prev) => ({
      neueHeute: neueHeute ?? 0,
      offeneAngebote: offeneAngebote ?? 0,
      aktiveAuftraege: aktiveAuftraege ?? 0,
      termineWoche: termineWoche ?? 0,
      letzteAnfragen: (leadsData ?? []) as DashboardInitial['letzteAnfragen'],
      warnungen: prev.warnungen,
      statistik: prev.statistik,
      datenschutzFaellig: prev.datenschutzFaellig,
    }))
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const ch = supabase
      .channel('crm-leads-insert')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads' },
        () => {
          toast.info('Neue Anfrage eingegangen')
          void refresh()
        }
      )
      .subscribe()
    const id = window.setInterval(() => void refresh(), 5 * 60 * 1000)
    return () => {
      void supabase.removeChannel(ch)
      window.clearInterval(id)
    }
  }, [refresh])

  return (
    <div>
      <PageHeader title="Dashboard" />

      {data.datenschutzFaellig > 0 ? (
        <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
          <span className="font-semibold">🔒 {data.datenschutzFaellig} Einträge zur Löschung fällig — DSGVO</span>
          {' · '}
          <Link href="/einstellungen/datenschutz" className="font-medium underline">
            Zur Datenschutz-Übersicht
          </Link>
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile href="/anfragen" label="Neue Anfragen heute" value={data.neueHeute} icon={Inbox} />
        <StatTile href="/angebote" label="Offene Angebote" value={data.offeneAngebote} icon={FileText} />
        <StatTile href="/auftraege" label="Aktive Aufträge" value={data.aktiveAuftraege} icon={Wrench} />
        <StatTile href="/kalender" label="Termine diese Woche" value={data.termineWoche} icon={CalendarDays} />
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-base font-semibold text-ink">Handlungsbedarf</h2>
        {data.warnungen.length === 0 ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            ✓ Alles auf dem neuesten Stand
          </div>
        ) : (
          <ul className="space-y-2">
            {data.warnungen.map((w, i) => (
              <li
                key={`${w.typ}-${w.auftrag_id ?? w.angebot_id ?? 'x'}-${w.eintrag_id ?? w.zuweisung_id ?? i}`}
                className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  {w.typ === 'handwerker_abgelehnt' ? (
                    <p>
                      <span className="font-semibold">⚠️ Handwerker abgelehnt:</span>{' '}
                      <span className="text-ink">
                        „{w.kunde}
                        {w.gewerk_name ? ` — ${w.gewerk_name}` : ''}“ — anderen Handwerker wählen
                      </span>
                    </p>
                  ) : null}
                  {w.typ === 'keine_antwort_kunde' ? (
                    <p>
                      <span className="font-semibold">⏰ Keine Antwort Kunde:</span>{' '}
                      <span className="text-ink">„{w.kunde}“ — seit 3 Tagen offen</span>
                    </p>
                  ) : null}
                  {w.typ === 'keine_antwort_handwerker' ? (
                    <p>
                      <span className="font-semibold">⏰ Keine Antwort Handwerker:</span>{' '}
                      <span className="text-ink">
                        {w.handwerker_name ?? 'Handwerkerin'} — „{w.kunde}“ seit 2 Tagen keine Antwort
                      </span>
                    </p>
                  ) : null}
                  {w.typ === 'behinderung' ? (
                    <p>
                      <span className="font-semibold">Behinderungsanzeige eingegangen</span>{' '}
                      <span className="text-ink">
                        {w.handwerker_name ?? 'Handwerker'} kann nicht weiterarbeiten:{' '}
                        {w.behinderung_grund ?? '—'}
                        {w.behinderung_verzug_tage != null
                          ? ` · Verzug ca. ${w.behinderung_verzug_tage} Arbeitstage`
                          : ''}
                      </span>
                    </p>
                  ) : null}
                  {w.typ === 'baustopp_aktiv' ? (
                    <p>
                      <span className="font-semibold">🌧️ Aktiver Baustopp</span>{' '}
                      <span className="text-ink">
                        „{w.kunde}“ —{' '}
                        {w.baustopp_typ === 'witterung'
                          ? 'Witterung'
                          : w.baustopp_typ === 'material'
                            ? 'Material'
                            : w.baustopp_typ === 'zugang'
                              ? 'Zugang'
                              : 'Sonstiges'}
                        {w.baustopp_grund ? `: ${w.baustopp_grund}` : ''}
                      </span>
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {w.angebot_id ? (
                    <Link
                      href={`/angebote/${w.angebot_id}`}
                      className="inline-flex min-h-[40px] items-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-primary"
                    >
                      Zum Angebot
                    </Link>
                  ) : null}
                  {w.auftrag_id ? (
                    <Link
                      href={
                        w.typ === 'baustopp_aktiv'
                          ? `/auftraege/${w.auftrag_id}`
                          : `/auftraege/${w.auftrag_id}#dokumentation`
                      }
                      className="inline-flex min-h-[40px] items-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-primary"
                    >
                      Auftrag öffnen
                    </Link>
                  ) : null}
                  {w.typ === 'behinderung' && w.kunde_email ? (
                    <a
                      href={(() => {
                        const stub = {
                          id: '',
                          name: w.kunde,
                          email: w.kunde_email,
                          telefon: null,
                          adresse: null,
                          plz: null,
                          ort: null,
                          typ: 'privat',
                          notizen: null,
                          created_at: '',
                        } as Kunde
                        const v = meilensteinVorlagenFuerKunde(stub).verzoegerung
                        const body = v.text
                          .replace('[Grund bitte ergänzen]', w.behinderung_grund ?? '')
                          .replace('[Datum eintragen]', '')
                        return `mailto:${w.kunde_email}?subject=${encodeURIComponent(v.betreff)}&body=${encodeURIComponent(body)}`
                      })()}
                      className="inline-flex min-h-[40px] items-center rounded-lg bg-primary px-3 text-sm font-medium text-white"
                    >
                      Kunden informieren
                    </a>
                  ) : null}
                  {w.typ === 'keine_antwort_kunde' ? (
                    <Link
                      href={`/angebote/${w.angebot_id}`}
                      className="inline-flex min-h-[40px] items-center rounded-lg bg-primary px-3 text-sm font-medium text-white"
                    >
                      Nachfassen
                    </Link>
                  ) : null}
                  {w.typ === 'keine_antwort_handwerker' && w.zuweisung_id ? (
                    <button
                      type="button"
                      disabled={resendBusy === w.zuweisung_id}
                      className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-ink disabled:opacity-50"
                      onClick={() => {
                        const zid = w.zuweisung_id
                        if (!zid) return
                        setResendBusy(zid)
                        void (async () => {
                          try {
                            const res = await fetch(`/api/angebote/${w.angebot_id}/senden`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                typ: 'handwerker',
                                zuweisung_id: zid,
                                send_email: true,
                              }),
                            })
                            const j = (await res.json()) as { error?: string }
                            if (!res.ok) {
                              toast.error(j.error ?? 'Versand fehlgeschlagen')
                            } else {
                              toast.success('Erneut gesendet')
                            }
                          } finally {
                            setResendBusy(null)
                          }
                        })()
                      }}
                    >
                      <RefreshCw className="h-4 w-4" aria-hidden />
                      Erneut senden
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card className="p-0">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-base font-semibold text-ink">Letzte Anfragen</h2>
          </div>
          <ul className="divide-y divide-border">
            {data.letzteAnfragen.length === 0 ? (
              <li className="px-4 py-6 text-sm text-muted">Keine Anfragen.</li>
            ) : (
              data.letzteAnfragen.map((lead) => (
                <li key={lead.id}>
                  <Link
                    href={`/anfragen/${lead.id}`}
                    className="flex min-h-[52px] flex-col gap-1 px-4 py-3 hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-ink">{lead.kontakt_name ?? 'Ohne Namen'}</span>
                      <LeadStatusBadge status={lead.status as LeadStatus} />
                    </div>
                    <p className="text-sm text-muted">
                      {lead.situation ?? '—'}
                      {lead.plz ? ` · PLZ ${lead.plz}` : ''}
                    </p>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 text-base font-semibold text-ink">Statistik</h2>
          {data.statistik.conversionProzent != null ? (
            <p className="text-sm text-ink">
              <span className="font-semibold">Conversion:</span>{' '}
              {data.statistik.conversionProzent}% (Aufträge mit Angebot / Angebote an Kundin gesendet)
            </p>
          ) : (
            <p className="text-sm text-muted">Conversion: noch keine ausreichenden Daten.</p>
          )}
          <h3 className="mt-4 text-sm font-semibold text-ink">Häufigste Ablehnungsgründe</h3>
          {data.statistik.ablehnungTop.length === 0 ? (
            <p className="mt-1 text-sm text-muted">Noch keine erfassten Kunden-Ablehnungen.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {data.statistik.ablehnungTop.map((r) => (
                <li key={r.grund}>
                  <span className="text-ink">{r.grund}</span> — {r.anzahl}×
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted">
            Kennzahlen-Teil wird beim Laden der Seite berechnet; Kacheln oben aktualisieren sich etwa alle 5
            Minuten.
          </p>
          <Link
            href="/kalender"
            className="mt-4 inline-flex min-h-[44px] items-center text-sm font-medium text-primary"
          >
            Zum Kalender
          </Link>
        </Card>
      </div>
    </div>
  )
}
