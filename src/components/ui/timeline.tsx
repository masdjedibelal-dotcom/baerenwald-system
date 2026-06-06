'use client'

import { cn } from '@/lib/utils'

export type TimelineItem = {
  id?: string
  text: string
  time: string
  /** offen = grauer Punkt, sonst grün (erledigt/aktiv) */
  state?: 'open' | 'done' | 'active'
  linkLabel?: string
  onLinkClick?: () => void
}

export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  if (!items.length) {
    return <p className="text-sm text-bw-text-muted">Keine Aktivität.</p>
  }

  return (
    <div className={cn('timeline', className)}>
      {items.map((item, i) => {
        const dotCls =
          item.state === 'open'
            ? 'timeline-dot-pending'
            : item.state === 'active'
              ? 'timeline-dot-active'
              : 'timeline-dot-done'
        return (
          <div key={item.id ?? i} className="timeline-item last:pb-0">
            <span className={dotCls} aria-hidden />
            <p className="text-[13px] leading-snug text-bw-text">{item.text}</p>
            {item.linkLabel && item.onLinkClick ? (
              <button
                type="button"
                onClick={item.onLinkClick}
                className="mt-1 text-xs font-medium text-bw-green hover:underline"
              >
                {item.linkLabel}
              </button>
            ) : null}
            <p className="mt-0.5 text-xs text-bw-text-muted">{item.time}</p>
          </div>
        )
      })}
    </div>
  )
}
