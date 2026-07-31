'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import {
  buildDashboardZeitraumHref,
  DASHBOARD_ZEITRAUM_OPTIONS,
  dashboardZeitraumLabel,
  type DashboardZeitraumFilter,
  type DashboardZeitraumPreset,
} from '@/lib/dashboard/dashboard-analytics'
import { DateInput } from '@/components/ui/DateInput'
import { FilterRangeRow } from '@/components/ui/FilterRangeRow'
import { cn } from '@/lib/utils'

type Props = {
  filter: DashboardZeitraumFilter
}

const PRESETS = DASHBOARD_ZEITRAUM_OPTIONS.filter((o) => o.value !== 'benutzerdefiniert')

export function DashboardZeitraumFilterBar({ filter }: Props) {
  const router = useRouter()
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [customMode, setCustomMode] = useState(filter.preset === 'benutzerdefiniert')
  const [draftVon, setDraftVon] = useState(filter.von)
  const [draftBis, setDraftBis] = useState(filter.bis)
  const rootRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    setDraftVon(filter.von)
    setDraftBis(filter.bis)
    setCustomMode(filter.preset === 'benutzerdefiniert')
  }, [filter.von, filter.bis, filter.preset])

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node
      if (rootRef.current?.contains(t)) return
      // Bottom-Sheet liegt im Portal außerhalb von rootRef
      const sheet = document.getElementById(panelId)
      if (sheet?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, panelId])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    const mq = window.matchMedia('(max-width: 767px)')
    if (mq.matches) document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  function navigate(next: DashboardZeitraumFilter) {
    router.replace(buildDashboardZeitraumHref(next))
  }

  function selectPreset(preset: DashboardZeitraumPreset) {
    if (preset === 'benutzerdefiniert') {
      setCustomMode(true)
      return
    }
    setCustomMode(false)
    setOpen(false)
    navigate({ preset, von: '', bis: '' })
  }

  function applyCustomRange() {
    if (!draftVon.trim() || !draftBis.trim()) return
    setOpen(false)
    navigate({
      preset: 'benutzerdefiniert',
      von: draftVon,
      bis: draftBis,
    })
  }

  const label = dashboardZeitraumLabel(filter)

  const panel = (
    <div className="dash-zeitraum-panel">
      <p className="dash-zeitraum-panel__title">Zeitraum</p>
      <div className="dash-zeitraum-panel__list" role="listbox" aria-label="Zeitraum wählen">
        {PRESETS.map((o) => {
          const active = !customMode && filter.preset === o.value
          return (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={active}
              className={cn('dash-zeitraum-panel__item', active && 'is-active')}
              onClick={() => selectPreset(o.value)}
            >
              {o.label}
            </button>
          )
        })}
        <button
          type="button"
          role="option"
          aria-selected={customMode}
          className={cn('dash-zeitraum-panel__item', customMode && 'is-active')}
          onClick={() => setCustomMode(true)}
        >
          <Calendar className="h-4 w-4 shrink-0" aria-hidden />
          Individuell
        </button>
      </div>

      {customMode ? (
        <div className="dash-zeitraum-panel__custom">
          <FilterRangeRow
            title="Zeitraum"
            className="!mb-3"
            von={
              <DateInput
                size="sm"
                value={draftVon}
                onChange={(e) => setDraftVon(e.target.value)}
              />
            }
            bis={
              <DateInput
                size="sm"
                value={draftBis}
                min={draftVon || undefined}
                onChange={(e) => setDraftBis(e.target.value)}
              />
            }
          />
          <div className="dash-zeitraum-panel__actions">
            <button type="button" className="btn ghost sm" onClick={() => setOpen(false)}>
              Abbrechen
            </button>
            <button
              type="button"
              className="btn primary sm"
              disabled={!draftVon.trim() || !draftBis.trim()}
              onClick={applyCustomRange}
            >
              Anwenden
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )

  return (
    <div className="dash-zeitraum relative min-w-0 shrink-0" ref={rootRef}>
      <button
        type="button"
        className={cn('btn sm icon ghost dash-zeitraum-trigger', open && 'is-open')}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        aria-label={`Zeitraum: ${label}`}
        title={`Zeitraum: ${label}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
      </button>

      {/* Desktop: Popover */}
      {open ? (
        <div
          id={`${panelId}-desktop`}
          className="dash-zeitraum-popover absolute right-0 top-[calc(100%+8px)] z-sidepanel-pop hidden md:block"
          role="dialog"
          aria-label="Zeitraum filtern"
        >
          {panel}
        </div>
      ) : null}

      {/* Mobil: Bottom-Sheet */}
      {open && mounted
        ? createPortal(
            <>
              <button
                type="button"
                className="dash-zeitraum-scrim z-sidepanel md:hidden"
                aria-label="Filter schließen"
                onClick={() => setOpen(false)}
              />
              <div
                id={panelId}
                className="dash-zeitraum-sheet z-modal md:hidden"
                role="dialog"
                aria-modal="true"
                aria-label="Zeitraum filtern"
              >
                <div className="dash-zeitraum-sheet__handle" aria-hidden>
                  <span />
                </div>
                {panel}
              </div>
            </>,
            document.body
          )
        : null}
    </div>
  )
}
