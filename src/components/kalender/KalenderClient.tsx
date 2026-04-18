'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { createClient } from '@/lib/supabase'
import type { KalenderTermin } from '@/lib/types'
import { toast } from 'sonner'
import { KALENDER_TYP_BG, cn, formatDatum } from '@/lib/utils'
import {
  deleteKalenderTermin,
  saveKalenderTermin,
  setTerminErledigt,
} from '@/app/(dashboard)/kalender/actions'

type ViewMode = 'liste' | 'woche' | 'monat'

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isToday(d: Date) {
  const t = new Date()
  return sameDay(d, t)
}

function typLabel(t: KalenderTermin['typ']) {
  switch (t) {
    case 'besichtigung':
      return 'Besichtigung'
    case 'beginn':
      return 'Beginn'
    case 'abnahme':
      return 'Abnahme'
    default:
      return 'Sonstiges'
  }
}

function zeitSpanne(t: KalenderTermin) {
  if (t.uhrzeit_von && t.uhrzeit_bis) return `${t.uhrzeit_von}–${t.uhrzeit_bis}`
  if (t.uhrzeit_von) return `ab ${t.uhrzeit_von}`
  return ''
}

function verknuepfungLabel(t: KalenderTermin) {
  const l = t.leads?.kontakt_name
  const a = t.auftraege?.titel
  const k = t.auftraege?.kunden?.name
  if (l) return `Lead: ${l}`
  if (a || k) return `Auftrag: ${a ?? k ?? '—'}`
  return null
}

function listGroupKey(d: Date): string {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  const day = new Date(d)
  day.setHours(0, 0, 0, 0)
  const diff = (day.getTime() - t.getTime()) / 86400000
  if (diff === 0) return 'Heute'
  if (diff === 1) return 'Morgen'
  if (diff > 1 && diff <= 7 - t.getDay()) return 'Diese Woche'
  if (diff > 0) return 'Später'
  if (diff === -1) return 'Gestern'
  return 'Früher'
}

