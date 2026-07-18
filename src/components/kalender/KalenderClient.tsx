'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { createClient } from '@/lib/supabase'
import type { KalenderTermin } from '@/lib/types'
import { toast } from '@/components/ui/app-toast'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import {
  deleteKalenderTermin,
  saveKalenderTermin,
} from '@/app/(dashboard)/kalender/actions'
import { KALENDER_TYP_LABEL } from '@/lib/kalender-styles'

type UiView = 'tag' | 'woche' | 'monat'

/** Mock-Farben: green / blue / yellow */
type MockKat = 'green' | 'blue' | 'yellow'

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7) // 7–19
const HOUR_PX = 52
const DOW = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const

const KAT_OPTIONS: { value: MockKat; label: string; typ: KalenderTermin['typ'] }[] = [
  { value: 'green', label: 'Vor-Ort / Arbeit', typ: 'besichtigung' },
  { value: 'blue', label: 'Kontakt / Kickoff', typ: 'sonstiges' },
  { value: 'yellow', label: 'Abnahme', typ: 'abnahme' },
]

function typToKat(typ: KalenderTermin['typ']): MockKat {
  if (typ === 'abnahme') return 'yellow'
  if (typ === 'sonstiges' || typ === 'intern') return 'blue'
  return 'green'
}

function katToTyp(kat: MockKat): KalenderTermin['typ'] {
  return KAT_OPTIONS.find((k) => k.value === kat)?.typ ?? 'besichtigung'
}

function katLabel(kat: MockKat): string {
  return KAT_OPTIONS.find((k) => k.value === kat)?.label ?? 'Vor-Ort / Arbeit'
}

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseYmd(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(y!, m! - 1, d!, 12, 0, 0)
}

