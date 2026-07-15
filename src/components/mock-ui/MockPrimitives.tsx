'use client'

import type { ReactNode } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { cn } from '@/lib/utils'

export function MockChip({
  active,
  count,
  onClick,
  children,
  icon,
}: {
  active?: boolean
  count?: number
  onClick?: () => void
  children: ReactNode
  icon?: string
}) {
  return (
    <button type="button" className={cn('chip', active && 'active')} onClick={onClick}>
      {icon ? <MockIcon n={icon} size={14} /> : null}
      {children}
      {count != null ? <span className="chip-count">{count}</span> : null}
    </button>
  )
}

export function MockBtn({
  kind,
  sm,
  icon,
  onClick,
  children,
  title,
  type = 'button',
  disabled,
  className,
}: {
  kind?: 'primary' | 'ghost' | 'danger' | ''
  sm?: boolean
  icon?: string
  onClick?: () => void
  children?: ReactNode
  title?: string
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type={type}
      className={cn(
        'btn',
        kind || '',
        sm && 'sm',
        icon && !children && 'icon',
        className
      )}
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {icon ? <MockIcon n={icon} size={sm ? 14 : 15} /> : null}
      {children}
    </button>
  )
}

export function MockBadge({ kind, children }: { kind?: string; children: ReactNode }) {
  return <span className={cn('badge', kind || 'plain')}>{children}</span>
}

export function MockPager({
  pageIndex,
  totalPages,
  total,
  pageSize,
  unit,
  onPageChange,
}: {
  pageIndex: number
  totalPages: number
  total: number
  pageSize: number
  unit?: string
  onPageChange: (page: number) => void
}) {
  if (total === 0) return null

  const page = pageIndex + 1
  const from = pageIndex * pageSize + 1
  const to = Math.min((pageIndex + 1) * pageSize, total)

  const nums: Array<number | '…'> = []
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) nums.push(p)
    else if (nums[nums.length - 1] !== '…') nums.push('…')
  }

  return (
    <div className="pager">
      <span className="pager-info">
        {from}–{to} von {total}
        {unit ? ` ${unit}` : ''}
      </span>
      <div className="pager-btns">
        <button
          type="button"
          className="pager-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          title="Zurück"
        >
          <MockIcon n="chevron-left" size={16} />
        </button>
        {nums.map((n, i) =>
          n === '…' ? (
            <span key={`e-${i}`} className="pager-ell">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              className={cn('pager-btn', n === page && 'active')}
              onClick={() => onPageChange(n)}
            >
              {n}
            </button>
          )
        )}
        <button
          type="button"
          className="pager-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          title="Weiter"
        >
          <MockIcon n="chevron-right" size={16} />
        </button>
      </div>
    </div>
  )
}

export function MockSortHead({
  col,
  sortCol,
  sortDir,
  onSort,
  right,
  children,
}: {
  col: string
  sortCol: string | null
  sortDir: 1 | -1
  onSort: (col: string) => void
  right?: boolean
  children: ReactNode
}) {
  return (
    <div
      role="columnheader"
      onClick={() => onSort(col)}
      style={{
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        justifyContent: right ? 'flex-end' : 'flex-start',
        userSelect: 'none',
      }}
    >
      {children}
      <MockIcon
        n={sortCol === col ? (sortDir === 1 ? 'arrow-up' : 'arrow-down') : 'arrows-sort'}
        size={12}
        style={{ opacity: sortCol === col ? 1 : 0.35 }}
      />
    </div>
  )
}