const TYP_OPTIONS: { value: KalenderTermin['typ']; label: string }[] = [
  { value: 'besichtigung', label: 'Besichtigung' },
  { value: 'beginn', label: 'Beginn' },
  { value: 'abnahme', label: 'Abnahme' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

export function KalenderClient() {
  const supabase = createClient()
  const [termine, setTermine] = useState<KalenderTermin[]>([])
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>('liste')
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const [monthAnchor, setMonthAnchor] = useState(() => new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<KalenderTermin | null>(null)
  const [pending, startTransition] = useTransition()

  const [fTitel, setFTitel] = useState('')
  const [fTyp, setFTyp] = useState<KalenderTermin['typ']>('besichtigung')
  const [fDatum, setFDatum] = useState('')
  const [fVon, setFVon] = useState('')
  const [fBis, setFBis] = useState('')
  const [fAdr, setFAdr] = useState('')
  const [fDesc, setFDesc] = useState('')
  const [fLeadId, setFLeadId] = useState('')
  const [fAuftragId, setFAuftragId] = useState('')
  const [fErledigt, setFErledigt] = useState(false)
  const [leadQ, setLeadQ] = useState('')
  const [auftragQ, setAuftragQ] = useState('')
  const [leadHits, setLeadHits] = useState<{ id: string; kontakt_name: string | null }[]>([])
  const [auftragHits, setAuftragHits] = useState<
    { id: string; titel: string | null; kunden?: { name: string } | null }[]
  >([])

  const load = useCallback(async () => {
    setLoadErr(null)
    const { data, error } = await supabase
      .from('kalender_termine')
      .select(
        `
        *,
        leads(kontakt_name),
        auftraege(
          titel,
          kunden(name)
        )
      `
      )
      .order('datum', { ascending: true })

    if (error) {
      setLoadErr(error.message)
      return
    }
    setTermine((data ?? []) as KalenderTermin[])
  }, [supabase])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const apply = () => setView(mq.matches ? 'woche' : 'liste')
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (!leadQ.trim()) {
      setLeadHits([])
      return
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('leads')
        .select('id, kontakt_name')
        .ilike('kontakt_name', `%${leadQ.trim()}%`)
        .limit(8)
      setLeadHits((data ?? []) as { id: string; kontakt_name: string | null }[])
    }, 250)
    return () => clearTimeout(t)
  }, [leadQ, supabase])

  useEffect(() => {
    if (!auftragQ.trim()) {
      setAuftragHits([])
      return
    }
    const t = setTimeout(async () => {
      const q = `%${auftragQ.trim()}%`
      const { data } = await supabase
        .from('auftraege')
        .select('id, titel, kunden(name)')
        .ilike('titel', q)
        .limit(8)
      const rows = (data ?? []) as {
        id: string
        titel: string | null
        kunden?: { name: string } | { name: string }[] | null
      }[]
      setAuftragHits(
        rows.map((row) => {
          const ku = row.kunden
          const kunden =
            ku == null ? null : Array.isArray(ku) ? ku[0] ?? null : ku
          return { id: row.id, titel: row.titel, kunden }
        })
      )
    }, 250)
    return () => clearTimeout(t)
  }, [auftragQ, supabase])

  function openNeu() {
    setEditing(null)
    setFTitel('')
    setFTyp('besichtigung')
    setFDatum(new Date().toISOString().slice(0, 10))
    setFVon('')
    setFBis('')
    setFAdr('')
    setFDesc('')
    setFLeadId('')
    setFAuftragId('')
    setFErledigt(false)
    setLeadQ('')
    setAuftragQ('')
    setModalOpen(true)
  }

  function openEdit(t: KalenderTermin) {
    setEditing(t)
    setFTitel(t.titel)
    setFTyp(t.typ)
    setFDatum(t.datum.slice(0, 10))
    setFVon(t.uhrzeit_von ?? '')
    setFBis(t.uhrzeit_bis ?? '')
    setFAdr(t.adresse ?? '')
    setFDesc(t.beschreibung ?? '')
    setFLeadId(t.lead_id ?? '')
    setFAuftragId(t.auftrag_id ?? '')
    setFErledigt(t.erledigt)
    setLeadQ('')
    setAuftragQ('')
    setModalOpen(true)
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await saveKalenderTermin({
        id: editing?.id,
        titel: fTitel,
        typ: fTyp,
        datum: fDatum,
        uhrzeit_von: fVon.trim() || null,
        uhrzeit_bis: fBis.trim() || null,
        adresse: fAdr.trim() || null,
        beschreibung: fDesc.trim() || null,
        lead_id: fLeadId || null,
        auftrag_id: fAuftragId || null,
        erledigt: fErledigt,
      })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success('Termin gespeichert')
      setModalOpen(false)
      await load()
    })
  }

  async function onDelete() {
    if (!editing) return
    if (!confirm('Termin wirklich löschen?')) return
    const res = await deleteKalenderTermin(editing.id)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    toast.success('Termin gelöscht')
    setModalOpen(false)
    await load()
  }

  async function toggleErledigt(t: KalenderTermin) {
    const res = await setTerminErledigt(t.id, !t.erledigt)
    if (!res.ok) return
    setTermine((prev) => prev.map((x) => (x.id === t.id ? { ...x, erledigt: !t.erledigt } : x)))
  }

  const groupedListe = useMemo(() => {
    const map = new Map<string, KalenderTermin[]>()
    for (const t of termine) {
      const d = parseLocalDate(t.datum.slice(0, 10))
      const key = listGroupKey(d)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    const order = ['Heute', 'Morgen', 'Diese Woche', 'Später', 'Gestern', 'Früher']
    return order.filter((k) => map.has(k)).map((k) => ({ key: k, items: map.get(k)! }))
  }, [termine])

  const weekDays = useMemo(() => {
    const start = startOfWeekMonday(weekAnchor)
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [weekAnchor])

  const monthGrid = useMemo(() => {
    const y = monthAnchor.getFullYear()
    const m = monthAnchor.getMonth()
    const first = new Date(y, m, 1)
    const start = startOfWeekMonday(first)
    const days: Date[] = []
    let cur = start
    while (days.length < 42) {
      days.push(new Date(cur))
      cur = addDays(cur, 1)
    }
    return days
  }, [monthAnchor])

  function termineForDay(day: Date) {
    return termine.filter((t) => sameDay(parseLocalDate(t.datum.slice(0, 10)), day))
  }

  return (
    <div>
      <PageHeader
        title="Kalender"
        action={
          <Button type="button" variant="primary" size="sm" onClick={openNeu}>
            + Neuer Termin
          </Button>
        }
      />

      {loadErr ? (
        <p className="mb-3 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {loadErr}
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {(['liste', 'woche', 'monat'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              'rounded-full border px-4 py-2 text-sm font-medium',
              view === v ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface'
            )}
          >
            {v === 'liste' ? 'Liste' : v === 'woche' ? 'Woche' : 'Monat'}
          </button>
        ))}
        {view === 'woche' ? (
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setWeekAnchor(addDays(weekAnchor, -7))}>
              ←
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setWeekAnchor(new Date())}>
              Heute
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setWeekAnchor(addDays(weekAnchor, 7))}>
              →
            </Button>
          </div>
        ) : null}
        {view === 'monat' ? (
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1))}
            >
              ←
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setMonthAnchor(new Date())}>
              Heute
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1))}
            >
              →
            </Button>
          </div>
        ) : null}
      </div>

      {view === 'liste' ? (
        <div className="space-y-6 md:hidden">
          {groupedListe.length === 0 ? (
            <p className="text-sm text-muted">Keine Termine.</p>
          ) : (
            groupedListe.map((g) => (
              <section key={g.key}>
                <h2 className="mb-2 text-sm font-semibold text-muted">{g.key}</h2>
                <ul className="space-y-2">
                  {g.items.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        className="w-full rounded-lg border border-border bg-surface p-3 text-left"
                        onClick={() => openEdit(t)}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="rounded px-2 py-0.5 text-xs font-medium text-ink"
                            style={{ backgroundColor: KALENDER_TYP_BG[t.typ] ?? KALENDER_TYP_BG.sonstiges }}
                          >
                            {typLabel(t.typ)}
                          </span>
                          <span className="text-xs text-muted">{formatDatum(t.datum)}</span>
                          {zeitSpanne(t) ? (
                            <span className="text-xs text-muted">{zeitSpanne(t)}</span>
                          ) : null}
                        </div>
                        <p className="mt-1 font-medium text-ink">{t.titel}</p>
                        {verknuepfungLabel(t) ? (
                          <p className="text-xs text-muted">{verknuepfungLabel(t)}</p>
                        ) : null}
                        {t.adresse ? <p className="text-xs text-muted">{t.adresse}</p> : null}
                        <label className="mt-2 flex items-center gap-2 text-sm" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={t.erledigt}
                            onChange={() => void toggleErledigt(t)}
                            aria-label="Erledigt"
                          />
                          Erledigt
                        </label>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      ) : null}

      {view === 'liste' ? (
        <Card className="hidden overflow-hidden p-0 md:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-canvas text-muted">
                <th className="px-3 py-2 font-medium">Datum</th>
                <th className="px-3 py-2 font-medium">Zeit</th>
                <th className="px-3 py-2 font-medium">Titel</th>
                <th className="px-3 py-2 font-medium">Typ</th>
                <th className="px-3 py-2 font-medium">Verknüpfung</th>
                <th className="px-3 py-2 font-medium">Erledigt</th>
              </tr>
            </thead>
            <tbody>
              {termine.map((t) => (
                <tr
                  key={t.id}
                  className={cn(
                    'cursor-pointer border-b border-border hover:bg-canvas/80',
                    isToday(parseLocalDate(t.datum.slice(0, 10))) && 'bg-primary/5'
                  )}
                  onClick={() => openEdit(t)}
                >
                  <td className="px-3 py-2">{formatDatum(t.datum)}</td>
                  <td className="px-3 py-2">{zeitSpanne(t) || '—'}</td>
                  <td className="px-3 py-2 font-medium">{t.titel}</td>
                  <td className="px-3 py-2">
                    <span
                      className="rounded px-2 py-0.5 text-xs"
                      style={{ backgroundColor: KALENDER_TYP_BG[t.typ] }}
                    >
                      {typLabel(t.typ)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted">{verknuepfungLabel(t) ?? '—'}</td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={t.erledigt}
                      onChange={() => void toggleErledigt(t)}
                      aria-label="Erledigt"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      {view === 'woche' ? (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
          {weekDays.map((day) => {
            const list = termineForDay(day)
            const today = isToday(day)
            return (
              <Card
                key={day.toISOString()}
                className={cn('min-h-[200px] p-2', today && 'ring-2 ring-primary/40')}
              >
                <p className="mb-2 text-center text-xs font-semibold text-muted">
                  {day.toLocaleDateString('de-DE', { weekday: 'short' })}
                </p>
                <p className={cn('mb-2 text-center text-sm font-medium', today && 'text-primary')}>
                  {day.getDate()}.{day.getMonth() + 1}.
                </p>
                <ul className="space-y-1">
                  {list.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        className="w-full rounded border border-border px-1 py-1 text-left text-xs"
                        style={{ backgroundColor: KALENDER_TYP_BG[t.typ] }}
                        onClick={() => openEdit(t)}
                      >
                        <span className="block font-medium text-ink">{t.titel}</span>
                        {zeitSpanne(t) ? <span className="text-muted">{zeitSpanne(t)}</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            )
          })}
        </div>
      ) : null}

      {view === 'monat' ? (
        <Card className="p-3">
          <p className="mb-3 text-center font-semibold text-ink">
            {monthAnchor.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
          </p>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
              <div key={d} className="py-1 font-medium">
                {d}
              </div>
            ))}
            {monthGrid.map((day) => {
              const inMonth = day.getMonth() === monthAnchor.getMonth()
              const list = termineForDay(day)
              const today = isToday(day)
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'min-h-[72px] rounded border p-1 text-left',
                    inMonth ? 'border-border bg-surface' : 'border-transparent bg-canvas/50 text-muted',
                    today && 'ring-2 ring-primary/50'
                  )}
                >
                  <p className="text-xs font-medium">{day.getDate()}</p>
                  <ul className="mt-1 space-y-0.5">
                    {list.slice(0, 3).map((t) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          className="block w-full truncate rounded px-0.5 text-[10px] font-medium text-ink"
                          style={{ backgroundColor: KALENDER_TYP_BG[t.typ] }}
                          onClick={() => openEdit(t)}
                          title={t.titel}
                        >
                          {t.titel}
                        </button>
                      </li>
                    ))}
                    {list.length > 3 ? (
                      <li className="text-[10px] text-muted">+{list.length - 3}</li>
                    ) : null}
                  </ul>
                </div>
              )
            })}
          </div>
        </Card>
      ) : null}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-surface p-4 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">{editing ? 'Termin bearbeiten' : 'Neuer Termin'}</h2>
              <button
                type="button"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted hover:bg-canvas"
                onClick={() => setModalOpen(false)}
                aria-label="Schließen"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={submitForm} className="space-y-4">
              <Input label="Titel" value={fTitel} onChange={(e) => setFTitel(e.target.value)} required />
              <Select
                name="typ"
                label="Typ"
                value={fTyp}
                onChange={(e) => setFTyp(e.target.value as KalenderTermin['typ'])}
                options={TYP_OPTIONS}
              />
              <Input type="date" label="Datum" value={fDatum} onChange={(e) => setFDatum(e.target.value)} required />
              <Input type="time" label="Uhrzeit von" value={fVon} onChange={(e) => setFVon(e.target.value)} />
              <Input type="time" label="Uhrzeit bis" value={fBis} onChange={(e) => setFBis(e.target.value)} />
              <Input label="Adresse" value={fAdr} onChange={(e) => setFAdr(e.target.value)} />
              <Textarea label="Beschreibung" value={fDesc} onChange={(e) => setFDesc(e.target.value)} rows={3} />
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Lead suchen (optional)</label>
                <input
                  className="mb-1 w-full min-h-[44px] rounded-lg border border-border px-3"
                  value={leadQ}
                  onChange={(e) => setLeadQ(e.target.value)}
                  placeholder="Name …"
                />
                {leadHits.length > 0 ? (
                  <ul className="max-h-32 overflow-y-auto rounded border border-border text-sm">
                    {leadHits.map((h) => (
                      <li key={h.id}>
                        <button
                          type="button"
                          className="w-full px-2 py-2 text-left hover:bg-canvas"
                          onClick={() => {
                            setFLeadId(h.id)
                            setFAuftragId('')
                            setLeadQ(h.kontakt_name ?? h.id)
                          }}
                        >
                          {h.kontakt_name ?? h.id}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Auftrag suchen (optional)</label>
                <input
                  className="mb-1 w-full min-h-[44px] rounded-lg border border-border px-3"
                  value={auftragQ}
                  onChange={(e) => setAuftragQ(e.target.value)}
                  placeholder="Titel …"
                />
                {auftragHits.length > 0 ? (
                  <ul className="max-h-32 overflow-y-auto rounded border border-border text-sm">
                    {auftragHits.map((h) => (
                      <li key={h.id}>
                        <button
                          type="button"
                          className="w-full px-2 py-2 text-left hover:bg-canvas"
                          onClick={() => {
                            setFAuftragId(h.id)
                            setFLeadId('')
                            setAuftragQ(h.titel ?? h.kunden?.name ?? h.id)
                          }}
                        >
                          {h.titel ?? h.kunden?.name ?? h.id}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={fErledigt} onChange={(e) => setFErledigt(e.target.checked)} />
                Erledigt
              </label>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button type="submit" variant="primary" loading={pending} className="flex-1">
                  Speichern
                </Button>
                {editing ? (
                  <Button type="button" variant="danger" onClick={() => void onDelete()}>
                    Löschen
                  </Button>
                ) : null}
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                  Abbrechen
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
