'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { createClient } from '@/lib/supabase'
import type { KalenderTermin } from '@/lib/types'
import { toast } from '@/components/ui/app-toast'
import { cn } from '@/lib/utils'
import { TodosPanel } from '@/components/todos/TodosPanel'
import {
  formatHm,
  KalenderAddButton,
  KalenderTerminEditorSheet,
  typToKat,
  type KalenderTerminEditorPrefill,
} from '@/components/kalender/KalenderTerminEditorSheet'

type UiView = 'tag' | 'woche' | 'monat'
type UiMode = 'kalender' | 'todos'

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7) // 7–19
const HOUR_PX = 52
const DOW = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
  const [mode, setMode] = useState<UiMode>('kalender')
  const [cursor, setCursor] = useState(() => new Date())

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<KalenderTermin | null>(null)
  const [editorPrefill, setEditorPrefill] = useState<KalenderTerminEditorPrefill | null>(null)
  const [startInEdit, setStartInEdit] = useState(false)

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

  function openNeu(prefill?: KalenderTerminEditorPrefill) {
    setEditing(null)
    setEditorPrefill(prefill ?? null)
    setStartInEdit(false)
    setModalOpen(true)
  }

  function openDetail(t: KalenderTermin) {
    setEditing(t)
    setEditorPrefill(null)
    setStartInEdit(false)
    setModalOpen(true)
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
    <div className="cal-toolbar toolbar">
      <div className="cal-toolbar__nav">
        <MockBtn
          sm
          icon="chevron-left"
          className="cal-toolbar__arrow"
          onClick={navPrev}
          title="Zurück"
        />
        <div className="cal-toolbar__title">{titleText}</div>
        <MockBtn
          sm
          icon="chevron-right"
          className="cal-toolbar__arrow"
          onClick={navNext}
          title="Weiter"
        />
      </div>
      <div className="cal-toolbar__controls">
        <div className="cal-toolbar__views" role="group" aria-label="Ansicht">
          <button
            type="button"
            className={cn('cal-toolbar__view', view === 'tag' && 'is-active')}
            onClick={() => setView('tag')}
            aria-label="Tag"
            aria-pressed={view === 'tag'}
          >
            Tag
          </button>
          <button
            type="button"
            className={cn('cal-toolbar__view', view === 'woche' && 'is-active')}
            onClick={() => setView('woche')}
            aria-label="Woche"
            aria-pressed={view === 'woche'}
          >
            Woche
          </button>
          <button
            type="button"
            className={cn('cal-toolbar__view', view === 'monat' && 'is-active')}
            onClick={() => setView('monat')}
            aria-label="Monat"
            aria-pressed={view === 'monat'}
          >
            Monat
          </button>
        </div>
        <MockBtn sm className="cal-toolbar__heute" onClick={goToday}>
          Heute
        </MockBtn>
        <KalenderAddButton onClick={() => openNeu()} />
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

  return (
    <div>
      <div className="kalender-mode-seg" role="tablist" aria-label="Kalender oder To-dos">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'kalender'}
          className={cn('kalender-mode-seg__btn', mode === 'kalender' && 'on')}
          onClick={() => setMode('kalender')}
        >
          Kalender
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'todos'}
          className={cn('kalender-mode-seg__btn', mode === 'todos' && 'on')}
          onClick={() => setMode('todos')}
        >
          To-dos
        </button>
      </div>

      {mode === 'todos' ? (
        <TodosPanel title="To-dos" />
      ) : (
        <>
      {nav}

      {loadErr ? (
        <p className="mb-3 rounded-lg border border-status-cancel-bg bg-status-cancel-bg/10 px-3 py-2 text-[length:var(--fs-text)] text-status-cancel-text">
          {loadErr}
        </p>
      ) : null}

      {view === 'monat' ? monthView : timeView}

      <KalenderTerminEditorSheet
        open={modalOpen}
        termin={editing}
        prefill={editorPrefill}
        startInEdit={startInEdit}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
          setEditorPrefill(null)
          setStartInEdit(false)
        }}
        onSaved={() => {
          setEditing(null)
          setEditorPrefill(null)
          setStartInEdit(false)
          void load()
        }}
      />
        </>
      )}
    </div>
  )
}