function startOfWeek(d: Date): Date {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7 // Mo=0
  x.setDate(x.getDate() - day)
  x.setHours(12, 0, 0, 0)
  return x
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function monthTitle(d: Date): string {
  return d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

function dayTitle(d: Date): string {
  return d.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function timeToHours(t: string | null | undefined): number | null {
  if (!t?.trim()) return null
  const [h, m] = t.trim().slice(0, 5).split(':').map(Number)
  if (!Number.isFinite(h)) return null
  return h! + (Number.isFinite(m) ? m! / 60 : 0)
}

function formatHm(t: string | null | undefined): string {
  if (!t?.trim()) return ''
  return t.trim().slice(0, 5)
}

function normalizeTimeInput(t: string): string | null {
  const v = t.trim()
  if (!v) return null
  if (/^\d{2}:\d{2}$/.test(v)) return `${v}:00`
  if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return v
  return v
}

function hourTop(v: number): number {
  return (v - HOURS[0]!) * HOUR_PX
}

function buildMonthCells(anchor: Date): { date: Date; muted: boolean }[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12)
  const start = startOfWeek(first)
  const cells: { date: Date; muted: boolean }[] = []
  for (let i = 0; i < 42; i++) {
    const date = addDays(start, i)
    cells.push({ date, muted: date.getMonth() !== anchor.getMonth() })
  }
  return cells
}

export function KalenderClient() {
  const supabase = createClient()
  const [termine, setTermine] = useState<KalenderTermin[]>([])
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [view, setView] = useState<UiView>('monat')
  const [cursor, setCursor] = useState(() => new Date())
  const [pending, startTransition] = useTransition()

  const [modalOpen, setModalOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editing, setEditing] = useState<KalenderTermin | null>(null)

  const [fTitel, setFTitel] = useState('')
  const [fKat, setFKat] = useState<MockKat>('green')
  const [fDatum, setFDatum] = useState('')
  const [fVon, setFVon] = useState('09:00')
  const [fBis, setFBis] = useState('10:00')
  const [fOrt, setFOrt] = useState('')
  const [fDesc, setFDesc] = useState('')

  const todayYmd = ymd(new Date())

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

  const byDay = useMemo(() => {
    const m = new Map<string, KalenderTermin[]>()
    for (const t of termine) {
      if (t.erledigt) continue
      const key = t.datum.slice(0, 10)
      const arr = m.get(key) ?? []
      arr.push(t)
      m.set(key, arr)
    }
    for (const [, arr] of Array.from(m.entries())) {
      arr.sort((a: KalenderTermin, b: KalenderTermin) =>
        (a.uhrzeit_von ?? '').localeCompare(b.uhrzeit_von ?? '')
      )
    }
    return m
  }, [termine])

  function openNeu(prefill?: { day?: Date; startHour?: number }) {
    setEditing(null)
    setDetailOpen(false)
    const d = prefill?.day ?? cursor
    setFTitel('')
    setFKat('green')
    setFDatum(ymd(d))
    const sh = prefill?.startHour
    if (sh != null) {
      const von = `${String(Math.floor(sh)).padStart(2, '0')}:${sh % 1 ? '30' : '00'}`
      const bisH = sh + 1
      const bis = `${String(Math.floor(bisH)).padStart(2, '0')}:${bisH % 1 ? '30' : '00'}`
      setFVon(von)
      setFBis(bis)
    } else {
      setFVon('09:00')
      setFBis('10:00')
    }
    setFOrt('')
    setFDesc('')
    setModalOpen(true)
  }

  function openEdit(t: KalenderTermin) {
    setEditing(t)
    setDetailOpen(false)
    setFTitel(t.titel)
    setFKat(typToKat(t.typ))
    setFDatum(t.datum.slice(0, 10))
    setFVon(formatHm(t.uhrzeit_von) || '09:00')
    setFBis(formatHm(t.uhrzeit_bis) || '10:00')
    setFOrt(t.adresse ?? '')
    setFDesc(t.beschreibung ?? '')
    setModalOpen(true)
  }

  function openDetail(t: KalenderTermin) {
    setEditing(t)
    setDetailOpen(true)
    setModalOpen(false)
  }

  function navPrev() {
    setCursor((c) => {
      if (view === 'monat') return new Date(c.getFullYear(), c.getMonth() - 1, 1, 12)
      if (view === 'woche') return addDays(c, -7)
      return addDays(c, -1)
    })
  }

  function navNext() {
    setCursor((c) => {
      if (view === 'monat') return new Date(c.getFullYear(), c.getMonth() + 1, 1, 12)
      if (view === 'woche') return addDays(c, 7)
      return addDays(c, 1)
    })
  }

  function goToday() {
    setCursor(new Date())
  }

  function submitForm(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await saveKalenderTermin({
        id: editing?.id,
        titel: fTitel,
        typ: katToTyp(fKat),
        datum: fDatum,
        uhrzeit_von: normalizeTimeInput(fVon),
        uhrzeit_bis: normalizeTimeInput(fBis),
        adresse: fOrt.trim() || null,
        beschreibung: fDesc.trim() || null,
        lead_id: editing?.lead_id ?? null,
        auftrag_id: editing?.auftrag_id ?? null,
        zugewiesen_an: editing?.zugewiesen_an ?? null,
        erledigt: editing?.erledigt ?? false,
      })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success(editing ? 'Termin gespeichert' : `Termin „${fTitel.trim() || 'Neuer Termin'}“ angelegt`)
      setModalOpen(false)
      setEditing(null)
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
    setDetailOpen(false)
    setEditing(null)
    await load()
  }

  const titleText = view === 'tag' ? dayTitle(cursor) : monthTitle(cursor)

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor)
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i)
      return {
        date,
        dow: DOW[i]!,
        d: date.getDate(),
        today: ymd(date) === todayYmd,
      }
    })
  }, [cursor, todayYmd])

  const dayCols = view === 'tag' ? [weekDays.find((d) => ymd(d.date) === ymd(cursor)) ?? weekDays[0]!] : weekDays

  const monthCells = useMemo(() => buildMonthCells(cursor), [cursor])

  const nav = (
    <div className="toolbar">
      <MockBtn sm icon="chevron-left" onClick={navPrev} title="Zurück" />
      <div style={{ fontSize: 16, fontWeight: 600, padding: '0 8px' }}>{titleText}</div>
      <MockBtn sm icon="chevron-right" onClick={navNext} title="Weiter" />
      <MockBtn sm onClick={goToday}>
        Heute
      </MockBtn>
      <MockBtn sm kind="primary" icon="plus" onClick={() => openNeu()}>
        Neuer Termin
      </MockBtn>
      <div style={{ flex: 1 }} />
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: 2,
          background: 'var(--card)',
          border: '0.5px solid var(--border)',
          borderRadius: 6,
        }}
      >
        <MockBtn sm kind={view === 'tag' ? 'primary' : 'ghost'} onClick={() => setView('tag')}>
          Tag
        </MockBtn>
        <MockBtn sm kind={view === 'woche' ? 'primary' : 'ghost'} onClick={() => setView('woche')}>
          Woche
        </MockBtn>
        <MockBtn sm kind={view === 'monat' ? 'primary' : 'ghost'} onClick={() => setView('monat')}>
          Monat
        </MockBtn>
      </div>
    </div>
  )

  function renderEventChip(t: KalenderTermin, onClick: (e: React.MouseEvent) => void) {
    const kat = typToKat(t.typ)
    return (
      <div
        key={t.id}
        className={cn('cal-evt', kat)}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick(e as unknown as React.MouseEvent)
          }
        }}
      >
        {t.titel}
      </div>
    )
  }

  const monthView = (
    <div className="cal-grid">
      {DOW.map((d) => (
        <div key={d} className="cal-head">
          {d}
        </div>
      ))}
      {monthCells.map((c, i) => {
        const key = ymd(c.date)
        const isToday = !c.muted && key === todayYmd
        const evs = c.muted ? [] : byDay.get(key) ?? []
        const shown = evs.slice(0, 3)
        const more = evs.length - shown.length
        return (
          <div
            key={i}
            className={cn('cal-cell', c.muted && 'muted', isToday && 'today')}
            onClick={() => {
              if (!c.muted) openNeu({ day: c.date })
            }}
          >
            <div className="day-num">{c.date.getDate()}</div>
            {shown.map((t) =>
              renderEventChip(t, (ev) => {
                ev.stopPropagation()
                openDetail(t)
              })
            )}
            {more > 0 ? (
              <div className="cal-evt" style={{ background: 'transparent', color: 'var(--text-3)' }}>
                +{more} mehr
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )

  const gridCols = `56px ${dayCols.map(() => '1fr').join(' ')}`

  const timeView = (
    <div className="tg">
      <div className="tg-head" style={{ gridTemplateColumns: gridCols }}>
        <div className="tg-corner" />
        {dayCols.map((c) => (
          <div key={ymd(c.date)} className={cn('tg-daycol', (c.today || view === 'tag') && 'today')}>
            <div className="dow">{c.dow}</div>
            <div className="dnum">{c.d}</div>
          </div>
        ))}
      </div>
      <div className="tg-body">
        <div className="tg-rows" style={{ display: 'grid', gridTemplateColumns: gridCols }}>
          <div className="tg-timecol">
            {HOURS.map((h) => (
              <div key={h} className="tg-hour">
                <span className="tg-hlabel">{String(h).padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>
          {dayCols.map((c) => {
            const key = ymd(c.date)
            const evs = byDay.get(key) ?? []
            return (
              <div key={key} className="tg-col" style={{ position: 'relative' }}>
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="tg-hour"
                    onClick={() => openNeu({ day: c.date, startHour: h })}
                  />
                ))}
                {evs.map((t) => {
                  const start = timeToHours(t.uhrzeit_von) ?? 9
                  const end = timeToHours(t.uhrzeit_bis) ?? start + 1
                  const kat = typToKat(t.typ)
                  const top = hourTop(Math.max(HOURS[0]!, Math.min(start, HOURS[HOURS.length - 1]!)))
                  const height = Math.max(24, (Math.max(end, start + 0.5) - start) * HOUR_PX - 4)
                  return (
                    <div
                      key={t.id}
                      className={cn('tg-event', kat)}
                      style={{ top, height }}
                      onClick={(e) => {
                        e.stopPropagation()
                        openDetail(t)
                      }}
                    >
                      <div className="te-t">{t.titel}</div>
                      <div className="te-s">
                        {[formatHm(t.uhrzeit_von), t.adresse?.trim()].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  const detailKat = editing ? typToKat(editing.typ) : 'green'
  const detailDot =
    detailKat === 'yellow' ? '#D9A800' : detailKat === 'blue' ? 'var(--blue-tx)' : 'var(--green)'
  const detailZeit =
    editing && (editing.uhrzeit_von || editing.uhrzeit_bis)
      ? `${formatHm(editing.uhrzeit_von)}${editing.uhrzeit_bis ? `–${formatHm(editing.uhrzeit_bis)}` : ''} Uhr`
      : ''

  return (
    <div>
      {nav}

      {loadErr ? (
        <p className="mb-3 rounded-lg border border-status-cancel-bg bg-status-cancel-bg/10 px-3 py-2 text-sm text-status-cancel-text">
          {loadErr}
        </p>
      ) : null}

      {view === 'monat' ? monthView : timeView}

      <Modal
        open={detailOpen && !!editing}
        onClose={() => {
          setDetailOpen(false)
          setEditing(null)
        }}
        title={editing?.titel ?? 'Termin'}
        size="md"
        footer={
          <div className="flex w-full items-center gap-2">
            <MockBtn
              sm
              kind="ghost"
              icon="pencil"
              onClick={() => {
                if (editing) openEdit(editing)
              }}
            >
              Bearbeiten
            </MockBtn>
            <MockBtn sm kind="danger" icon="trash" onClick={() => void onDelete()}>
              Löschen
            </MockBtn>
            <div style={{ flex: 1 }} />
            <MockBtn
              sm
              kind="primary"
              icon="x"
              onClick={() => {
                setDetailOpen(false)
                setEditing(null)
              }}
            >
              Schließen
            </MockBtn>
          </div>
        }
      >
        {editing ? (
          <div className="props">
            <div className="prop">
              <div className="prop-l">Kategorie</div>
              <div className="prop-v inline-flex items-center gap-1.5">
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 3,
                    background: detailDot,
                    display: 'inline-block',
                  }}
                />
                {katLabel(detailKat)}
                {editing.typ === 'beginn' || editing.typ === 'intern' ? (
                  <span className="text-[12px] text-[var(--text-3)]">
                    · {KALENDER_TYP_LABEL[editing.typ]}
                  </span>
                ) : null}
              </div>
            </div>
            {detailZeit ? (
              <div className="prop">
                <div className="prop-l">Zeit</div>
                <div className="prop-v">{detailZeit}</div>
              </div>
            ) : null}
            {editing.adresse?.trim() ? (
              <div className="prop">
                <div className="prop-l">Ort</div>
                <div className="prop-v">{editing.adresse}</div>
              </div>
            ) : null}
            {editing.beschreibung?.trim() ? (
              <div className="prop">
                <div className="prop-l">Notiz</div>
                <div className="prop-v">{editing.beschreibung}</div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Termin bearbeiten' : 'Neuer Termin'}
        size="md"
        footer={
          <div className="flex w-full items-center gap-2">
            <MockBtn sm kind="ghost" onClick={() => setModalOpen(false)}>
              Abbrechen
            </MockBtn>
            {editing ? (
              <MockBtn sm kind="danger" icon="trash" onClick={() => void onDelete()}>
                Löschen
              </MockBtn>
            ) : null}
            <div style={{ flex: 1 }} />
            <MockBtn
              sm
              kind="primary"
              icon="check"
              disabled={pending}
              onClick={() => {
                const form = document.getElementById('kalender-termin-form') as HTMLFormElement | null
                form?.requestSubmit()
              }}
            >
              {editing ? 'Speichern' : 'Termin anlegen'}
            </MockBtn>
          </div>
        }
      >
        <form id="kalender-termin-form" onSubmit={submitForm} className="form-grid">
          <div className="full">
            <Input
              label="Titel"
              value={fTitel}
              onChange={(e) => setFTitel(e.target.value)}
              placeholder="z.B. Vor-Ort Termin Koch"
              required
            />
          </div>
          <div className="full">
            <div className="mb-1 text-[12px] font-medium text-[var(--text-3)]">Kategorie</div>
            <div className="seg">
              {KAT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={cn(fKat === o.value && 'on')}
                  onClick={() => setFKat(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <Input type="date" label="Datum" value={fDatum} onChange={(e) => setFDatum(e.target.value)} required />
          <div />
          <Input type="time" label="Von" value={fVon} onChange={(e) => setFVon(e.target.value)} />
          <Input type="time" label="Bis" value={fBis} onChange={(e) => setFBis(e.target.value)} />
          <div className="full">
            <Input
              label="Ort"
              value={fOrt}
              onChange={(e) => setFOrt(e.target.value)}
              placeholder="Stadtteil / Adresse"
            />
          </div>
          {editing ? (
            <div className="full">
              <Textarea label="Beschreibung" value={fDesc} onChange={(e) => setFDesc(e.target.value)} rows={2} />
            </div>
          ) : null}
        </form>
      </Modal>
    </div>
  )
}
