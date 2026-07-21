'use client'

import { useEffect, useRef, useState } from 'react'
import { Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  buildDashboardZeitraumHref,
  DASHBOARD_ZEITRAUM_OPTIONS,
  type DashboardZeitraumFilter,
  type DashboardZeitraumPreset,
} from '@/lib/dashboard/dashboard-analytics'
import { LIST_FILTER_SELECT_CLASS } from '@/lib/list-filter-ui'
import { cn } from '@/lib/utils'

type Props = {
  filter: DashboardZeitraumFilter
}

export function DashboardZeitraumFilterBar({ filter }: Props) {
  const router = useRouter()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [draftVon, setDraftVon] = useState(filter.von)
  const [draftBis, setDraftBis] = useState(filter.bis)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDraftVon(filter.von)
    setDraftBis(filter.bis)
  }, [filter.von, filter.bis])

  useEffect(() => {
    if (!pickerOpen) return
    function onDocClick(e: MouseEvent) {
      if (!popoverRef.current?.contains(e.target as Node)) setPickerOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPickerOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [pickerOpen])

  function navigate(next: DashboardZeitraumFilter) {
    router.replace(buildDashboardZeitraumHref(next))
  }

  function selectPreset(preset: DashboardZeitraumPreset) {
    if (preset === 'benutzerdefiniert') {
      setPickerOpen(true)
      return
    }
    setPickerOpen(false)
    navigate({ preset, von: '', bis: '' })
  }

  function applyCustomRange() {
    if (!draftVon.trim() || !draftBis.trim()) return
    setPickerOpen(false)
    navigate({
      preset: 'benutzerdefiniert',
      von: draftVon,
      bis: draftBis,
    })
  }

  const individuellActive =
    filter.preset === 'benutzerdefiniert' && Boolean(filter.von && filter.bis)

  return (
    <div className="relative" ref={popoverRef}>
      <div className="seg" role="group" aria-label="Zeitraum">
        {DASHBOARD_ZEITRAUM_OPTIONS.filter((o) => o.value !== 'benutzerdefiniert').map((o) => (
          <button
            key={o.value}
            type="button"
            className={filter.preset === o.value ? 'on' : undefined}
            onClick={() => selectPreset(o.value)}
          >
            {o.label}
          </button>
        ))}
        <button
          type="button"
          className={cn(
            individuellActive || pickerOpen ? 'on' : undefined,
            'inline-flex items-center gap-1.5'
          )}
          onClick={() => setPickerOpen((v) => !v)}
          aria-expanded={pickerOpen}
        >
          <Calendar className="h-3.5 w-3.5" aria-hidden />
          Individuell
        </button>
      </div>

      {pickerOpen ? (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-30 w-[min(100vw-2rem,320px)] rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 shadow-lg"
          role="dialog"
          aria-label="Individueller Zeitraum"
        >
          <p className="mb-2 text-[12px] font-semibold text-[var(--text)]">Zeitraum wählen</p>
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1 text-[11.5px] text-[var(--text-3)]">
              Von
              <input
                type="date"
                value={draftVon}
                onChange={(e) => setDraftVon(e.target.value)}
                className={LIST_FILTER_SELECT_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11.5px] text-[var(--text-3)]">
              Bis
              <input
                type="date"
                value={draftBis}
                min={draftVon || undefined}
                onChange={(e) => setDraftBis(e.target.value)}
                className={LIST_FILTER_SELECT_CLASS}
              />
            </label>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setPickerOpen(false)}
            >
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
}
