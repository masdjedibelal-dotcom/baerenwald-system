'use client'

import { cn } from '@/lib/utils'

export type TimelineItem = {
  id?: string
  text: string
  time: string
  /** offen = grauer Punkt (`tl-item gray`), sonst grün */
  state?: 'open' | 'done' | 'active'
  linkLabel?: string
  onLinkClick?: () => void
  /** Zeile öffnet Inspect-Pop-up */
  inspectable?: boolean
  onClick?: () => void
}

/** Mock-Timeline: `.timeline` + `.tl-item` (+ `.gray` für offen). */
export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  if (!items.length) {
    return <p className="text-[length:var(--fs-text)] text-bw-text-muted">Keine Aktivität.</p>
  }

  return (
    <div className={cn('timeline', className)}>
      {items.map((item, i) => {
        const isOpen = item.state === 'open'
        const clickable = Boolean(item.inspectable && item.onClick && !isOpen)
        return (
          <div
            key={item.id ?? i}
            className={cn('tl-item', isOpen && 'gray', clickable && 'tl-clickable')}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={
              clickable
                ? () => {
                    item.onClick?.()
                  }
                : undefined
            }
            onKeyDown={
              clickable
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      item.onClick?.()
                    }
                  }
                : undefined
            }
          >
            <div className="tl-text">
              {item.text}
              {clickable ? <span className="tl-inspect-hint">Ansehen</span> : null}
            </div>
            {item.linkLabel && item.onLinkClick ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  item.onLinkClick?.()
                }}
                className="link"
                style={{
                  display: 'block',
                  fontSize: 'var(--fs-meta)',
                  marginTop: 2,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                {item.linkLabel}
              </button>
            ) : null}
            <div className="tl-time">{item.time}</div>
          </div>
        )
      })}
    </div>
  )
}
