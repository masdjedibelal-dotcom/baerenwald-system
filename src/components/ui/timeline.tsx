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
}

/** Mock-Timeline: `.timeline` + `.tl-item` (+ `.gray` für offen). */
export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  if (!items.length) {
    return <p className="text-sm text-bw-text-muted">Keine Aktivität.</p>
  }

  return (
    <div className={cn('timeline', className)}>
      {items.map((item, i) => {
        const isOpen = item.state === 'open'
        return (
          <div key={item.id ?? i} className={cn('tl-item', isOpen && 'gray')}>
            <div className="tl-text">{item.text}</div>
            {item.linkLabel && item.onLinkClick ? (
              <button
                type="button"
                onClick={item.onLinkClick}
                className="link"
                style={{ display: 'block', fontSize: 12, marginTop: 2, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
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
