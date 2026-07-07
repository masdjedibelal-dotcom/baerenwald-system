'use client'

import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ListCardProps {
  title: string
  badge?: ReactNode
  subtitle?: string
  meta?: string
  tags?: string[]
  onClick?: () => void
  actions?: ReactNode
  active?: boolean
  className?: string
}

export function ListCard({
  title,
  badge,
  subtitle,
  meta,
  tags,
  onClick,
  actions,
  active = false,
  className = '',
}: ListCardProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      className={cn(
        'flex min-h-[64px] items-center gap-3 border-b border-bw-border px-4 py-3 transition-colors duration-150',
        onClick && 'cursor-pointer hover:bg-bw-hover',
        active && 'bg-bw-green-bg',
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-2">
          <span className="flex-1 truncate text-sm font-medium text-bw-text">{title}</span>
          {badge ? <div className="flex-shrink-0">{badge}</div> : null}
        </div>
        {subtitle ? <div className="mb-0.5 truncate text-xs text-bw-text-muted">{subtitle}</div> : null}
        {(tags?.length || meta) ? (
          <div className="flex flex-wrap items-center gap-2">
            {tags?.map((tag, i) => (
              <span
                key={`${tag}-${i}`}
                className="rounded-full bg-bw-hover px-2 py-0.5 text-xs text-bw-text-muted"
              >
                {tag}
              </span>
            ))}
            {meta ? <span className="text-xs text-bw-text-muted">{meta}</span> : null}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      ) : onClick ? (
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-bw-border" aria-hidden />
      ) : null}
    </div>
  )
}
