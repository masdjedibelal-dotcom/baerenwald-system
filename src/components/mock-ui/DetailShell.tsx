'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import type { MockIconName } from '@/lib/mock-icons'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/lib/utils'

export type DetailShellGroup = {
  id: string
  label: string
  icon: MockIconName | string
  count?: number
  render: () => ReactNode
}

export type DetailShellProps = {
  groups: DetailShellGroup[]
  value: string
  onChange: (id: string) => void
  className?: string
}

/**
 * Mock-DetailShell: Desktop = Nav links + Inhalt.
 * Mobile = Drill-Down (Abschnittsliste → Screen 2 mit Zurück) · S5 / S10.
 */
export function DetailShell({ groups, value, onChange, className }: DetailShellProps) {
  const isMobile = useIsMobile()
  const active = groups.find((g) => g.id === value) ?? groups[0]
  const [listMode, setListMode] = useState(true)
  const historyPushed = useRef(false)
  const skipValueOpen = useRef(false)
  const initialized = useRef(false)
  const titleId = useId()
  const bodyRef = useRef<HTMLDivElement>(null)

  /* Tab-Wechsel: Scroll nach oben (Welle 3) */
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.scrollTop = 0
    try {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    } catch {
      window.scrollTo(0, 0)
    }
  }, [value])

  /* Deep-Link / programmatischer Tab-Wechsel → Screen 2 */
  useEffect(() => {
    if (!isMobile) {
      setListMode(true)
      return
    }
    if (!initialized.current) {
      initialized.current = true
      try {
        const q = new URLSearchParams(window.location.search)
        if (q.get('tab') || q.get('section') || q.get('bereich')) {
          setListMode(false)
        }
      } catch {
        /* ignore */
      }
      return
    }
    if (skipValueOpen.current) {
      skipValueOpen.current = false
      return
    }
    setListMode(false)
  }, [value, isMobile])

  /* S10: Browser-Back schließt Drill-Down Screen 2 */
  useEffect(() => {
    if (!isMobile || listMode) {
      if (historyPushed.current) {
        historyPushed.current = false
        window.history.back()
      }
      return
    }
    const key = `dshell-drill:${titleId}`
    window.history.pushState({ [key]: true }, '')
    historyPushed.current = true
    const onPop = () => {
      historyPushed.current = false
      skipValueOpen.current = true
      setListMode(true)
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (historyPushed.current) {
        historyPushed.current = false
        window.history.back()
      }
    }
  }, [isMobile, listMode, titleId])

  function openSection(id: string) {
    onChange(id)
    if (isMobile) setListMode(false)
  }

  function goBackToList() {
    skipValueOpen.current = true
    setListMode(true)
    if (historyPushed.current) {
      historyPushed.current = false
      window.history.back()
    }
  }

  if (isMobile && listMode) {
    return (
      <div className={cn('dshell dshell--drill-list', className)}>
        <nav className="dshell-drill-nav" aria-label="Bereiche">
          {groups.map((gr) => (
            <button
              key={gr.id}
              type="button"
              className="dshell-drill-row"
              onClick={() => openSection(gr.id)}
            >
              <MockIcon ctx="nav" n={gr.icon} size={18} />
              <span className="dshell-drill-row__label">{gr.label}</span>
              {gr.count != null ? <span className="dshell-count">{gr.count}</span> : null}
              <span className="dshell-drill-row__chev" aria-hidden>
                ›
              </span>
            </button>
          ))}
        </nav>
      </div>
    )
  }

  return (
    <div className={cn('dshell', isMobile && 'dshell--drill-detail', className)}>
      {isMobile ? (
        <div className="dshell-drill-head">
          <button type="button" className="dshell-drill-back" onClick={goBackToList}>
            <ChevronLeft size={20} strokeWidth={2} aria-hidden />
            Zurück
          </button>
          <h2 className="dshell-drill-title">{active?.label ?? ''}</h2>
        </div>
      ) : (
        <nav className="dshell-nav" aria-label="Bereiche" role="tablist">
          {groups.map((gr) => {
            const isActive = (active?.id ?? value) === gr.id
            return (
              <button
                key={gr.id}
                type="button"
                role="tab"
                className={cn('dshell-navitem', isActive && 'active')}
                onClick={() => openSection(gr.id)}
                aria-selected={isActive}
              >
                <MockIcon ctx="nav" n={gr.icon} size={16} />
                <span>{gr.label}</span>
                {gr.count != null ? <span className="dshell-count">{gr.count}</span> : null}
              </button>
            )
          })}
        </nav>
      )}
      <div className="dshell-body" ref={bodyRef}>
        <div className="dshell-group active">
          <div className="dshell-cards">{active ? active.render() : null}</div>
        </div>
      </div>
    </div>
  )
}
