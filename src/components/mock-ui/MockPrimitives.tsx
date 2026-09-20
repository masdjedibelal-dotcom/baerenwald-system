'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

export function MockChip({
  active,
  count,
  onClick,
  children,
  icon,
  title,
}: {
  active?: boolean
  count?: number
  onClick?: () => void
  children: ReactNode
  icon?: string
  /** Native Tooltip — z. B. Fachbegriff */
  title?: string
}) {
  return (
    <button
      type="button"
      className={cn('chip', active && 'active')}
      onClick={onClick}
      title={title}
    >
      {icon ? <MockIcon ctx="btn" n={icon} size={14} /> : null}
      {children}
      {count != null ? <span className="chip-count">{count}</span> : null}
    </button>
  )
}

export type MockBtnKind = 'primary' | 'secondary' | 'ghost' | 'danger' | ''
export type MockBtnSize = 'sm' | 'md' | 'lg'

export type MockBtnProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  children?: ReactNode
  /** Mock-API; leer/undefined → nur `.btn` (kein forced primary) */
  kind?: MockBtnKind
  /** Legacy `ui/Button` — mappt auf kind */
  variant?: Exclude<MockBtnKind, ''>
  sm?: boolean
  size?: MockBtnSize
  loading?: boolean
  fullWidth?: boolean
  icon?: string
}

export const MockBtn = forwardRef<HTMLButtonElement, MockBtnProps>(function MockBtn(
  {
    kind,
    variant,
    sm,
    size,
    loading = false,
    disabled = false,
    fullWidth = false,
    icon,
    onClick,
    children,
    title,
    'aria-label': ariaLabel,
    type = 'button',
    className,
    ...props
  },
  ref
) {
  // kind gewinnt; variant nur Legacy-Alias; weder noch → bare `.btn`
  const resolvedKind = kind !== undefined && kind !== null ? kind : variant
  const isSm = sm === true || size === 'sm'

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      {...props}
      className={cn(
        'btn',
        resolvedKind || '',
        isSm && 'sm',
        icon && !children && 'icon',
        fullWidth && 'w-full',
        className
      )}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel ?? (icon && !children ? title : undefined)}
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="30"
            strokeDashoffset="10"
          />
        </svg>
      ) : null}
      {icon ? <MockIcon ctx="btn" n={icon} size={isSm ? 14 : 15} /> : null}
      {children}
    </button>
  )
})

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
          <MockIcon ctx="btn" n="chevron-left" size={16} />
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
          <MockIcon ctx="btn" n="chevron-right" size={16} />
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
  resizable,
  onResizePointerDown,
}: {
  col: string
  sortCol: string | null
  sortDir: 1 | -1
  onSort: (col: string) => void
  right?: boolean
  children: ReactNode
  /** Desktop: Spaltenbreite per Ziehen anpassen */
  resizable?: boolean
  onResizePointerDown?: (e: PointerEvent) => void
}) {
  return (
    <div
      role="columnheader"
      className="col-head"
      onClick={() => onSort(col)}
      style={{
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        justifyContent: right ? 'flex-end' : 'flex-start',
        userSelect: 'none',
        position: 'relative',
        minWidth: 0,
      }}
    >
      <span className="col-head__label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {children}
      </span>
      <MockIcon ctx="default"
        n={sortCol === col ? (sortDir === 1 ? 'arrow-up' : 'arrow-down') : 'arrows-exchange'}
        size={12}
        style={{ opacity: sortCol === col ? 1 : 0.35, flexShrink: 0 }}
      />
      {resizable ? (
        <span
          className="col-resize-handle"
          role="separator"
          aria-orientation="vertical"
          aria-label="Spaltenbreite anpassen"
          title="Breite ziehen"
          onPointerDown={(e) => {
            e.stopPropagation()
            onResizePointerDown?.(e)
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : null}
    </div>
  )
}
